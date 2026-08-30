---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[Query] FR-036: 처리 상태 Realtime 구독 (processing_jobs)"
labels: 'backend, query, telemetry, priority:high, step-2'
assignees: ''
---

## 🎯 Summary
- 기능명: **[FR-036] 8분 동안 사용자가 무슨 일이 일어나는지 안다**
- 목적: **폴링 없이 처리 진행을 전달해 대기를 견딜 수 있게 만든다.**

> 🔴 **8분은 그냥 기다리기에는 긴 시간이다.**
>
> 탐지는 p95 ≤ 8분이 목표다(REQ-NF-003). **아무 표시 없이 8분이면 사용자는 앱이 멈췄다고 판단한다** — §3의 이탈 분석이 지목한 2차 이탈 지점이 여기서 멀지 않다.
>
> 🔴 **그런데 폴링으로 만들면 A-T1과 원가를 동시에 건드린다** — 8분 × 다수 사용자의 반복 요청이 서버리스 함수 호출로 쌓인다. **Supabase Realtime이 v2.2 §5.1에서 폴링의 대체로 지정된 이유다.**

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **배분 원칙**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §5.1 — 🔴 **"상태 폴링 대체 → Supabase Realtime · `processing_jobs` 구독"**
- **시나리오**: **SC-1.F4** 🆕 — 처리 중 앱 종료 후 재개
- **상태 원천**: `tasks/FR-011_Vision_체크포인트-재개.md` — 🔴 **이 태스크는 상태를 만들지 않고 전달만 한다**
- **성능**: `SRS/[SRS]hilit-SRSv1.8.md` **REQ-NF-003** — 탐지 p95 ≤ 8분
- **RLS**: `tasks/CT-003_DB_RLS정책.md` — 🔴 **Realtime에도 정책이 적용되는지 확인**
- 화면: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §6 — `Progress` + Realtime 구독

## ✅ Task Breakdown (실행 계획)
- [ ] `processing_jobs` **Realtime 구독** 설정
- [ ] 🔴 **RLS가 Realtime 채널에도 적용되는지 검증**(§제약)
- [ ] 자기 작업만 구독하도록 필터
- [ ] **연결 끊김 시 재구독** — 모바일 네트워크 전환
- [ ] 🔴 **재진입 시 현재 상태 1회 조회** — 구독은 *변경*만 주므로 초기 상태가 필요하다
- [ ] 단계별 표시 정보 — `stage` · 진행 비율
- [ ] 🔺 **`FAILED` 도달 시 실패 유형 전달** — `failure_class`(FE-010의 입력)
- [ ] 계측 — `progress_viewed`

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1: 단계 전이가 즉시 화면에 나타난다**
- **Given**: 탐지가 진행 중
- **When**: `stage` 가 변경됨
- **Then**: **폴링 없이 화면이 갱신**된다

**Scenario 2: 재진입 시 현재 상태부터 보인다** *(SC-1.F4)*
- **Given**: 앱을 닫았다가 다시 엶
- **When**: 처리 화면에 진입함
- **Then**: 🔴 **현재 단계가 즉시 보인다.** **구독만 하면 다음 변경이 올 때까지 빈 화면**이므로 초기 조회가 반드시 함께 있어야 한다

**Scenario 3: 남의 작업을 구독할 수 없다**
- **Given**: 타인의 `job_id`
- **When**: 구독을 시도함
- **Then**: 🔴 **차단된다.** **Realtime은 REST와 다른 경로이므로 RLS 적용 여부를 별도로 확인해야 한다** — 여기가 새면 REQ-NF-009의 우회 경로가 된다

**Scenario 4: 네트워크가 끊겼다 붙으면 이어진다**
- **Given**: 모바일 네트워크 전환으로 연결이 끊김
- **When**: 다시 연결됨
- **Then**: **재구독되고 그 사이의 상태 변화가 반영**된다

**Scenario 5: 실패도 전달된다**
- **Given**: `stage = FAILED`
- **When**: 화면을 확인함
- **Then**: 🔴 **`failure_class` 에 따라 다른 안내**로 이어진다 — `CAPTURE` 는 재지정, `INFRA` 는 재시도

**Scenario 6: 앱을 닫아도 처리가 계속된다** *(T1 확정의 이득)*
- **Given**: 탐지 중 앱 종료
- **When**: 나중에 다시 엶
- **Then**: 🔴 **탐지가 완료돼 있거나 진행 중이다.** **구독이 끊긴 것과 처리가 멈춘 것은 다르다**

**Scenario 7 (실패): 폴링으로 대체하지 않는다**
- **Given**: Realtime 연동의 복잡성
- **When**: 대안을 검토함
- **Then**: 🔴 **폴링은 A-T1과 원가를 함께 악화시킨다.** 8분 × 사용자 수만큼의 함수 호출이 발생한다

## ⚙️ Technical & Non-Functional Constraints
- 🔴 **Realtime의 RLS 적용을 반드시 검증** — REST와 다른 경로다. **가정하지 말고 테스트로 확인한다**
- 🔴 **구독은 변경만 전달** — 초기 상태 조회가 짝으로 필요하다
- 🔺 **진행 비율의 산출 근거가 `[TBD]`** — `stage` 는 이산값인데 화면은 연속적 진행을 보여주고 싶어 한다. **가짜 진행률을 만들지 말고 단계 표시로 갈지 결정**한다
- 🔺 **동시 구독 수 상한** — Supabase 플랜 제약 확인 필요
- 이 태스크는 **상태를 만들지 않는다** — FR-011이 만든 것을 전달만 한다

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **Realtime 채널에 RLS가 적용됨을 테스트로 확인했는가?**
- [ ] 🔴 **재진입 시 초기 상태 조회가 함께 있는가?**
- [ ] 연결 끊김 후 재구독되는가?
- [ ] `failure_class` 가 전달되는가?
- [ ] 폴링 코드가 없는가?
- [ ] 🔺 **진행 비율 표시 방식이 결정되었는가?**
- [ ] TypeScript strict · ESLint 경고 0건인가?

## 🚧 Dependencies & Blockers
- **Depends on**: **FR-011**(상태 원천) · **CT-003**(RLS)
- **Blocks**: **FE-010**(처리 진행 UI) · **TS-007**
- 🔴 **보안 검증 대상**: **NF-007**(RLS 우회 테스트)이 Realtime 경로도 공격해야 한다
