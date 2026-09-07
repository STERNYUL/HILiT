# 검토 — 수동 구간 선택 로깅 스키마

**대상** 제안된 PostgreSQL 스키마 6테이블 — `video` · `video_review` · `clip_selection` · `selection_edit` · `clip_outcome` · `pose_sequence`
**검토 기준** `SRS/[SRS]hilit-SRSv1.8.md`(검토 시점 v1.9) · `DS/[DS]hilit-DSv1.1.md` · `tasks/CT-001` · `tasks/CT-003` · `CLAUDE.md`
**검토일** 2026-09-07
**처리** 🟢 **전건 반영 완료** — `T16` 결정 → SRS **ADR-9** → DS §4.2 → CT-001 v3 → CT-003 v2

> ⚠️ **검토 시점에 리포지토리의 `.prisma`·`.sql` 파일이 0건이었다.** 이 스키마는 기존 코드와 충돌한 것이 아니라 **`CT-001`과 경쟁하는 두 번째 설계안**이었다. 따라서 판정은 *"틀렸다"* 가 아니라 *"어느 쪽을 정본으로 삼는가"* 였다.

---

## 0. 결론 먼저

**제안의 진단은 정확했고 해법이 규칙을 깼다.** 여섯 테이블 중 넷은 살아남았고, 하나는 삭제됐으며, 하나는 통째로 불필요했다.

| # | 항목 | 성격 | 처리 |
| :--: | --- | --- | --- |
| **A2** | 🔴 `pose_sequence` — DD-5 뒤집음 · 무료 GPU 초 발생 | **규칙 위반** | 🚫 **삭제**(ADR-9 ③) |
| **A5** | 🔴 무료 라벨 회수 — ADR 없는 제품 결정 | **결정 누락** | ✅ **ADR-9 신설** |
| **A1** | 엔티티 절반이 DS에 이미 있음 · ms/초 표기 충돌 | **정본 충돌** | 🔄 **흡수** |
| **A4** | RLS 부재 | **보안** | ✅ **CT-003 v2** |
| **A3** | 소프트 삭제가 DS §4.1과 충돌 | 규칙 | ✅ 축 분리 |
| **B1~B6** | SQL 결함 6건 | 구현 | ✅ 5건 수정 · 1건 트리거로 이관 |

🔴 **가장 무거운 것이 제안자가 가장 공들인 부분이었다.** `pose_sequence`는 *"영상 없이도 학습 가능한 형태"* 라는 정확한 문제 인식의 산물인데, 그 해법이 두 결정을 동시에 깬다.

---

## 1. 🔴 제품 규칙 충돌 5건

### 1.1 엔티티 절반이 DS에 이미 있다 — 정본이 두 벌이 된다

| 제안 | DS §4.2 기확정 | 충돌 |
| --- | --- | --- |
| `video` | **`SourceVideo`** | `user_id` vs `owner_id` · `NUMERIC(10,3)` vs `INTEGER CHECK(≤5400)` |
| `clip_selection` | **`Selection`** | `Selection`엔 `user_id`·`is_reselection`이 있고 제안에는 없다 |
| `video.exercise_tag` | **`Record.sport`** | 같은 값의 저장 위치가 둘 |

🔴 **시간 단위가 어긋난다.** DS 전역이 `start_tc_ms`·`anchor_frame_ms` — **ms 정수**인데 제안은 **초 `NUMERIC(10,3)`** 이다. 두 표기가 공존하면 변환 지점마다 반올림 결함이 난다. `CT-001`이 *"`SourceVideo`인지 `source_videos`인지 여기서 확정한다"* 고 선언한 태스크이므로 **상위 문서가 이긴다.**

### 1.2 🔴 `pose_sequence`가 DD-5를 정면으로 뒤집는다 — 가장 큰 건

DS `DD-5`는 **얼굴 특징 벡터 미저장**이며 근거가 이렇다:

> 좌표만 남기면 원본 삭제 시 **재식별 가능성이 사라진다** → REQ-NF-010의 적용 범위를 좁힌다

`pose_sequence`는 그 *"좌표"* 를 **bbox 4개 → 17관절 × 전 프레임**으로 넓히고, 주석이 목적을 명시한다 — *"영상 없이도 학습 가능 → 원본 보관 기간을 짧게"*. 즉 **원본보다 오래 사는 인체 시퀀스**다. 보행·자세 패턴은 개인 식별력이 있어 NF-010의 범위가 **좁아지는 것이 아니라 넓어진다.**

