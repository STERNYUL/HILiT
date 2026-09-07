---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[DB] CT-003: RLS 정책 — 20 테이블 전량 · 공개범위 3단 · 그룹 멤버십 · 학습 자산 차단"
labels: 'database, security, contract, priority:critical, step-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[CT-003] 공개 범위를 DB 계층에서 강제**
- 목적: **REQ-NF-009(*"조작된 요청의 우회 성공 0건"*)를 애플리케이션이 아니라 PostgreSQL 정책으로 보장한다.**

> 🔴 **Server Action 계층의 필터링만으로는 이 요구사항을 만족하지 못한다.** 조회 경로가 하나 추가될 때마다 누락 위험이 생기기 때문이다. **RLS는 개발자가 실수할 여지를 구조적으로 없앤다** — 이것이 이 스택의 가장 큰 이점이다(v2.2 §4.2).
>
> 🟢 **그리고 SC-4.4(*"비공개·그룹은 개수에도 미포함"*)가 자동으로 해결된다.** 정책 미통과 행은 결과 집합에 아예 없으므로 `count(*)` 도 걸러낸 뒤의 수만 센다.
>
> 🔴 **v2 개정 (2026-09-07 · ADR-9 · T16)** — 종전 명세는 `records` · `visibility_settings` · `reactions` · `share_links` **4개 테이블만** 다뤘다. 나머지 **16개는 무방비였다.** Supabase는 `public` 스키마를 PostgREST로 그대로 노출하므로 **RLS를 켜지 않은 테이블은 로그인한 아무나 전량 조회할 수 있다** — 🔴 **`source_videos.storage_uri` 가 그렇게 새면 원본 영상 자체가 새는 것**이다(DS: *"영상 자체가 개인정보"*). 이 개정은 **20 테이블 전량**으로 범위를 넓히고, ADR-9 신규 4엔티티의 정책을 확정한다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **RLS 설계·정책 예시**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §4.2 — 🔴 **정책 SQL 초안이 여기 있다**
- **요구사항**: `SRS/[SRS]hilit-SRSv1.8.md` REQ-NF-009
- **검증 시나리오**: `SRS/[SRS]hilit-SRSv1.8.md` §5.2 — **SC-4.4 · SC-4.F1 · SC-5.2 · SC-5.5**
- **시퀀스**: `SRS/[SRS]hilit-SRSv1.8.md` §6.4.4 (공개 범위 서버 측 강제 — 상세)
- **상태 전이**: `SRS/[SRS]hilit-SRSv1.8.md` §7.1
- 비즈니스 규칙 4·8: `SRS/[SRS]hilit-SRSv1.8.md` §6.3

## ✅ Task Breakdown (실행 계획)
### 🔴 대상 분류 — 20 테이블 전량

| 분류 | 테이블 | 정책 |
| --- | --- | --- |
| **공개 범위 3단** | `records` · `visibility_settings` · `reactions` · `share_links` | 소유자 / 전체공개 / 그룹 멤버 |
| 🆕 **소유자 전용 — 영상 파이프라인** | `source_videos` · `person_tracks` · `appearance_intervals` · `candidates` · `selections` · `generated_videos` · `processing_jobs` · `manual_cuts` · `manual_cut_edits` · `watch_sessions` | 🔴 **소유자만.** 공개 범위와 무관하다 — 편집 중간 산출물은 누구에게도 공개되지 않는다 |
| **관계** | `groups` · `group_members` · `follow_relations` | 소속·당사자만 |
| **공개 카탈로그** | `music_tracks` | 읽기 전체 허용 · 쓰기 금지 |
| **계정** | `users` | 본인 전체 · 타인은 공개 프로필 필드만 |
| 🔴 **클라이언트 차단** | `training_labels` | 🔴 **RLS 활성 + 정책 0건** — 아래 근거 |

- [ ] 🔴 **20 테이블 전부에 `enable row level security`** — 하나라도 빠지면 그 테이블은 전량 노출이다
- [ ] 종전 4종(`records` · `visibility_settings` · `reactions` · `share_links`) 정책
- [ ] 🆕 **ADR-9 4엔티티** — `manual_cuts` · `manual_cut_edits` · `watch_sessions` 는 **소유자 전용**, `training_labels` 는 🔴 **정책 0건 + `revoke`**
- [ ] **읽기 정책** — 소유자 / 전체공개 / 그룹 멤버 3분기
- [ ] **쓰기 정책** — 소유자만 변경 가능
- [ ] `group_members` 정책 — **`left_at IS NULL` 인 멤버만** 유효 *(이탈자 즉시 회수)*
- [ ] `reactions` 정책 — **부모 기록이 보이지 않으면 반응도 보이지 않는다**
- [ ] `share_links` 정책 — 만료·회수 반영
- [ ] Supabase Auth 세션 → `auth.uid()` 연결 확인
- [ ] 🔴 **서비스 롤 사용처 목록화** — RLS를 우회하는 경로가 어디인지 문서화하고 **최소화**
- [ ] 정책 단위 테스트 — 조회자 4유형별

