---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[DB] CT-001: Prisma 스키마 16 엔티티 · 열거형 10종 · SQL 제약 11건 · 인덱스"
labels: 'database, contract, priority:critical, step-1, wave-1'
assignees: ''
---

> 🔀 **CT-002를 흡수했다** *(축약 2026-08-30)* — 같은 마이그레이션 파일을 만진다. `CT-002` 는 폐번이며 이 문서를 가리킨다.
>
> 🔧 **v2 개정 (2026-08-30)** — 실행 명세로 구체화. **열거형이 4종이 아니라 10종임을 정정**(§열거형 참조).

## 🎯 Summary
- 기능명: **[CT-001] 데이터베이스 스키마 · 제약 · 인덱스 확정**
- 목적: **나머지 42개 태스크가 참조할 엔티티 이름·타입·불변식을 코드로 확정한다.**

> 🔴 **이 태스크가 Wave 1의 첫 번째인 이유** — `SourceVideo`인지 `source_videos`인지, `visibility`인지 `privacy`인지가 여기서 확정된다. 이것 없이 다른 태스크를 쓰면 나중에 전부 고쳐야 한다.
>
> 🔴 **그리고 제약은 장식이 아니다.** `member_count <= 20` 하나가 없으면 **동시 초대에서 정원이 넘고**(SC-5.F1), `scope DEFAULT private` 이 없으면 **삽입 경로가 늘 때마다 ADR-4가 깨진다.** 애플리케이션 코드로는 보장되지 않는다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.

| 문서 | 절 | 내용 |
| --- | --- | --- |
| `SRS/[SRS]hilit-SRSv1.8.md` | **§6.2** | ERD — 16 엔티티 관계 |
| `SRS/[SRS]hilit-SRSv1.8.md` | **§6.2.1** | 🔴 **요구사항이 정한 제약 5건 — 바꾸려면 요구사항을 먼저 바꿔야 한다** |
| `SRS/[SRS]hilit-SRSv1.8.md` | §6.2.3 | 보존 정책 |
| `SRS/[SRS]hilit-SRSv1.8.md` | §6.3 | 비즈니스 규칙 10건 |
| `DS/[DS]hilit-DSv1.1.md` | **§4.2** | 🔴 **엔티티별 컬럼·타입·인덱스·보존 — 이 태스크의 주 입력** |
| `DS/[DS]hilit-DSv1.1.md` | §4.3 | PRD ↔ SRS ↔ DS 명칭 매핑 |
| `SRS/[SRS]hilit-SRSv2.0-nextjs.md` | §4.1 | Prisma 사상 · 표현 불가 항목표 |
| `SRS/[SRS]hilit-SRSv2.0-nextjs.md` | §4.2 | RLS 전제 *(정책 자체는 CT-003)* |

## ✅ Task Breakdown (실행 계획)

### 1. 환경 준비
- [ ] `npx supabase init` · `npx supabase start` — 로컬 스택 기동
- [ ] `npx prisma init --datasource-provider postgresql`
- [ ] `.env` 에 `DATABASE_URL`(마이그레이션용 직결) · `DIRECT_URL` 설정
- [ ] `npx prisma db execute --stdin <<< "SELECT 1"` 로 연결 확인

### 2. 열거형 10종 정의 — `prisma/schema.prisma`
- [ ] `UserRole` · `SourceVideoStatus` · `ExcludedReason` · `ConfidenceFlag` · `VisibilityScope` · `MusicCategory` · `ReactionType` · `ProcessingStage` · `JobStatus` · `FailureClass`

### 3. 모델 16개 정의 — `prisma/schema.prisma`
- [ ] `User` · `SourceVideo` · `PersonTrack` · `AppearanceInterval` · `Candidate` · `Selection`
- [ ] `GeneratedVideo` · `Record` · `VisibilitySetting`
- [ ] `Group` · `GroupMember` · `FollowRelation`
- [ ] `MusicTrack` · `Reaction` · `ShareLink` · `ProcessingJob`
- [ ] 🔴 **`GeneratedVideo.sourceVideoId` 만 `onDelete: SetNull`** — 나머지 FK는 `Cascade`