넷이 동시에 걸린다.

| 걸리는 것 | 내용 |
| --- | --- |
| **DS DD-5** | 위 근거를 무효화한다 |
| **REQ-NF-017** | 아마추어 농구 코트의 미성년자 관절 시퀀스가 동의 없이 무기한 남는다 |
| **RISK-07 · NF-010** | 산출물 4종 미승인 상태에서 붙이면 **CI가 프로덕션 배포를 차단**한다 |
| 🔴 **ADR-8 검증 ④** | *"무료 등급 편당 GPU 초 = 0 · 외부 추론 호출 0건"* — pose 추출은 **추론**이다 |

**용량도 성립하지 않는다.** 등급 상한 20분 · 10fps · 17관절 × 3값 = **61.2만 개 값/영상**. JSONB는 숫자를 `numeric`으로 저장해 TOAST 압축 후에도 행당 수 MB급이고, DS 상한 90분이면 4.5배다. Supabase Postgres가 오브젝트 스토어가 된다.

### 1.3 소프트 삭제가 DS §4.1과 충돌한다

> §4.1 — 논리 삭제는 **사업 자원만** `deleted_at`. **개인정보·영상은 물리 삭제** (근거 REQ-NF-019)

`clip_selection.deleted_at`이 **"사용자가 이 컷을 뺐다"** 와 **"정보주체가 삭제를 요청했다"** 를 한 컬럼으로 겸한다. 두 축이 섞이면 `FR-024`(정보주체 삭제 이행)를 만족시킬 수 없다.

### 1.4 RLS가 없고, RLS를 걸 자리도 없다

Supabase는 `public` 스키마를 PostgREST로 그대로 노출한다. `video.user_id`에 `REFERENCES auth.users(id)`도 정책도 없다.

### 1.5 🔴 무료 등급 라벨 회수는 ADR이 필요한 제품 결정이다

SRS ADR-8 v1.9 「감수하는 것 4」:

> 🔴 **선택 데이터(REQ-FUNC-023의 학습 입력)는 유료 등급에서만 생긴다** — 이 개정이 감수하는 가장 큰 손실

이 스키마는 **무료 등급의 수동 컷(F25)을 제3의 라벨 원천으로 신설**한다. SRS가 계산에 넣지 않았던 경로라 **모순은 아니고, 오히려 감수한 손실을 되돌리는 좋은 수**다. 다만 ADR-8의 손익 계산을 바꾸고 학습 이용 동의(NF-010)를 새로 요구하므로 **스키마로 조용히 들어가면 안 된다.**

---

## 2. 🔺 SQL 결함 6건

| # | 결함 | 처리 |
| :--: | --- | --- |
| **B1** | `uq_clip_order UNIQUE(video_id, selection_order)` + 소프트 삭제 → **삽입 실패.** 2번을 지우고(행 잔존) 새로 고르면 유니크 위반 | ✅ 부분 유니크 `WHERE removed_at IS NULL` · **CT-001 Scenario 10** |
| **B2** | `watched_ranges numrange[]` — 주석의 *"구간 연산(`&&`,`@>`)을 DB에서 처리"* 가 **성립하지 않는다.** 배열의 `&&`는 *공통 원소 존재*지 구간 겹침이 아니라, `watched_ranges @> numrange(5,10)`은 **완전히 같은 range 값이 원소일 때만** 참이다. 배열엔 GiST 구간 인덱스도 못 건다 | ✅ **`int4multirange`** — 헤더에 `PostgreSQL 14+`라 쓰고 정작 multirange를 안 썼다. `segments - range_agg(...)` 한 줄로 끝난다 · **Scenario 13** |
| **B3** | `ON DELETE CASCADE`가 **스키마의 존재 목적을 파괴한다.** *"재생성 불가능한 사람의 판단만 저장"* 인데 `video` 행이 지워지면 라벨 4테이블이 전부 죽는다 | ✅ `TrainingLabel`만 `SET NULL`(DD-6 패턴) · **Scenario 14** |
| **B4** | **삭제가 세 곳에 기록된다** — `deleted_at` · `edit_type='delete'` · `action='discarded'` | ✅ `removed_at` 단일화 · `clip_outcome` 삭제 · `REMOVE` 제거 |
| **B5** | `edit_type='initial'` 미정의 — `clip_selection.start_sec`이 **현재값인지 최초값인지** 스키마가 말하지 않는다 | ✅ 불변식 명문화 — `seq=1`은 항상 `INITIAL`, 엔티티는 현재값 |
| **B6** | 교차 무결성 — `end_sec ≤ duration`은 CHECK로 타 테이블 참조 불가 | 🟡 `orientation`↔해상도 CHECK 추가 · **나머지는 트리거**(`assert_tc_within_source`) |

