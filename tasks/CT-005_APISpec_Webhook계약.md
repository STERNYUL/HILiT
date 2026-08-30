---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[API Spec] CT-005: Webhook 수신 계약 2종 (Storage · Inference)"
labels: 'api-spec, contract, priority:high, step-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[CT-005] 외부에서 들어오는 두 경로의 계약 확정**
- 목적: **비동기 처리의 결과가 시스템에 들어오는 유일한 통로를 정의한다.** 업로드 완료와 추론 완료는 사용자가 아니라 **외부가 일으키는 사건**이므로 Server Action이 아니라 Route Handler다.

> **원칙** — 사용자가 일으키는 상태 변경은 **Server Action**, 외부가 일으키는 것은 **Route Handler**(v2.2 §5.1).
>
> 🔴 **이 두 경로가 끊기면 파이프라인이 중간에 멈춘다.** 탐지가 끝나도 시스템이 모르고, 사용자는 영원히 대기 화면을 본다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **배분 원칙**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §5.1 — Server Action / Route Handler
- **업로드 시퀀스**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §5.3
- **추론 시퀀스**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §7.4
- **결과 타입**: `tasks/CT-006_APISpec_TrackingProvider.md` — `TrackingResult`
- **상태 전이**: `SRS/[SRS]hilit-SRSv1.8.md` §7.2 (편집 파이프라인 6단계)
- 오류·재시도: `SRS/[SRS]hilit-SRSv1.8.md` REQ-NF-008

## ✅ Task Breakdown (실행 계획)
- [ ] `POST /api/webhooks/storage` — **업로드 완료 통지** 계약
- [ ] `POST /api/webhooks/inference` — **추론 결과 수신** 계약
- [ ] 🔴 **서명 검증 방식 정의** — 발신자 진위 확인
- [ ] **멱등 처리** — 같은 이벤트가 재전송돼도 상태가 중복 전이되지 않게
- [ ] `ProcessingJob.stage` 전이 규칙 매핑
- [ ] 실패·재시도 응답 규약 — 어떤 상태 코드가 재전송을 유발하는가
- [ ] 🔺 **RLS 우회가 필요한 경로임을 명시** — CT-003의 서비스 롤 목록에 등재
- [ ] 순서 역전 처리 — 늦게 온 이벤트가 앞선 상태를 덮지 않게

### 계약 초안

| 경로 | 발신 | 페이로드 | 상태 전이 |
| --- | --- | --- | --- |
| `/api/webhooks/storage` | Supabase Storage | `{videoId, objectPath, sizeBytes}` | `UPLOADING → UPLOADED` |
| `/api/webhooks/inference` | 추론 API | `TrackingResult` *(CT-006)* | `DETECTING → SELECTION_READY` 또는 `FAILED` |

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1: 업로드 완료가 상태를 전이시킨다**
- **Given**: `status = UPLOADING` 인 원본이 주어짐
- **When**: Storage가 완료 webhook을 보냄
- **Then**: `status = UPLOADED` 로 전이되고 사용자 화면이 다음 단계로 진행 가능해진다

**Scenario 2: 추론 결과가 후보 생성으로 이어진다**
- **Given**: `stage = DETECTING` 인 작업이 주어짐
- **When**: 추론 API가 `intervals` 를 포함한 결과를 보냄
- **Then**: `appearance_intervals` 가 저장되고 `stage = SELECTION_READY` 로 전이된다

**Scenario 3: 등장 구간 0건이 실패로 처리된다** *(SC-1.F2)*
- **Given**: `intervals` 가 빈 배열인 결과가 주어짐
- **When**: webhook을 수신함
- **Then**: `stage = FAILED` · `failure_class = CAPTURE` 로 기록된다. 🔴 **`INFRA` 로 분류하면 실패 통계가 오염된다**

**Scenario 4: 같은 이벤트 재전송이 상태를 중복 전이시키지 않는다**
- **Given**: 이미 처리된 `inferenceId` 의 이벤트가 주어짐
- **When**: 동일 페이로드가 재전송됨
- **Then**: `200` 을 반환하되 **상태가 다시 바뀌지 않고 데이터가 중복 삽입되지 않는다**

**Scenario 5: 서명이 없거나 틀린 요청이 거부된다**
- **Given**: 서명 헤더가 없거나 조작된 요청이 주어짐
- **When**: webhook 엔드포인트를 호출함
- **Then**: `401` 을 반환하고 **상태를 전이시키지 않는다**

**Scenario 6 (실패): 늦게 도착한 이벤트가 앞선 상태를 덮지 않는다**
- **Given**: 이미 `RENDERING` 으로 진행된 작업이 주어짐
- **When**: 지연된 `SELECTION_READY` 이벤트가 도착함
- **Then**: **무시된다.** 상태 전이는 §7.2의 순서를 역행하지 않는다

## ⚙️ Technical & Non-Functional Constraints
- **응답은 빠르게** — 수신 즉시 `202` 를 반환하고 무거운 처리는 하지 않는다 *(Vercel 함수 실행 시간)*
- **재전송 유발 규약** — `5xx` 는 재전송을 유도, `4xx` 는 재전송하지 않게 한다
- 🔴 **서비스 롤 사용** — 이 경로는 사용자 세션이 없으므로 RLS를 우회한다. **CT-003의 목록에 반드시 등재**
- 계측 — `detection_completed` · `detection_empty` 이벤트 발행 *(NF-003)*

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **서명 검증이 두 경로 모두에 적용되었는가?**
- [ ] 멱등 처리가 동일 이벤트 재전송 테스트로 검증되었는가?
- [ ] 🔺 **RLS 우회 경로가 CT-003 목록에 등재되었는가?**
- [ ] 타입 정의가 CT-006의 `TrackingResult` 와 일치하는가?
- [ ] ESLint · TypeScript strict 경고가 없는가?

## 🚧 Dependencies & Blockers
- **Depends on**: **CT-004**(오류 코드·타입 규약) · **CT-006**(`TrackingResult` 형태)
- **Blocks**: **FR-003**(업로드 완료 수신) · **FR-007**(추론 결과 수신) · FR-011(체크포인트)