### 4. 인덱스 — DS §4.2 전량
- [ ] `User`: `@@unique([handle])` · `@@index([deletedAt])`
- [ ] `SourceVideo`: `@@index([ownerId, createdAt(sort: Desc)])`
- [ ] `PersonTrack`: `@@unique([videoId])` *(영상당 1회 지정 — REQ-FUNC-002)*
- [ ] `AppearanceInterval`: `@@index([videoId, startTcMs])` · `@@index([videoId, excludedReason])`
- [ ] `Candidate`: `@@index([intervalId])` · `@@unique([intervalId, rank])`
- [ ] `Selection`: `@@index([userId, selectedAt])` · `@@unique([candidateId, userId])`
- [ ] `Record`: `@@index([ownerId, createdAt(sort: Desc)])`
- [ ] `GroupMember`: `@@id([groupId, userId])` · `@@index([userId])`
- [ ] `FollowRelation`: `@@id([followerId, followeeId])` · `@@index([followeeId])`
- [ ] `ShareLink`: `@@unique([token])` · `@@index([recordId, revokedAt])`
- [ ] `ProcessingJob`: `@@index([status, createdAt])` · `@@index([videoId])`

### 5. 초기 마이그레이션 생성
- [ ] `npx prisma migrate dev --name init --create-only` *(적용 전 SQL 편집을 위해 `--create-only`)*

### 6. 🔴 SQL 제약 11건을 마이그레이션에 직접 추가
- [ ] 생성된 `prisma/migrations/<ts>_init/migration.sql` 하단에 §제약 SQL 블록 append
- [ ] `visibility_settings.scope` 의 `DEFAULT 'private'` 이 DDL에 실제로 들어갔는지 확인
- [ ] `npx prisma migrate dev` 로 적용

### 7. 🔴 유실 방지 — 스키마 파일에 제약 병기
- [ ] `schema.prisma` 상단에 제약 11건을 **주석 블록**으로 병기
- [ ] `prisma/constraints.sql` 로 분리 보관하고 마이그레이션에서 참조 경로를 주석으로 남김

### 8. 시드 및 검증
- [ ] `prisma/seed.ts` — 개발용 최소 데이터 *(User 2 · Group 1 · MusicTrack 3)*
- [ ] `npx prisma migrate reset` 으로 클린 재현 확인
- [ ] 검증 스크립트 `scripts/verify-schema.ts` 작성 — §AC의 Scenario 1·3·7을 자동 검사

### 🔴 열거형 10종 — 기존 명세의 "4종"은 오류였다

| # | 열거형 | 값 | 근거 |
| :--: | --- | --- | --- |
| 1 | `UserRole` | `user` · `operator` | DS §4.2 User |
| 2 | `SourceVideoStatus` | `UPLOADING` · `UPLOADED` · `PROCESSING` · `READY` · `FAILED` | DS §4.2 SourceVideo |
| 3 | `ExcludedReason` | `LOW_CONFIDENCE` *(nullable)* | DS §4.2 AppearanceInterval |
| 4 | `ConfidenceFlag` | `NORMAL` · `LOW` · `EXCLUDED` | DS §4.2 Candidate |
| 5 | `VisibilityScope` | `private` · `group` · `public` | REQ-FUNC-010 |
| 6 | `MusicCategory` | 감성 · 여행 · 일상 · 운동 · 추억 | REQ-FUNC-007 |
| 7 | `ReactionType` | `like` · `comment` | DS §4.2 Reaction |
| 8 | `ProcessingStage` | `UPLOADING` · `SUBJECT_ANCHORED` · `DETECTING` · `SELECTION_READY` · `RENDERING` · `COMPLETED` · `FAILED` | DS §4.2 ProcessingJob |
| 9 | `JobStatus` | `QUEUED` · `RUNNING` · `SUCCEEDED` · `FAILED` | 동일 |
| 10 | `FailureClass` | `CAPTURE` · `MODEL` · `UX` · `INFRA` · `POLICY` | 동일 |

