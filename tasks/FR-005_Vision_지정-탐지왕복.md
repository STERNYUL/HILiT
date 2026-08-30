---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[Command] FR-005: 추적 대상 지정 · 탐지 요청 · 결과 수신 (한 왕복)"
labels: 'backend, command, vision, priority:critical, step-2'
assignees: ''
---

> 🔀 **FR-006(탐지 요청) · FR-007(결과 수신)을 흡수했다** *(축약 2026-08-30)* — **`submit` → `callback` 이 한 왕복**이고 셋 다 같은 모듈이다. 두 ID는 폐번이며 이 문서를 가리킨다.

## 🎯 Summary
- 기능명: **[FR-005] 사용자가 자기를 한 번 가리키면, 40분 전체가 외부에서 분석되어 돌아온다**
- 목적: **A-T1 안에서 장시간 추론을 시작시키고, 공급자마다 다른 결과를 하나의 형태로 정규화한다.**

> 🔴 **"1회"가 요구사항의 본문이다.** REQ-FUNC-002: *"사용자가 자기를 **1회 지정**하면"*.
>
> 여러 번 지정하게 만들면 정확도는 올라가지만 **차별점 D1이 사라진다** — *"긴 영상을 직접 뒤지지 않아도 된다"* 가 제품의 주장인데, 여러 번 지정하는 것은 결국 영상을 뒤지는 일이다.

> 🔴 **그리고 성공 조건은 "결과를 받는 것"이 아니라 "기다리지 않는 것"이다.** 탐지는 p95 ≤ 8분을 목표로 하는데 Vercel 함수는 그만큼 살아 있지 못한다(A-T1). **요청을 보내고 `inferenceId` 만 받고 즉시 반환**해야 하며, 결과는 **webhook**으로 돌아온다.

> 🔴 **정규화가 수신 측의 본체다.** SP-1 후보들은 응답 형태가 다르다 — 프레임 인덱스 vs 밀리초, 재식별 신뢰도 제공 vs **미제공(B3 실패)**. **여기서 정규화하지 않으면 공급자 차이가 파이프라인 전체로 번진다.**

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **요구사항**: `SRS/[SRS]hilit-SRSv1.8.md` **REQ-FUNC-002**(🔴 **1회 지정** · 재식별 ≥ 90% · 오인식 ≤ 2% `[SOURCE]`) · **REQ-FUNC-003**
- **시퀀스**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §7.4 — 🔴 **T1 확정 구조**
- **파생 전제**: §1.5.2 **A-T1 · A-T3**
- **Provider 계약**: `tasks/CT-006_APISpec_TrackingProvider.md` — `submit()` · `parseWebhook()` · **`resolution` 옵션(B8)**
- **Webhook 계약**: `tasks/CT-004_APISpec_API계약.md` — 서명 · 멱등 · 순서 역전 · 🔴 **`failure_class = CAPTURE`**
- **신뢰도 구분**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §7.3 — 🔴 **재식별 신뢰도 ≠ 구간 점수**
- **시나리오**: **SC-1.2**(가림 후 재식별) · **SC-1.F2**(대상 미등장)
- **전송 비용**: `실행 계획/03_스파이크_실행계획.md` **B8** · **REQ-NF-013**
- **차별점**: `SRS/[SRS]hilit-SRSv1.8.md` §1.2 **D1**
- 후보 API 특성: `실행 계획/04_SP-1_API후보조사.md` §2

## ✅ Task Breakdown (실행 계획)

### A. 대상 지정
- [ ] Server Action **`setTrackingAnchor({ videoId, frameMs, bbox })`**
- [ ] 🔴 **정규화 좌표 0~1로 저장** — 원본 해상도와 무관하게 유효해야 한다(§제약)
- [ ] 유효성 — `frameMs` 범위 · `bbox` 0~1 · 폭·높이 > 0 · 소유권
- [ ] 🔴 **재지정 경로** — SC-1.F2 이후 다시 지정 가능 · **이전 탐지 결과 무효화**
- [ ] 계측 — `anchor_set` · `anchor_reset`

### B. 탐지 요청 *(← FR-006)*
- [ ] Server Action **`startDetection(videoId)`**
- [ ] 사전 조건 — `status = UPLOADED` **and** anchor 존재
- [ ] Storage **읽기용 Signed URL** 발급 — 만료가 추론 상한보다 길게
- [ ] `TrackingProvider.submit()` 호출 — `{ videoUrl, anchor, callbackUrl, resolution }`
- [ ] 🔴 **`resolution` 을 설정으로 분리** — B8 결과에 따라 코드 변경 없이 바꾼다
- [ ] `processing_jobs` 등록 — `stage = DETECTING` · `inferenceId` 보관
- [ ] 🔴 **즉시 반환** · **중복 요청 방지**
- [ ] 계측 — `detection_started`(**해상도·전송 바이트 포함**)

