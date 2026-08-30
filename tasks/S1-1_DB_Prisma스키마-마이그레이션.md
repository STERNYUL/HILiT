---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[DB] S1-1: Prisma 스키마 16 엔티티 및 마이그레이션 작성"
labels: 'database, contract, priority:critical, wave-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[S1-1] 데이터베이스 스키마 확정 및 마이그레이션**
- 목적: **나머지 43개 태스크가 참조할 엔티티 이름·타입·제약을 코드로 확정한다.** 설계 문서에 정의는 있으나 Prisma 코드로 고정되기 전에는 태스크마다 표기가 갈린다.

> 🔴 **이 태스크가 Wave 1의 첫 번째인 이유** — `SourceVideo`인지 `source_videos`인지, `visibility`인지 `privacy`인지가 여기서 확정된다. 이것 없이 다른 태스크를 쓰면 나중에 전부 고쳐야 한다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **데이터 모델 (ERD)**: `SRS/[SRS]hilit-SRSv1.7.md` §6.2 — 16 엔티티 관계·타입·CHECK
- **요구사항이 정한 제약 5건**: `SRS/[SRS]hilit-SRSv1.7.md` §6.2.1 — 🔴 **반드시 읽을 것**
- **속성 상세**: `DS/[DS]hilit-DSv1.1.md` §4.2 — 인덱스·보존 정책·Cascade
- **명칭 매핑**: `DS/[DS]hilit-DSv1.1.md` §4.3 — PRD ↔ SRS 개명 5건
- **Prisma 사상**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §4.1
- **RLS 전제**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §4.2 *(정책 자체는 S1-2)*
- 비즈니스 규칙: `SRS/[SRS]hilit-SRSv1.7.md` §6.3

## ✅ Task Breakdown (실행 계획)
- [ ] Supabase 로컬 스택 기동 · `prisma init` · `DATABASE_URL` 연결 확인
- [ ] **16 엔티티 모델 작성** — User · SourceVideo · PersonTrack · AppearanceInterval · Candidate · Selection · GeneratedVideo · Record · VisibilitySetting · Group · GroupMember · FollowRelation · MusicTrack · Reaction · ShareLink · ProcessingJob
- [ ] 열거형 4종 정의 — `VisibilityScope` · `ProcessingStage` · `FailureClass` · `ConfidenceFlag`
- [ ] 🔴 **Prisma가 표현하지 못하는 제약을 마이그레이션 SQL에 직접 작성** (아래 §제약 목록)
- [ ] 인덱스 작성 — DS §4.2의 `@@index` 전량
- [ ] `prisma migrate dev` 로 로컬 적용 · 롤백 시나리오 1회 확인
- [ ] **스키마 파일에 주석으로 SQL 제약 목록 병기** — 다음 `migrate` 때 유실 방지
- [ ] 시드 스크립트 작성 (개발용 최소 데이터)

### 🔴 Prisma로 표현할 수 없어 SQL로 써야 하는 제약

| # | 제약 | 대상 |
| :--: | --- | --- |
| 1 | `CHECK (duration_sec > 0 AND duration_sec <= 5400)` | SourceVideo |
| 2 | `CHECK (size_bytes <= 6442450944)` | SourceVideo |
| 3 | `CHECK (start_tc_ms < end_tc_ms)` | AppearanceInterval |
| 4 | `CHECK (confidence >= 0 AND confidence <= 1)` | AppearanceInterval |
| 5 | `CHECK (duration_sec <= 60)` | GeneratedVideo |
| 6 | 🔴 `CHECK (member_count <= 20)` | Group |
| 7 | `CHECK (scope != 'group' OR array_length(group_ids,1) >= 1)` | VisibilitySetting |
| 8 | `CHECK (follower_id != followee_id)` | FollowRelation |
| 9 | `CHECK (retry_count <= 3)` | ProcessingJob |
| 10 | `CHECK (type != 'comment' OR text IS NOT NULL)` | Reaction |
| 11 | 부분 UNIQUE — `UNIQUE(record_id, user_id) WHERE type='like'` | Reaction |

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1: 공개 범위 기본값이 DB 계층에서 적용된다** *(SC-4.1 · ADR-4)*
- **Given**: `visibility_settings` 에 `scope` 를 지정하지 않는 INSERT가 주어짐
- **When**: 해당 행을 삽입함
- **Then**: `scope` 가 `private` 으로 저장된다. 🔴 **애플리케이션 기본값이 아니라 DB `DEFAULT` 여야 한다**