### 정책 초안 *(v2.2 §4.2)*

```sql
alter table records enable row level security;

create policy record_read on records for select using (
  owner_id = auth.uid()
  or exists (
    select 1 from visibility_settings v
    where v.record_id = records.id
      and (
        v.scope = 'public'
        or (v.scope = 'group' and exists (
              select 1 from group_members m
              where m.user_id = auth.uid()
                and m.left_at is null          -- 🔴 이탈자 제외
                and m.group_id = any(v.group_ids)))
      )
  )
);
```

### 🆕 신규 4엔티티 정책 *(ADR-9)*

```sql
-- ── 소유는 source_videos.owner_id 하나로만 판정한다 ──
-- 🔴 팔로우·그룹 조건을 넣지 않는다(비즈니스 규칙 8). 편집 자산은 소유자 전용이다.

alter table manual_cuts       enable row level security;
alter table manual_cut_edits  enable row level security;
alter table watch_sessions    enable row level security;

create policy manual_cut_owner on manual_cuts for all using (
  exists (select 1 from source_videos v
           where v.id = manual_cuts.video_id and v.owner_id = auth.uid())
);

create policy watch_session_owner on watch_sessions for all using (
  exists (select 1 from source_videos v
           where v.id = watch_sessions.video_id and v.owner_id = auth.uid())
);

-- 2단 조인 — manual_cut_edits → manual_cuts → source_videos
create policy manual_cut_edit_owner on manual_cut_edits for all using (
  exists (select 1 from manual_cuts c join source_videos v on v.id = c.video_id
           where c.id = manual_cut_edits.cut_id and v.owner_id = auth.uid())
);

-- ── 🔴 학습 라벨: 읽을 주체가 없다 ──
-- 정책을 하나도 만들지 않으면 RLS가 전부 거부한다. service_role 만 우회한다.
alter table training_labels enable row level security;
revoke all on training_labels from anon, authenticated;
-- 🔴 정책을 추가하지 않는다. 이것이 의도된 최종 상태다.
```

> 🔴 **`training_labels` 에 소유 기반 정책을 붙일 수 없는 이유** — `video_id` 는 `ON DELETE SET NULL` 이라(DD-10) **원본이 파기되면 NULL이 된다.** 그 순간 *"이 라벨이 누구 것인가"* 를 판정할 경로가 사라져, 소유 기반 정책은 **열 수도 막을 수도 없는 상태**가 된다. 🟢 **애초에 사용자가 읽을 이유가 없으므로 노출 자체를 닫는 것이 유일하게 안전한 답**이다.

> 🔺 **`revoke` 를 함께 하는 이유** — RLS는 행을 거르지만 **테이블의 존재와 컬럼 구조는 PostgREST 스키마에 남는다.** 권한까지 회수해야 엔드포인트가 만들어지지 않는다.

## 🧪 Acceptance Criteria (BDD/GWT)

> **Query는 "누가 조회하는가"가 축이다.** 조회자 4유형이 전부 다른 결과를 받아야 한다.

**Scenario 1: 소유자는 전부 본다** *(SC-4.4)*
- **Given**: 전체공개 9 · 그룹 6 · 비공개 19를 가진 사용자가 주어짐
- **When**: 본인이 자기 기록을 조회함
- **Then**: **34건 전부**가 반환된다

**Scenario 2: 타인에게는 개수조차 노출되지 않는다** *(SC-4.4)*
- **Given**: 위와 동일한 사용자의 프로필
- **When**: **비관계자**가 조회함
- **Then**: **전체공개 9건만** 반환되고, 🔴 **`count(*)` 도 9를 반환한다.** 비공개·그룹 기록의 존재를 유추할 정보가 없다

**Scenario 3: 그룹 멤버만 그룹 공개를 본다** *(SC-5.2)*
- **Given**: `scope='group'` 인 기록이 주어짐
- **When**: 그룹 밖 사용자가 **검색 · 피드 · 직접 URL 세 경로**로 접근함
- **Then**: **세 경로 모두** 결과가 비어 있다

**Scenario 4: 팔로우만으로는 그룹 기록이 열리지 않는다** *(SC-5.5)*
- **Given**: 소유자를 팔로우 중이나 그룹에는 속하지 않은 사용자
- **When**: 그룹 공개 기록에 접근함
- **Then**: 차단된다. **관계와 공개는 분리된다**(비즈니스 규칙 8)

**Scenario 5: 그룹 이탈이 즉시 반영된다** *(SC-2.F2)*
- **Given**: `left_at` 이 설정된 전 멤버가 주어짐
- **When**: 그 그룹의 기록을 조회함
- **Then**: 결과가 비어 있다. **정책이 `left_at IS NULL` 을 요구한다**

**Scenario 6 (실패): 조작된 요청이 우회하지 못한다** *(SC-4.F1)*
- **Given**: 클라이언트가 타인의 비공개 기록 ID를 직접 지정함
- **When**: 조회를 시도함
- **Then**: **빈 결과**가 반환되고 애플리케이션은 `404` 로 응답한다. 🔴 **우회 성공 0건**

