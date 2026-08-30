---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[Mock] CT-008: 후보 목록 Mock — 프론트엔드 UI 개발용"
labels: 'mock, contract, priority:high, step-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[CT-008] 후보 선택 화면을 백엔드 없이 개발하게 하는 Mock**
- 목적: **`GET /videos/{id}/candidates` 응답 규격의 가짜 데이터를 제공해 FE-003(후보 목록·선택 UI)이 독립 진행되게 한다.**

> **CT-007과 계층이 다르다.** CT-007은 **추론 API 경계**의 Mock이고, 이것은 **조회 API 경계**의 Mock이다. 프론트엔드는 추론 결과를 직접 보지 않고 **후보 목록만** 보므로 이 계층이 따로 필요하다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **응답 규격**: `DS/[DS]hilit-DSv1.1.md` §3.2 A-08 — 🔴 **`excludedCount` 가 포함된다**
- **요구사항**: `SRS/[SRS]hilit-SRSv1.8.md` REQ-FUNC-004 — 약 30개 · 타임코드
- **제외 표시**: `SRS/[SRS]hilit-SRSv1.8.md` REQ-FUNC-027 · SC-1.F6
- **화면**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §6 — 후보 목록
- 상위 Mock: `tasks/CT-007_Mock_추론결과.md`

## ✅ Task Breakdown (실행 계획)
- [ ] `getCandidates()` 의 **Mock 구현** — CT-004의 타입 준수
- [ ] **정상 픽스처** — 후보 30개 · 시작/종료 타임코드 · 썸네일 · `confidenceFlag: NORMAL`
- [ ] 🔴 **`excludedCount` 포함** — SC-1.F6(제외로 후보 부족 안내)의 입력
- [ ] **후보 부족 픽스처** — 2건만 남고 `excludedCount: 28`
- [ ] **0건 픽스처** — SC-1.F2
- [ ] 개수 변형 픽스처 — **15 / 30 / 50** *(가정 A3 · Q7의 A/B/n 실측 대비)*
- [ ] 썸네일 플레이스홀더 이미지
- [ ] MSW 또는 동등 수단으로 네트워크 계층에서 가로채기

### 픽스처 목록

| # | 픽스처 | 검증 대상 |
| :--: | --- | --- |
| C1 | 후보 30개 정상 | 기본 목록·가상 스크롤 |
| C2 | 후보 15개 / 50개 | **가정 A3 · Q7** 개수 적정성 |
| C3 | 🔴 후보 2개 · `excludedCount: 28` | **SC-1.F6** 사유 안내 |
| C4 | 후보 0개 | **SC-1.F2** 재지정 경로 |
| C5 | 긴 타임코드 (40분 후반부) | 표시 포맷 |

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1: 응답 스키마가 실제 계약과 일치한다**
- **Given**: Mock 응답과 CT-004의 타입 정의가 주어짐
- **When**: 타입 검사를 수행함
- **Then**: **완전히 일치한다.** 프론트엔드에 Mock 전용 분기가 없다

**Scenario 2: 후보에 타임코드가 붙는다** *(REQ-FUNC-004)*
- **Given**: 픽스처 C1이 주어짐
- **When**: 목록을 렌더함
- **Then**: 각 후보에 **시작·종료 타임코드**가 표시된다

**Scenario 3: 제외 건수가 사유 안내로 이어진다** *(SC-1.F6)*
- **Given**: 픽스처 C3(후보 2 · 제외 28)이 주어짐
- **When**: 후보 화면을 엶
- **Then**: 목록과 함께 **"왜 후보가 적은지"** 가 안내된다. 🔴 **빈 목록만 보여주지 않는다**

**Scenario 4: 저신뢰 후보는 목록에 없다** *(REQ-FUNC-027)*
- **Given**: 어떤 픽스처든
- **When**: 응답의 `confidenceFlag` 를 조회함
- **Then**: **`NORMAL` 만 존재한다.** `LOW`·`EXCLUDED` 는 목록에 오르지 않는다

**Scenario 5: 개수 변형으로 A/B/n 준비가 된다** *(가정 A3)*
- **Given**: 픽스처 C2(15 / 30 / 50)가 주어짐
- **When**: 각각을 렌더함
- **Then**: 세 경우 모두 **스크롤·선택 동작이 정상**이다. 실측 시 코드 변경이 필요 없다

**Scenario 6 (실패): 실제 API 교체 시 UI 코드가 바뀌지 않는다**
- **Given**: Mock을 끄고 실제 조회로 전환함
- **When**: 후보 화면을 엶
- **Then**: 🔴 **프론트 코드 변경 0건**으로 동작한다

## ⚙️ Technical & Non-Functional Constraints
- **네트워크 계층에서 가로챈다** — 컴포넌트에 Mock 분기를 넣지 않는다
- 썸네일은 **플레이스홀더**로 충분 — 실제 프레임 추출은 FR-012의 몫
- 🔺 **후보 개수 30은 초안값**(가정 A3) — Mock이 그 숫자를 고정 사실로 만들지 않도록 C2를 함께 둔다
- 프로덕션 번들 제외

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **`excludedCount` 가 응답에 있고 SC-1.F6이 재현되는가?**
- [ ] 픽스처 5종이 전부 있는가?
- [ ] 🔴 **실제 API 교체 시 프론트 코드 변경 0건인가?**
- [ ] 프로덕션 빌드에 포함되지 않는가?
- [ ] 🔺 `DS/[DS]hilit-DSv1.1.md` §3.2 A-08과 응답 형태가 일치하는가?

## 🚧 Dependencies & Blockers
- **Depends on**: **CT-004**(응답 타입) · **CT-007**(상위 Mock 규약)
- **Blocks**: **FE-003**(후보 목록·선택 UI) · **FE-010**(실패 안내 UI) · TS-007
- **참고**: 🟢 이 태스크가 끝나면 **FE-003이 백엔드와 무관하게 진행**된다