**관례 불일치** — DS §4.1은 PK `uuid`/`gen_random_uuid()`인데 `BIGSERIAL`이 2곳, `TEXT`는 CHECK 길이 제약 필수인데 `exercise_tag`에 없다. 인덱스는 `idx_video_camera`(카디널리티 3, 단독 무의미)와 `idx_clip_video`/`idx_clip_active` 중복이 걷어낼 대상이고, 정작 **negative 추출을 받쳐줄 인덱스가 없었다**(B2).

---

## 3. 🟢 살릴 것

- **`video_review`의 발상이 이 제안에서 가장 좋다.** *"안 본 구간"* 과 *"보고도 안 고른 구간"* 을 구분하지 않으면 negative 라벨이 오염된다 — 이 인식이 정확하다. **자료구조만 틀렸다**(B2)
- **`selection_edit`** — 5.0~12.0 → 5.8~11.2의 차이가 경계 라벨이 된다는 것, 타당하다
- **`clip_outcome`의 라벨 가중치 분리** — 선택=약신호, 공유·다운로드=강신호. 논리는 맞다
- 🟢 **`model_name`·`model_version`·`keypoint_schema` 재현성 3종은 DS에도 없던 좋은 추가다.** pose를 안 쓰더라도 `SP-1`로 추론 API를 교체할 때 *"이 결과가 어느 모델에서 나왔나"* 를 남길 자리가 필요하다

---

## 4. 처리 결과

### 4.1 테이블별 귀결

| 제안 | 결과 | 근거 |
| --- | --- | --- |
| `video` | 🔄 **`SourceVideo` 컬럼 6종으로 흡수** | 새 테이블이면 원본 정보가 두 벌. `exercise_tag`는 `Record.sport`로 조인 |
| `video_review` | 🔄 **`WatchSession`** | 발상 유지 · `numrange[]` → `int4multirange` · 90일 보존 |
| `clip_selection` | 🔄 **`ManualCut`** | 🔴 `Selection`은 `candidate_id`를 요구하는데 무료 등급엔 후보가 없다 |
| `selection_edit` | 🔄 **`ManualCutEdit`** | `REMOVE` 제거 |
| `clip_outcome` | 🚫 **삭제** | `saved`=Record 생성 · `shared`=VisibilitySetting · `discarded`=`removed_at` · `downloaded`=요구사항 없음(ADR-5 보류). **전부 기존 엔티티에서 유도된다** |
| `pose_sequence` | 🚫 **삭제** | ADR-9 ③ |
| — | 🆕 **`TrainingLabel`** | 원시 입력(90일)과 라벨(무기한)의 **수명 경계를 물리적으로 만드는** 엔티티 |

### 4.2 ADR-9 — 회수 3단 제한

| # | 대상 | 범위 |
| :--: | --- | --- |
| **①** | 🟢 라벨(구간 · 편집 이력) | **무기한** · 추론 0건 · GPU 초 0 |
| **②** | 🟡 학습용 원본 | 🔴 **동의자 한정 opt-in** — 미동의는 렌더 직후 파기 |
| **③** | 🔴 관절·생체 파생 시퀀스 | **저장하지 않는다** |

부수 결정 둘 — **negative 수명 분리**(원시 로그 90일 → 파생 라벨만 무기한 승격) · 🔴 **개인별 되먹임 금지**(전역 모델 학습만 · ADR-7 경계).

### 4.3 승격 규칙 4종

라벨 보존을 **엔티티 존치가 아니라 승격**으로 이행한다(`DD-10`).

| `polarity` | `source` | 학습 용도 |
| --- | --- | --- |
| POSITIVE | `MANUAL_CUT` | 🔴 **탐지** — AI가 놓친 구간을 담는 유일한 입력 |
| POSITIVE | `SELECTION` | **순위** |
| NEGATIVE | `SELECTION` | **순위** — 제시됐으나 고르지 않은 후보 |
| NEGATIVE | `WATCH_DERIVED` | **탐지** |