**Scenario 7 (실패): 학습 라벨은 클라이언트에서 읽히지 않는다** *(🔴 ADR-9)*
- **Given**: `training_labels` 에 행이 존재하고, 그 라벨의 **원본 소유자 본인**이 로그인함
- **When**: `authenticated` 롤로 `select * from training_labels` 를 시도함
- **Then**: 🔴 **소유자에게도 빈 결과다.** 정책이 0건이므로 RLS가 전부 거부한다. `service_role` 경로(승격 배치·학습 파이프라인)만 읽는다

**Scenario 8 (실패): 남의 영상의 편집 자산이 보이지 않는다**
- **Given**: 사용자 A의 `source_videos` 에 달린 `manual_cuts` · `watch_sessions` · `selections`
- **When**: 사용자 B가 — **A를 팔로우 중이고 같은 그룹에도 속한 상태로** — 조회함
- **Then**: 🔴 **전부 빈 결과다.** 편집 중간 산출물에는 공개 범위 개념이 없다. 🔴 **팔로우·그룹 조건이 정책에 들어가 있지 않아야 통과한다**(비즈니스 규칙 8)

**Scenario 9 (실패): 원본이 지워진 라벨도 여전히 닫혀 있다** *(DD-10)*
- **Given**: `source_videos` 를 삭제해 `training_labels.video_id IS NULL` 이 된 행
- **When**: 임의의 `authenticated` 사용자가 조회함
- **Then**: 빈 결과다. 🔺 **소유 판정이 불가능한 행이 남는다는 것 자체가** 소유 기반 정책을 배제하고 전면 차단을 택한 근거다

**Scenario 10 (실패): RLS가 빠진 테이블이 하나도 없다**
- **Given**: 마이그레이션이 적용된 DB
- **When**: 아래를 실행함
  ```sql
  select tablename from pg_tables
   where schemaname = 'public' and rowsecurity = false;
  ```
- **Then**: 🔴 **0행이 반환된다.** 🔺 종전 명세는 4개 테이블만 다뤄 **16개가 이 검사를 통과하지 못했다**

## ⚙️ Technical & Non-Functional Constraints
- **모든 조회가 정책을 통과한다** — RLS를 우회하는 서비스 롤 경로는 **webhook 수신·배치**로 한정하고 목록화
- 🆕 **서비스 롤 경로 2건 추가**(ADR-9) — ① **승격 배치**(렌더 완료 시 `TrainingLabel` 4종 생성) ② **Cron 정리 배치**(`watch_sessions` 90일 파기 · 미동의 원본 파기). 🔴 **둘 다 사용자 요청 경로가 아니어야 한다**
- 🆕 **정책 조건의 인덱스** — `source_videos(id)` PK · `manual_cuts(video_id)` · `manual_cut_edits(cut_id)`(복합 PK 선두). 🔺 `manual_cut_edits` 는 **2단 조인**이라 `EXPLAIN` 확인이 특히 필요하다
- 🔺 **RLS는 접근 거부를 로그로 남기지 않는다**(v2.2 §9-2) — 감사 로그는 **NF-009**가 별도로 구현한다
- 정책 조건은 **인덱스를 탈 수 있게** 작성 — `group_members(user_id)` · `visibility_settings(record_id)`
- REQ-NF-005(조회 p95 ≤ 400ms)를 정책 적용 후에도 만족해야 한다

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **조회자 4유형(소유자 / 그룹 멤버 / 팔로워 / 비관계자) 전부에 테스트가 있는가?**
- [ ] 🔴 **서비스 롤 우회 경로가 목록화되고 최소화되었는가?**
- [ ] 🔴 **20 테이블 전부에 RLS가 켜져 있는가?** *(Scenario 10)*
- [ ] 🔴 **`training_labels` 에 정책이 0건이고 `anon`·`authenticated` 권한이 회수되었는가?** *(Scenario 7)*
- [ ] 🔴 **어느 정책에도 팔로우 조건이 들어가지 않았는가?** *(비즈니스 규칙 8 · Scenario 8)*
- [ ] RLS 적용 후 조회 p95가 REQ-NF-005를 만족하는가?
- [ ] `EXPLAIN` 으로 정책 조건이 인덱스를 타는지 확인했는가?
- [ ] 🔺 `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §4.2와 실제 정책이 일치하는가?

## 🚧 Dependencies & Blockers
- **Depends on**: **CT-001 v3**(스키마 20 엔티티 · 제약 18건 · 트리거 2건)
- **Blocks**: **FR-019**(기록 저장) · **FR-020**(공개범위) · **FR-027**(좋아요) · **FR-028**(공유) · **FR-032·033·035**(Query 전량) · **NF-007**(우회 테스트) · TS-004 · TS-002 · TS-007
- 🔺 **관련**: NF-009(감사 로그)는 RLS가 못 하는 부분을 메운다 — 함께 설계할 것
