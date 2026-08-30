---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[DB] CT-003: RLS 정책 — 공개범위 3단 및 그룹 멤버십 서버 강제"
labels: 'database, security, contract, priority:critical, step-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[CT-003] 공개 범위를 DB 계층에서 강제**
- 목적: **REQ-NF-009(*"조작된 요청의 우회 성공 0건"*)를 애플리케이션이 아니라 PostgreSQL 정책으로 보장한다.**

> 🔴 **Server Action 계층의 필터링만으로는 이 요구사항을 만족하지 못한다.** 조회 경로가 하나 추가될 때마다 누락 위험이 생기기 때문이다. **RLS는 개발자가 실수할 여지를 구조적으로 없앤다** — 이것이 이 스택의 가장 큰 이점이다(v2.2 §4.2).
>
> 🟢 **그리고 SC-4.4(*"비공개·그룹은 개수에도 미포함"*)가 자동으로 해결된다.** 정책 미통과 행은 결과 집합에 아예 없으므로 `count(*)` 도 걸러낸 뒤의 수만 센다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **RLS 설계·정책 예시**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §4.2 — 🔴 **정책 SQL 초안이 여기 있다**
- **요구사항**: `SRS/[SRS]hilit-SRSv1.8.md` REQ-NF-009
- **검증 시나리오**: `SRS/[SRS]hilit-SRSv1.8.md` §5.2 — **SC-4.4 · SC-4.F1 · SC-5.2 · SC-5.5**
- **시퀀스**: `SRS/[SRS]hilit-SRSv1.8.md` §6.4.4 (공개 범위 서버 측 강제 — 상세)
- **상태 전이**: `SRS/[SRS]hilit-SRSv1.8.md` §7.1
- 비즈니스 규칙 4·8: `SRS/[SRS]hilit-SRSv1.8.md` §6.3

## ✅ Task Breakdown (실행 계획)
- [ ] `records` · `visibility_settings` · `reactions` · `share_links` 에 **RLS 활성화**
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

## ⚙️ Technical & Non-Functional Constraints
- **모든 조회가 정책을 통과한다** — RLS를 우회하는 서비스 롤 경로는 **webhook 수신·배치**로 한정하고 목록화
- 🔺 **RLS는 접근 거부를 로그로 남기지 않는다**(v2.2 §9-2) — 감사 로그는 **NF-009**가 별도로 구현한다
- 정책 조건은 **인덱스를 탈 수 있게** 작성 — `group_members(user_id)` · `visibility_settings(record_id)`
- REQ-NF-005(조회 p95 ≤ 400ms)를 정책 적용 후에도 만족해야 한다

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **조회자 4유형(소유자 / 그룹 멤버 / 팔로워 / 비관계자) 전부에 테스트가 있는가?**
- [ ] 🔴 **서비스 롤 우회 경로가 목록화되고 최소화되었는가?**
- [ ] RLS 적용 후 조회 p95가 REQ-NF-005를 만족하는가?
- [ ] `EXPLAIN` 으로 정책 조건이 인덱스를 타는지 확인했는가?
- [ ] 🔺 `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §4.2와 실제 정책이 일치하는가?

## 🚧 Dependencies & Blockers
- **Depends on**: **CT-001**(스키마) · **CT-002**(인덱스)
- **Blocks**: **FR-019**(기록 저장) · **FR-020**(공개범위) · **FR-027**(좋아요) · **FR-028**(공유) · **FR-032·033·035**(Query 전량) · **NF-007**(우회 테스트) · TS-004 · TS-005 · TS-009
- 🔺 **관련**: NF-009(감사 로그)는 RLS가 못 하는 부분을 메운다 — 함께 설계할 것