> 🔺 **정정 사유** — 이전 명세는 `VisibilityScope · ProcessingStage · FailureClass · ConfidenceFlag` 4종만 적었으나, **DS §4.2를 전수 대조하니 10종**이다. 6종이 누락돼 있었다. **REQ-NF-015(열거형 확장 패턴)가 이 10종 전부에 적용된다.**

### 🔴 SQL 제약 11건 — 마이그레이션에 append

```sql
-- prisma/constraints.sql
-- 🔴 Prisma 스키마로 표현할 수 없어 SQL로 직접 강제하는 제약이다.
-- 🔴 migrate 재생성 시 유실되므로 schema.prisma 상단 주석과 함께 관리한다.

-- 1·2. SourceVideo — 90분 · 6GB 상한 [PROPOSED]
ALTER TABLE source_videos
  ADD CONSTRAINT chk_sv_duration CHECK (duration_sec > 0 AND duration_sec <= 5400),
  ADD CONSTRAINT chk_sv_size     CHECK (size_bytes <= 6442450944);

-- 3·4. AppearanceInterval — 구간 유효성 · 신뢰도 정규화
ALTER TABLE appearance_intervals
  ADD CONSTRAINT chk_ai_range      CHECK (start_tc_ms < end_tc_ms),
  ADD CONSTRAINT chk_ai_confidence CHECK (confidence >= 0 AND confidence <= 1);

-- 5. GeneratedVideo — 숏폼 상한
ALTER TABLE generated_videos
  ADD CONSTRAINT chk_gv_duration CHECK (duration_sec <= 60);

-- 6. 🔴 Group — REQ-FUNC-013 · SC-5.F1. 동시 초대에서 정원이 넘지 않게 하는 최종 방어선
ALTER TABLE groups
  ADD CONSTRAINT chk_grp_member_count CHECK (member_count >= 0 AND member_count <= 20);

-- 7. VisibilitySetting — 그룹 공개인데 대상 그룹이 없는 상태 방지
ALTER TABLE visibility_settings
  ADD CONSTRAINT chk_vs_group_ids
  CHECK (scope <> 'group' OR array_length(group_ids, 1) >= 1);

-- 8. FollowRelation — 자기 팔로우 금지
ALTER TABLE follow_relations
  ADD CONSTRAINT chk_fr_self CHECK (follower_id <> followee_id);

-- 9. ProcessingJob — REQ-NF-008 재시도 3회를 DB에서 강제
ALTER TABLE processing_jobs
  ADD CONSTRAINT chk_pj_retry CHECK (retry_count >= 0 AND retry_count <= 3);

-- 10. Reaction — 빈 댓글 방지
ALTER TABLE reactions
  ADD CONSTRAINT chk_rx_comment_text
  CHECK (type <> 'comment' OR text IS NOT NULL);

-- 11. Reaction — 중복 좋아요 방지 (댓글은 중복 허용이므로 부분 UNIQUE)
CREATE UNIQUE INDEX uq_rx_like_once
  ON reactions (record_id, user_id) WHERE type = 'like';

-- 🔴 ADR-4 — 애플리케이션이 아니라 DDL에 기본값이 있어야 한다
ALTER TABLE visibility_settings
  ALTER COLUMN scope SET DEFAULT 'private';
```

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1 (정상): 공개 범위 기본값이 DDL에 존재한다** *(SC-4.1 · ADR-4)*
- **Given**: 마이그레이션이 적용된 DB
- **When**: 아래를 실행함
  ```sql
  SELECT column_default FROM information_schema.columns
   WHERE table_name = 'visibility_settings' AND column_name = 'scope';
  ```
- **Then**: `'private'::"VisibilityScope"` 가 반환된다. 🔴 **애플리케이션 코드가 아니라 DDL에 있어야 한다**

**Scenario 2 (정상): 원본을 삭제해도 결과물이 남는다** *(REQ-FUNC-019)*
- **Given**: `generated_videos` 가 `source_videos` 를 참조하는 행 1건
- **When**: 참조된 `source_videos` 행을 `DELETE` 함
- **Then**: `generated_videos` 행이 유지되고 `source_video_id IS NULL` 이 된다 — **`ON DELETE SET NULL`**

