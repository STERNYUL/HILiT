---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[DB] CT-002: SQL CHECK 제약 11건 및 인덱스 적용"
labels: 'database, contract, priority:critical, step-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[CT-002] Prisma가 표현하지 못하는 제약을 SQL로 강제**
- 목적: **요구사항이 정한 불변식을 DB 계층에서 지킨다.** Prisma 스키마만으로는 표현할 수 없는 11건을 마이그레이션 SQL로 넣고, **다음 `migrate` 때 유실되지 않게** 스키마 파일에 병기한다.

> 🔴 **이 제약들은 장식이 아니다.** `member_count <= 20` 하나가 없으면 **동시 초대에서 정원이 넘고**(SC-5.F1), `scope DEFAULT private` 이 없으면 **삽입 경로가 늘 때마다 ADR-4가 깨진다.** 애플리케이션 코드로는 보장되지 않는다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **요구사항이 정한 제약 5건**: `SRS/[SRS]hilit-SRSv1.8.md` §6.2.1 — 🔴 **바꾸려면 요구사항을 먼저 바꿔야 한다**
- **속성·인덱스 상세**: `DS/[DS]hilit-DSv1.1.md` §4.2
- **Prisma 한계**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §4.1 — 표현 불가 항목표
- 비즈니스 규칙: `SRS/[SRS]hilit-SRSv1.8.md` §6.3

## ✅ Task Breakdown (실행 계획)
- [ ] **CHECK 제약 10건** 마이그레이션 SQL 작성
- [ ] **부분 UNIQUE 1건** — `UNIQUE(record_id, user_id) WHERE type='like'`
- [ ] `visibility_settings.scope` **DB `DEFAULT 'private'`** 확인 *(Prisma `@default`가 실제 DDL에 반영되는지 검증)*
- [ ] `generated_videos.source_video_id` **`ON DELETE SET NULL`** 적용
- [ ] 인덱스 적용 — DS §4.2의 `@@index` 전량
- [ ] 🔴 **스키마 파일 상단에 SQL 제약 목록을 주석으로 병기**
- [ ] 제약 위반 케이스별 **오류 메시지 매핑** — CT-004의 오류 코드와 연결

### 제약 목록

| # | 제약 | 대상 | 근거 |
| :--: | --- | --- | --- |
| 1 | `CHECK (duration_sec > 0 AND duration_sec <= 5400)` | SourceVideo | DS §4.2 · 90분 상한 |
| 2 | `CHECK (size_bytes <= 6442450944)` | SourceVideo | 6GB 상한 |
| 3 | `CHECK (start_tc_ms < end_tc_ms)` | AppearanceInterval | 구간 유효성 |
| 4 | `CHECK (confidence >= 0 AND confidence <= 1)` | AppearanceInterval | 정규화 |
| 5 | `CHECK (duration_sec <= 60)` | GeneratedVideo | 숏폼 상한 |
| **6** | 🔴 `CHECK (member_count <= 20)` | Group | **REQ-FUNC-013 · SC-5.F1** |
| 7 | `CHECK (scope != 'group' OR array_length(group_ids,1) >= 1)` | VisibilitySetting | 그룹 미지정 방지 |
| 8 | `CHECK (follower_id != followee_id)` | FollowRelation | 자기 팔로우 |
| 9 | `CHECK (retry_count <= 3)` | ProcessingJob | REQ-NF-008 |
| 10 | `CHECK (type != 'comment' OR text IS NOT NULL)` | Reaction | 빈 댓글 |
| 11 | 부분 UNIQUE `WHERE type='like'` | Reaction | 중복 좋아요 |

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1: 정원 초과가 부분 생성 없이 롤백된다** *(SC-5.F1)*
- **Given**: `member_count = 20` 인 그룹이 주어짐
- **When**: 21번째 멤버 삽입을 **동시 다중 트랜잭션**으로 시도함
- **Then**: 전부 `CHECK` 위반으로 거부되고 **`group_members` 에 부분 삽입이 남지 않는다**

**Scenario 2: 공개 범위 기본값이 DDL에 존재한다** *(ADR-4)*
- **Given**: 적용된 마이그레이션이 주어짐
- **When**: `information_schema.columns` 에서 `visibility_settings.scope` 의 `column_default` 를 조회함
- **Then**: `'private'` 이 반환된다. 🔴 **애플리케이션 코드가 아니라 DDL에 있어야 한다**

**Scenario 3: 원본 삭제 시 결과물의 참조만 끊긴다** *(REQ-FUNC-019)*
- **Given**: `generated_videos` 가 `source_videos` 를 참조함
- **When**: 참조된 원본 행을 삭제함
- **Then**: `generated_videos` 행이 유지되고 `source_video_id IS NULL` 이 된다

**Scenario 4: 좋아요 중복이 DB에서 막힌다**
- **Given**: 동일 사용자가 같은 기록에 좋아요를 남긴 상태
- **When**: 같은 조합으로 다시 삽입함
- **Then**: 부분 UNIQUE 위반으로 거부된다. **댓글은 중복이 허용된다**

**Scenario 5 (실패): 제약이 마이그레이션 재생성에서 살아남는다**
- **Given**: 스키마를 변경하고 `prisma migrate dev` 를 다시 실행함
- **When**: 적용 후 제약 목록을 조회함
- **Then**: 🔴 **11건이 전부 남아 있다** *(주석 병기가 이를 위한 것이다)*

## ⚙️ Technical & Non-Functional Constraints
- **`member_count` 갱신은 원자 증가** — `UPDATE ... SET member_count = member_count + 1` 과 `CHECK` 를 **같은 트랜잭션**에서. 조회 후 삽입 금지
- 인덱스는 DS §4.2에 명시된 것만 — **조회 패턴이 확정되지 않은 곳에 선제 인덱스를 만들지 않는다**
- 제약 위반은 애플리케이션에서 **DB 오류 코드로 판별**해 CT-004의 오류 코드로 변환

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **11건이 마이그레이션에 있고 스키마 파일에 주석으로 병기되었는가?**
- [ ] 동시성 테스트로 Scenario 1이 검증되었는가?
- [ ] `information_schema` 조회로 DDL 기본값이 확인되었는가?
- [ ] 🔺 `DS/[DS]hilit-DSv1.1.md` §4.2와 인덱스 목록이 일치하는가?
- [ ] ESLint · TypeScript strict 경고가 없는가?

## 🚧 Dependencies & Blockers
- **Depends on**: **CT-001**(Prisma 스키마)
- **Blocks**: **CT-003**(RLS) · **FR-021**(그룹 생성) · **FR-020**(공개범위) · TS-009