**Scenario 2: 원본을 삭제해도 결과물이 남는다** *(REQ-FUNC-019 · O4)*
- **Given**: `generated_videos` 가 `source_videos` 를 참조하고 있음
- **When**: 참조된 `source_videos` 행을 삭제함
- **Then**: `generated_videos` 행은 유지되고 `source_video_id` 만 `NULL` 이 된다 — **`ON DELETE SET NULL`**

**Scenario 3: 그룹 정원이 동시 초대에서도 지켜진다** *(SC-5.F1)*
- **Given**: `member_count = 20` 인 그룹이 주어짐
- **When**: 21번째 멤버 삽입을 시도함 (동시 요청 포함)
- **Then**: `CHECK` 제약으로 거부되고 **부분 생성 없이 롤백**된다

**Scenario 4: 제외된 구간이 사유와 함께 보존된다** *(REQ-FUNC-027 · REQ-FUNC-003)*
- **Given**: 신뢰도가 임계 미만인 `appearance_intervals` 행이 주어짐
- **When**: 제외 처리를 수행함
- **Then**: 행이 삭제되지 않고 `excluded_reason = 'LOW_CONFIDENCE'` 로 표시된다. 🔴 **제외 전/후 탐지율 분리 집계의 근거이므로 삭제하면 안 된다**

**Scenario 5: 얼굴 특징 벡터를 저장할 자리가 없다** *(REQ-NF-010 · DD-5)*
- **Given**: `person_tracks` 스키마가 주어짐
- **When**: 컬럼 목록을 조회함
- **Then**: `bbox_timeline`(좌표)만 있고 **얼굴 임베딩·특징 벡터 컬럼이 존재하지 않는다**

**Scenario 6 (실패): 잘못된 구간이 거부된다**
- **Given**: `start_tc_ms >= end_tc_ms` 인 행이 주어짐
- **When**: 삽입을 시도함
- **Then**: `CHECK` 제약 위반으로 거부된다

## ⚙️ Technical & Non-Functional Constraints
- **PK**: `uuid` (`gen_random_uuid()`) — DS는 ULID를 제안했으나 **Prisma·PG 기본 지원을 우선**해 uuid로 확정
- **시각**: `TIMESTAMPTZ` · UTC 저장
- **삭제 정책**: 🔴 **개인정보·영상은 물리 삭제**, 사업 자원만 `deleted_at` 논리 삭제 — 논리 삭제는 REQ-NF-014의 *"전량 삭제"* 를 만족하지 않는다
- **마이그레이션**: `prisma migrate deploy` 를 **빌드 단계에 넣지 않는다** (롤백 불가) — 수동 실행 후 배포
- 인덱스: 조회 패턴이 확정되지 않은 곳에 선제 인덱스를 만들지 않는다

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **SQL 제약 11건이 마이그레이션에 포함되고, 스키마 파일에 주석으로 병기되었는가?**
- [ ] `prisma migrate dev` 가 클린 DB에서 오류 없이 완주하는가?
- [ ] 롤백을 1회 수행해 복구되는가?
- [ ] 🔺 **`DS/[DS]hilit-DSv1.1.md` §4.2와 실제 스키마가 일치하는가?** *(불일치 시 DS를 갱신하고 사유를 남긴다)*
- [ ] ESLint · TypeScript strict 경고가 없는가?
- [ ] 생성된 Prisma Client 타입이 `SRS §6.2` 엔티티명과 일치하는가?

## 🚧 Dependencies & Blockers
- **Depends on**: 없음 — 🔴 **Wave 1의 시작점**
- **Blocks**: **S1-2**(RLS 정책) · **S1-3**(Server Action 계약) · Step 2 전량(17건) · Step 3 전량(10건)
- **참고**: S1-4(Provider 인터페이스)와는 **무관** — 병렬 진행 가능