**Scenario 3 (예외): 그룹 정원이 동시 초대에서도 지켜진다** *(SC-5.F1)*
- **Given**: `member_count = 19` 인 그룹
- **When**: 두 세션이 동시에 `UPDATE groups SET member_count = member_count + 1` + `INSERT group_members` 를 한 트랜잭션으로 시도함 *(20 → 21 경합)*
- **Then**: 🔴 **한 쪽만 커밋되고 다른 쪽은 `chk_grp_member_count` 위반으로 롤백**된다. `group_members` 에 부분 삽입이 남지 않는다

**Scenario 4 (정상): 제외된 구간이 사유와 함께 보존된다** *(REQ-FUNC-027 · 003)*
- **Given**: `appearance_intervals` 행
- **When**: `excluded_reason = 'LOW_CONFIDENCE'` 로 갱신함
- **Then**: 행이 삭제되지 않고 `@@index([videoId, excludedReason])` 로 조회된다. 🔴 **제외 전/후 탐지율 분리 집계의 근거이므로 삭제하면 안 된다**

**Scenario 5 (정상): 얼굴 특징 벡터를 저장할 자리가 없다** *(REQ-NF-010 · DD-5)*
- **Given**: `person_tracks` 스키마
- **When**: `SELECT column_name FROM information_schema.columns WHERE table_name='person_tracks'` 를 실행함
- **Then**: `anchor_bbox` · `bbox_timeline`(좌표)만 있고 **얼굴 임베딩·특징 벡터 컬럼이 존재하지 않는다**

**Scenario 6 (예외): 좋아요는 중복이 막히고 댓글은 허용된다**
- **Given**: 동일 `(record_id, user_id)` 로 `type='like'` 1건이 존재
- **When**: 같은 조합으로 `type='like'` 를 다시 삽입함 → **거부** / 같은 조합으로 `type='comment'` 를 두 번 삽입함 → **허용**
- **Then**: 부분 UNIQUE `uq_rx_like_once` 가 정확히 `like` 에만 적용된다

**Scenario 7 (예외): 제약이 마이그레이션 재생성에서 살아남는다**
- **Given**: 스키마를 변경하고 `npx prisma migrate dev` 를 다시 실행함
- **When**: `SELECT conname FROM pg_constraint WHERE conname LIKE 'chk_%'` 를 실행함
- **Then**: 🔴 **10건이 전부 남아 있고 `uq_rx_like_once` 인덱스도 존재한다** *(주석 병기와 `constraints.sql` 분리가 이를 위한 것이다)*

**Scenario 8 (예외): 잘못된 구간과 범위 밖 신뢰도가 거부된다**
- **Given**: `start_tc_ms >= end_tc_ms` 인 행 / `confidence = 1.5` 인 행
- **When**: 삽입을 시도함
- **Then**: 각각 `chk_ai_range` · `chk_ai_confidence` 위반으로 거부된다

**Scenario 9 (예외): 클린 DB에서 재현된다**
- **Given**: 빈 데이터베이스
- **When**: `npx prisma migrate reset --force` 를 실행함
- **Then**: 오류 없이 완주하고 시드가 적용된다

## ⚙️ Technical & Non-Functional Constraints

### 데이터 설계
- **PK**: `uuid` — `gen_random_uuid()` ✅ **확정 (2026-08-30)** · `DS §4.1` · `v2.2 §4.1` 갱신 완료
  - 🔺 **감수사항** — DS가 ULID를 제안한 근거는 *"시간 정렬 가능"* 이었다. **`gen_random_uuid()` 는 v4(무작위)라 이 성질을 잃는다.**
  - 🟢 **조회에는 영향이 없다** — 모든 목록 인덱스가 `createdAt DESC` 를 명시하므로(§4 인덱스) 정렬을 PK에 의존하지 않는다
  - 🔺 **남는 비용은 삽입 시 B-tree 지역성 저하**뿐이다. MVP 물량(연 12만 편 `[HYPOTHESIS]`)에서 문제가 될 규모가 아니다
  - 🔺 **시간 정렬이 필요해지면 uuid v7로 전환한다** — 컬럼 타입이 같아 마이그레이션 없이 생성 함수만 바꾸면 된다
