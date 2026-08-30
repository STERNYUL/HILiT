---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[Mock] CT-007: 추론 결과 Mock — bbox 시계열 · 재식별 신뢰도"
labels: 'mock, contract, priority:critical, step-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[CT-007] 추론 API 없이 개발을 진행시키는 가짜 데이터**
- 목적: **프론트엔드와 후속 로직이 SP-1 완료를 기다리지 않게 한다.**

> 🔴 **이 태스크가 없으면 사슬 전체가 멈춘다.**
>
> ```
> Mock 없음 → 프론트가 SP-1 완료를 기다림
>          → SP-1은 정답셋 10~15편 구축이 선행
>          → 정답셋은 실제 농구 영상 수급이 선행
> ```
>
> **형태만 정하면 사슬이 끊어진다.** 이 제품의 핵심 데이터가 외부에서 오고, **그 외부가 아직 무엇인지도 모르기 때문에** Mock의 가치가 특히 크다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **결과 타입**: `tasks/CT-006_APISpec_TrackingProvider.md` — 🔴 **`TrackingResult` 가 계약이다**
- **webhook 계약**: `tasks/CT-005_APISpec_Webhook계약.md`
- **신뢰도 구분**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §7.3 — 재식별 신뢰도 ≠ 구간 점수
- **제외 로직**: `SRS/[SRS]hilit-SRSv1.8.md` REQ-FUNC-027 · SC-1.F5·F6
- **탐지 0건**: `SRS/[SRS]hilit-SRSv1.8.md` SC-1.F2
- 촬영 조건 다양성: `실행 계획/03_스파이크_실행계획.md` §1.4

## ✅ Task Breakdown (실행 계획)
- [ ] `TrackingProvider` 를 구현하는 **`MockTrackingProvider`** 작성
- [ ] **정상 시나리오 픽스처** — 등장 구간 다수 · bbox 시계열 · 신뢰도 정상
- [ ] 🔴 **저신뢰 혼재 픽스처** — 임계 미만 구간을 포함해 **REQ-FUNC-027 제외 로직을 개발 단계에서 검증**
- [ ] 🔴 **`reidConfidence: null` 픽스처** — **B3 실패 케이스**. 신뢰도 미제공 후보를 채택했을 때의 경로
- [ ] **등장 구간 0건 픽스처** — SC-1.F2
- [ ] 지연 시뮬레이션 — `submit()` 후 N초 뒤 webhook 발사
- [ ] 실패 시뮬레이션 — 타임아웃 · 오류 응답
- [ ] 환경 변수 `INFERENCE_PROVIDER=mock` 으로 활성화

### 픽스처 목록

| # | 픽스처 | 검증 대상 |
| :--: | --- | --- |
| M1 | 정상 — 구간 12개 · 신뢰도 전부 정상 | 기본 흐름 |
| M2 | 저신뢰 혼재 — 구간 12개 중 4개가 임계 미만 | **REQ-FUNC-027 제외 · 제외율 계측** |
| M3 | 🔴 `reidConfidence: null` | **B3 실패 시 경로** — 제외 로직 불성립 처리 |
| M4 | 등장 구간 0건 | **SC-1.F2** 재지정 경로 |
| M5 | 제외 후 구간 1개 | **SC-1.F6** 후보 부족 안내 |
| M6 | 타임아웃 · 오류 | REQ-NF-008 재시도 |

## 🧪 Acceptance Criteria (BDD/GWT)

> **Mock의 인수 기준은 *"올바른 값을 반환한다"* 가 아니라 *"계약과 형태가 같다"* 다.**

**Scenario 1: 실제 구현과 타입이 동일하다**
- **Given**: `MockTrackingProvider` 와 `TrackingProvider` 인터페이스가 주어짐
- **When**: 타입 검사를 수행함
- **Then**: **인터페이스를 완전히 구현한다.** 호출부에 Mock 전용 분기가 없다

**Scenario 2: 저신뢰 제외가 개발 단계에서 검증된다** *(M2)*
- **Given**: 픽스처 M2가 주어짐
- **When**: ConfidenceGate를 통과시킴
- **Then**: 임계 미만 4건이 **제외되고 `excluded_reason` 이 기록**되며 **제외 건수가 응답에 포함**된다

**Scenario 3: 신뢰도 미제공이 처리된다** *(M3 · B3)*
- **Given**: `reidConfidence: null` 픽스처가 주어짐
- **When**: 제외 로직을 실행함
- **Then**: 🔴 **제외를 수행하지 않고 그 사실이 명시적으로 드러난다.** 조용히 통과시키지 않는다

**Scenario 4: 탐지 0건이 실패 화면으로 이어진다** *(M4 · SC-1.F2)*
- **Given**: 픽스처 M4가 주어짐
- **When**: 후보 화면에 진입함
- **Then**: 빈 화면이 아니라 **원인 후보와 재지정 경로**가 표시된다

**Scenario 5: 비동기 흐름이 실제와 같다**
- **Given**: Mock이 활성화됨
- **When**: `submit()` 을 호출함
- **Then**: 즉시 `inferenceId` 만 반환하고, **N초 뒤 webhook이 도착**한다. 동기 반환하지 않는다

**Scenario 6 (실패): 실제 API로 교체 시 호출부가 바뀌지 않는다**
- **Given**: `INFERENCE_PROVIDER` 를 `mock` 에서 실제 값으로 변경함
- **When**: 애플리케이션을 재기동함
- **Then**: 🔴 **호출부 코드 변경 0건**으로 동작한다

## ⚙️ Technical & Non-Functional Constraints
- **좌표는 정규화 0~1** — 실제 구현과 동일 규약
- **프로덕션 번들에 포함되지 않게** — 환경 변수 분기 + 빌드 시 제외
- 🔺 **Mock 값은 실측치가 아니다** — 픽스처의 신뢰도·구간 수는 **형태 검증용**이며 O9 판정에 쓰지 않는다
- bbox 시계열은 **실제 궤적처럼 연속적**이어야 한다 — 리프레이밍(FR-010) 개발에 쓰이므로 무작위 값이면 안 된다

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **픽스처 6종이 전부 있는가?** *(특히 M3 `null` · M4 0건)*
- [ ] 🔴 **실제 API 교체 시 프론트·서버 코드 변경 0건인가?**
- [ ] 프로덕션 빌드에 Mock이 포함되지 않는가?
- [ ] 타입이 CT-006 인터페이스를 완전히 구현하는가?
- [ ] ESLint · TypeScript strict 경고가 없는가?

## 🚧 Dependencies & Blockers
- **Depends on**: **CT-006**(TrackingProvider 인터페이스)
- **Blocks**: **CT-008**(후보 Mock) · **FR-009**(ConfidenceGate) · **FE-003·004·010** · TS-007
- **참고**: 🟢 **SP-1 결과를 기다리지 않는다.** 오히려 SP-1과 **병렬**로 개발을 진행시키는 것이 이 태스크의 목적이다