### C. 결과 수신 및 정규화 *(← FR-007)*
- [ ] Route Handler **`POST /api/webhooks/inference`** — 🔴 **서명 검증 우선**
- [ ] `TrackingProvider.parseWebhook()` 위임 — 🔴 **공급자별 파싱은 어댑터(FR-008)의 몫**
- [ ] **시간 단위 정규화**(프레임 → `frameMs`) · **좌표 정규화**(0~1)
- [ ] `appearance_intervals` INSERT · `bbox_timeline` 저장
- [ ] 🔴 **`reidConfidence` 를 별도 필드로** — 구간 점수와 절대 섞지 않는다
- [ ] 🔴 **등장 구간 0건 → `failure_class = CAPTURE`** (`INFRA` 아님)
- [ ] 상태 전이 `DETECTING → SELECTION_READY` 또는 `FAILED` · 멱등 · 순서 역전 방어
- [ ] 계측 — `detection_completed`(**소요 시간 · 구간 수 · 신뢰도 제공 여부**)

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1: 한 번의 지정으로 탐지가 시작된다** *(REQ-FUNC-002)*
- **Given**: 업로드가 완료된 40분 원본
- **When**: 사용자가 한 프레임에서 자기를 1회 지정함
- **Then**: 🔴 **추가 지정 요구 없이** anchor가 저장되고 탐지 요청이 가능해진다

**Scenario 2: 좌표가 해상도에 의존하지 않는다**
- **Given**: 1080p 원본에서 지정한 anchor
- **When**: 🔺 B8에 따라 절반 해상도로 다운스케일해 추론 API로 보냄
- **Then**: 🔴 **anchor가 그대로 유효하다.** 픽셀 좌표로 저장했다면 여기서 어긋난다

**Scenario 3: 찾지 못했을 때 다시 지정할 수 있다** *(SC-1.F2)*
- **Given**: 탐지 결과 등장 구간 0건
- **When**: 다른 프레임에서 재지정함
- **Then**: 🔴 **새 anchor가 저장되고 이전 탐지 결과가 무효화**된다. 두 결과가 섞이지 않는다

**Scenario 4: 요청 후 즉시 반환한다** *(A-T1)*
- **Given**: 40분 원본과 anchor
- **When**: `startDetection` 을 호출함
- **Then**: 🔴 **초 단위로 반환**되고 `stage = DETECTING` 이 기록된다. 함수가 추론 시간만큼 살아 있지 않는다

**Scenario 5: 사전 조건 없이 · 중복으로 탐지가 나가지 않는다**
- **Given**: anchor가 없거나, 이미 `DETECTING` 인 원본
- **When**: 탐지를 요청함
- **Then**: 🔴 **거부되고 새 추론이 발생하지 않는다.** **비용이 발생하는 호출이므로 중복은 원가를 두 배로 만든다**(REQ-NF-013)

**Scenario 6: 해상도를 코드 변경 없이 바꿀 수 있다** *(B8)*
- **Given**: `resolution` 설정
- **When**: `original → half` 로 변경함
- **Then**: 🔴 **전송 바이트가 줄고 코드는 그대로다.** B8 실험이 배포 없이 반복 가능하다

**Scenario 7: 전송량이 계측된다** *(REQ-NF-013)*
- **Given**: 탐지 요청
- **When**: `detection_started` 를 확인함
- **Then**: 🔴 **전송 바이트와 해상도가 담긴다.** **원본 전송 비용은 REQ-NF-013이 처음에 빠뜨렸던 항목**이므로 계측이 없으면 다시 보이지 않게 된다

**Scenario 8: 결과가 저장되고 다음 단계가 열린다**
- **Given**: `stage = DETECTING` 인 작업
- **When**: 추론 API가 `intervals` 를 포함한 결과를 보냄
- **Then**: `appearance_intervals` 가 저장되고 `stage = SELECTION_READY` 로 전이된다

**Scenario 9: 등장 구간 0건이 촬영 실패로 분류된다** *(SC-1.F2)*
- **Given**: `intervals` 가 빈 배열
- **When**: webhook을 수신함
- **Then**: 🔴 **`failure_class = CAPTURE`.** **`INFRA` 로 분류하면 인프라 실패율 지표가 오염되고 진짜 장애가 묻힌다**