- **시각**: `TIMESTAMPTZ` · **UTC 저장** · 표시 변환은 클라이언트 책임
- **명명**: Prisma 모델은 PascalCase, 물리 테이블·컬럼은 `@@map` · `@map` 으로 snake_case

### 보안 (REQ-NF-011 · REQ-NF-019)
- 🔴 **삭제 정책 — 개인정보·영상은 물리 삭제**, 사업 자원만 `deleted_at` 논리 삭제. **논리 삭제는 REQ-NF-019의 *"전량 삭제"* 를 만족하지 않는다**
- 🔴 **`User.birth_year` · `guardian_consent_at` 은 개인정보다** — 로그·에러 메시지에 노출되지 않게 한다
- **영상 자체가 개인정보** — 객체 스토리지 at-rest 암호화는 NF-008 소관이나, `storage_uri` 가 추측 가능한 규칙이면 안 된다
- **RLS 활성화는 CT-003 소관** — 이 태스크는 `ENABLE ROW LEVEL SECURITY` 를 켜지 않는다. 정책 없이 켜면 모든 접근이 막힌다

### 성능 (REQ-NF-005)
- 인덱스는 **DS §4.2에 명시된 것만** — 조회 패턴이 확정되지 않은 곳에 선제 인덱스를 만들지 않는다
- 🔺 **`FR-021` 의 멤버 필터 p95 ≤ 300ms 가 가장 빡빡하다** — `GroupMember.@@index([userId])` 와 `Record.@@index([ownerId, createdAt])` 조합이 이를 받친다. **RLS 정책이 걸린 뒤 실행 계획을 재확인해야 한다**(CT-003에서 검증)

### 운영
- 🔴 **`prisma migrate deploy` 를 빌드 단계에 넣지 않는다** — 롤백이 불가능하다. **수동 실행 후 배포**(v2.2 §8 배포 파이프라인)
- **`member_count` 갱신은 원자 증가** — `UPDATE ... SET member_count = member_count + 1` 과 `CHECK` 를 **같은 트랜잭션**에서. 조회 후 삽입 금지
- 제약 위반은 애플리케이션에서 **PostgreSQL 오류 코드(`23514` CHECK · `23505` UNIQUE)로 판별**해 CT-004의 오류 코드로 변환한다

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria(9건)를 충족하는가?
- [ ] 🔴 **SQL 제약 11건이 마이그레이션에 있고 `schema.prisma` 주석과 `constraints.sql` 양쪽에 병기되었는가?**
- [ ] 🔴 **열거형이 10종 전부 정의되었는가?** *(기존 명세의 4종은 오류였다)*
- [ ] 동시성 테스트로 Scenario 3이 검증되었는가?
- [ ] `information_schema` · `pg_constraint` 조회로 Scenario 1·7이 자동 검사되는가? *(`scripts/verify-schema.ts`)*
- [ ] `npx prisma migrate reset --force` 가 클린 DB에서 오류 없이 완주하는가?
- [ ] 🔺 **`DS/[DS]hilit-DSv1.1.md` §4.2와 실제 스키마가 일치하는가?** *(PK 타입은 uuid로 확정·반영 완료)*
- [ ] `npx prisma generate` 결과 타입이 `SRS §6.2` 엔티티명과 일치하는가?
- [ ] RLS를 **켜지 않았는가?** *(CT-003 소관)*
- [ ] ESLint · TypeScript strict 경고가 없는가?

## 🚧 Dependencies & Blockers
- **Depends on**: 없음 — 🔴 **Wave 1의 시작점**
- **Blocks**: **CT-003**(RLS) · **CT-004**(API 계약) · FR 21건 · TS 4건 · NF 다수
- **병렬 가능**: 🟢 **CT-006**(Provider 인터페이스)과 무관하므로 동시 진행 가능