🔴 **`NEGATIVE·SELECTION`은 `confidence_flag = NORMAL`인 후보만 승격한다** — REQ-FUNC-027로 제외된 후보는 **사용자가 본 적이 없어서** *"거절했다"* 로 라벨링하면 거짓 라벨이 된다. `video_review`가 풀려던 문제와 **같은 논리가 후보 쪽에도 적용된다.**

### 4.4 문서 반영

| 문서 | 변경 |
| --- | --- |
| `SRS` | v1.10 판이력 · **ADR-9 신설** · ADR-8 「감수 4」 개정 · §5.3 TC-ADR-09 · §6.2.2 4행 · §6.8 Q24 |
| `DS` | 신규 엔티티 4건 · `SourceVideo` 컬럼 6종 · §4.4 보존 3행 · **DD-8 정정 · DD-9 · DD-10** |
| `CT-001` | **v3** — 엔티티 16→20 · 열거형 10→15 · 제약 11→18 · 트리거 2건 · AC 9→15 |
| `CT-003` | **v2** — 4→**20 테이블** · 신규 4엔티티 정책 · AC 6→10 |
| `CLAUDE.md` | 절대규칙 6 — 「감수한 손실」 개정 + 3단 제한 + 되먹임 금지 |
| `GRILL_LEDGER` | **T16 RESOLVED** · T13 `SUPERSEDED` 정정 |

---

## 5. 이 검토가 틀렸던 것 · 곁가지로 찾은 것

**자기 정정 1건**

- 🔺 **`clip_selection`에 `user_id`가 없다는 지적은 철회한다.** `AppearanceInterval`·`Candidate`도 동일하게 `SourceVideo`를 거치는 것이 DS의 기존 패턴이다. RLS는 `SourceVideo.owner_id` 조인으로 일괄 처리하는 편이 일관되며, 신규 엔티티도 그 패턴을 따랐다.

**곁가지로 드러난 기존 결함 3건**

| # | 발견 | 처리 |
| :--: | --- | --- |
| **1** | 🔴 `GRILL_LEDGER`의 **T13 결정문이 v1.8 시절 것**이었다 — *"기능 전부 개방"* · *"Gate A·B는 무료 등급으로 판정"* · *"금지 5건"* 셋 다 SRS v1.9가 뒤집었다 | ✅ `SUPERSEDED` 표기 |
| **2** | 🔴 **`DD-8`이 이행 수단 없는 선언이었다.** *"선택 이력을 원본 삭제 후에도 유지"* 인데 `Selection → Candidate → AppearanceInterval → SourceVideo` 가 전부 `CASCADE`다. `SET NULL`로 바꿔도 소용없다 — `Selection`엔 **구간 시각이 없어** 살아남아도 *"누군가 언젠가 뭔가를 골랐다"* 만 남는다 | ✅ **승격 패턴(DD-10)으로 이행** |
| **3** | 🔴 **`CT-003`이 20 테이블 중 4개만 다루고 있었다.** 나머지 16개는 RLS 미적용이며, 그중 `source_videos`에는 **`storage_uri`(원본 영상 주소)** 가 있다 — DS가 *"영상 자체가 개인정보"* 라 못박은 테이블이다 | ✅ **20 테이블 전량으로 확장** · Scenario 10이 누락을 검사 |

🔴 **3번이 이 검토에서 가장 값진 산출이다.** 제안된 스키마와 무관한 기존 구멍이었고, 신규 4엔티티만 막았다면 앞문을 잠그고 뒷문을 여는 결과가 됐을 것이다.

---

## 6. 남은 것

| # | 항목 | 막는 것 |
| :--: | --- | --- |
| **1** | 🔴 ADR-9 ②(학습용 원본) 배포 | **`FACE_CONSENT`** — REQ-NF-010 산출물 4종 법무 승인 |
| **2** | 🔺 **Q24** 학습용 원본 보관 동의율 | **Baseline: 미측정 · Target: TBD** — 동의율이 낮으면 ①이 남아도 학습이 시작되지 않는다 |
| **3** | 🔺 `WatchSession.segments` 접근 | Prisma가 multirange를 네이티브 지원하지 않아 `Unsupported(...)` + raw 쿼리 |