**Scenario 10: 두 신뢰도가 섞이지 않는다** *(v2.2 §7.3)*
- **Given**: 추론 결과의 `reidConfidence` 와 Gemini의 구간 점수
- **When**: 저장된 스키마를 확인함
- **Then**: 🔴 **서로 다른 컬럼이다.** *"이 사람이 당신인가"* 와 *"이 구간이 볼 만한가"* 는 다른 질문이며, **섞이면 REQ-FUNC-027의 제외 판정이 조용히 틀린다**

**Scenario 11: 신뢰도 미제공이 명시적으로 드러난다** *(B3)*
- **Given**: `reidConfidence` 가 `null` 인 결과
- **When**: 저장을 수행함
- **Then**: 🔴 **`null` 이 그대로 보존되고 0으로 채우지 않는다.** 0으로 채우면 FR-009가 전부 제외해 버린다

**Scenario 12: 시간 단위가 통일된다**
- **Given**: 프레임 인덱스로 응답하는 공급자
- **When**: 정규화를 수행함
- **Then**: **밀리초로 환산되어 저장**된다. 이후 어떤 코드도 프레임률을 알 필요가 없다

**Scenario 13 (실패): 지정 횟수를 늘려 정확도를 올리지 않는다** *(D1)*
- **Given**: 재식별 정확도가 목표에 미달하는 상황
- **When**: 해결책을 검토함
- **Then**: 🔴 **"여러 번 지정하게 하기"는 이 태스크의 해법이 아니다.** 대응은 ADR-1 재검토 또는 임계 조정이며, **지정 횟수 증가는 제품 결정이지 구현 결정이 아니다**

## ⚙️ Technical & Non-Functional Constraints
- 🔴 **정규화 좌표 0~1** — B8 실험이 다운스케일 전송을 검토 중이므로 **픽셀 좌표는 이 실험을 불가능하게 만든다**
- 🔴 **A-T1이 비동기 설계의 원인** — 동기 대기는 구조적으로 불가능하다
- 🔴 **파싱을 Handler에 하드코딩하지 않는다** — `parseWebhook()` 위임이 공급자 교체를 가능하게 하는 지점이다
- 🔴 **Webhook은 RLS 우회 경로** — CT-003의 우회 목록에 등재. **Handler 안에서 후보 생성까지 하지 않는다**(A-T1) — FR-012는 분리
- 🔺 **`resolution` 기본값은 `[TBD]`** — B8이 **탐지율 손실 대비 전송 절감**을 재기 전까지 `original` 로 두고 설정값으로 분리
- 🔺 **입력 형태가 SP-1 결과에 종속** — 클릭 좌표 기반은 점 하나로 충분하고 얼굴 대조 기반은 얼굴이 보이는 프레임을 요구한다. **`bbox` 는 두 경우를 모두 담는 상위 형태**이므로 이 계약을 유지한다
- 🔺 **대량 INSERT 주의** — 40분 영상의 bbox 시계열은 행 수가 크다. 벌크 삽입·트랜잭션 경계 설계 필요 `[TBD]`
- 재시도는 FR-011 소관 — 이 태스크는 **1회 발신**만 책임진다
- 재식별 정확도·오인식률은 이 태스크가 달성하지 않는다 — **FR-008과 SP-1의 몫**

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **좌표가 정규화 0~1로 저장되는가?** *(픽셀 좌표가 코드 어디에도 없는가)*
- [ ] 🔴 **재지정 시 이전 결과가 무효화되는가?**
- [ ] 🔴 **추론 완료를 기다리는 코드가 없는가?**
- [ ] 🔴 **`resolution` 이 설정값으로 분리되었는가?**
- [ ] 🔴 **`reidConfidence` 가 구간 점수와 별도 컬럼이고 `null` 이 0으로 치환되지 않는가?**
- [ ] 🔴 **0건이 `CAPTURE` 로 분류되는가?**
- [ ] 공급자별 파싱이 어댑터에 위임되어 있는가?
- [ ] 멱등 · 순서 역전 방어가 둘 다 있는가?
- [ ] `detection_started` 에 **해상도 · 전송 바이트**가 포함되는가?
- [ ] 유효성 검증 4종(범위·크기·시각·소유권)이 있는가?
- [ ] TypeScript strict · ESLint 경고 0건인가?

## 🚧 Dependencies & Blockers
- **Depends on**: **CT-004**(Action·Webhook 계약) · **CT-006**(Provider 인터페이스)
- **Blocks**: **FR-009**(제외) · **FR-011**(체크포인트) · **FR-012**(후보) · **FR-036**(Realtime) · **TS-001**
- **테스트 수단**: 🟢 **CT-007 Mock의 6종 픽스처로 SP-1 없이 완성 가능**하다
- **연관**: **NF-006**(원가 추적)이 `detection_started` 를 소비한다
