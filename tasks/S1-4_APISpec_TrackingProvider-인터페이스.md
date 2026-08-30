---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[API Spec] S1-4: 외부 추론 TrackingProvider 인터페이스 정의"
labels: 'api-spec, contract, ai, priority:critical, wave-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[S1-4] 외부 추론 서비스 추상화 계층**
- 목적: **추론 API를 갈아 끼울 수 있는 인터페이스를 SP-1 전에 확정한다.** 이 인터페이스로 벤치마크 하니스를 짜면 **선정된 어댑터가 그대로 프로덕션 코드가 된다.**

> 🔴 **이것이 이 아키텍처의 유일한 실질 잠금이다.** 다른 외부 의존(Supabase·Vercel·Gemini)은 대체가 쉽지만, **추론 API는 API 스펙이 아니라 정확도 특성에 잠긴다** — 바꾸면 O9·오탐률이 달라져 **Gate A를 다시 통과해야 한다**.
>
> 🟢 **그리고 이 태스크는 SP-1 결과와 무관하게 지금 쓸 수 있다.** 후보가 정해지기 전에 인터페이스를 먼저 정하는 것이 순서상 맞다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **추상화 권고**: `plans/MVP-개발목표-적절성-종합-검토(난이도·가능성·효율성)-보고서.md` §2.3 — 🔴 **인터페이스 초안이 여기 있다**
- **후보 조사**: `실행 계획/04_SP-1_API후보조사.md` — 두 후보(AWS · Replicate)의 응답 형태 차이
- **벤치마크 항목**: `실행 계획/03_스파이크_실행계획.md` §1.3 — B1~B8
- **연동 시퀀스**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §7.4
- **요구사항**: `SRS/[SRS]hilit-SRSv1.8.md` REQ-FUNC-002 · 003 · 027 · REQ-NF-003
- 모델 교체 독립성: `SRS/[SRS]hilit-SRSv1.8.md` §1.5.2 ADR-2

## ✅ Task Breakdown (실행 계획)
- [ ] `lib/inference/types.ts` — **`TrackingProvider` 인터페이스** 정의
- [ ] 공통 결과 타입 정의 — `Interval` · `BBoxTimeline` · `Confidence`
- [ ] **요청 타입** — `videoUrl` · `anchor(bbox+frameMs)` · `callbackUrl` · **`resolution`** *(B8 대응)*
- [ ] **webhook 응답 파서 시그니처** — 후보마다 형태가 다르므로 어댑터가 정규화
- [ ] 🔴 **신뢰도 값의 의미를 타입으로 구분** — 아래 §신뢰도 참조
- [ ] 오류·타임아웃·재시도 정책 인터페이스
- [ ] `provider.ts` 팩토리 — 환경 변수로 구현체 선택 *(ADR-2의 "모델 갱신이 앱 배포에 종속되지 않는다")*
- [ ] **벤치마크 하니스가 쓸 수 있는 형태인지 검토** — SP-1이 이 타입으로 두 후보를 돌린다

### 인터페이스 초안

```ts
// lib/inference/types.ts
export interface TrackingProvider {
  readonly name: string;

  submit(input: {
    videoUrl: string;
    anchor: { frameMs: number; bbox: NormalizedBBox };
    callbackUrl: string;
    resolution?: 'original' | 'half' | 'quarter';   // B8
  }): Promise<{ inferenceId: string }>;

  parseWebhook(body: unknown): TrackingResult;
}

export interface TrackingResult {
  inferenceId: string;
  intervals: AppearanceInterval[];
  bboxTimeline: BBoxFrame[];
  /** 🔴 재식별 신뢰도. "이 사람이 지정 대상인가" — REQ-FUNC-027의 제외 판정 입력 */
  reidConfidence: number[] | null;   // null = 제공하지 않음 (B3 실패)
}
```

### 🔴 신뢰도 — 두 값을 같은 이름으로 쓰면 안 된다

| 값 | 뜻 | 쓰이는 곳 |
| --- | --- | --- |
| **`reidConfidence`** | *"이 사람이 **당신**인가"* | **REQ-FUNC-027 제외 판정** |
| *(Gemini 보조 경로)* `segmentScore` | *"이 구간이 **볼 만한가**"* | 후보 정렬 |

> **SP-2 설계에서 이미 지적된 혼동이다**(스파이크 계획 §2.3). **타입 이름과 주석으로 구분을 강제한다.**

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1: 후보 두 개가 같은 인터페이스로 호출된다**
- **Given**: AWS 어댑터와 Replicate 어댑터가 각각 주어짐
- **When**: 동일한 `submit()` 인자로 두 구현체를 호출함
- **Then**: 호출 코드에 분기가 없다. **어댑터 내부에서만 요청 형태가 달라진다**

**Scenario 2: 응답 형태가 달라도 결과 타입이 같다**
- **Given**: 두 후보가 서로 다른 webhook 페이로드를 보냄 *(마스크 vs bbox)*
- **When**: 각 어댑터의 `parseWebhook()` 을 호출함
- **Then**: 둘 다 동일한 `TrackingResult` 를 반환한다. 🔺 **마스크는 외접 사각형으로 변환해 `bboxTimeline` 을 채운다**

**Scenario 3: 신뢰도 미제공이 타입으로 드러난다** *(B3)*
- **Given**: 재식별 신뢰도를 반환하지 않는 후보가 주어짐
- **When**: `parseWebhook()` 을 호출함
- **Then**: `reidConfidence` 가 `null` 이다. 🔴 **호출부가 이 경우를 처리하도록 타입이 강제한다** — REQ-FUNC-027의 제외 로직이 성립하지 않음을 컴파일 시점에 알 수 있다

**Scenario 4: 해상도 선택이 인터페이스에 있다** *(B8)*
- **Given**: `resolution: 'half'` 요청이 주어짐
- **When**: `submit()` 을 호출함
- **Then**: 어댑터가 저해상도 입력을 전달한다. **B8(해상도별 탐지율) 측정이 같은 코드로 가능하다**

**Scenario 5: 환경 변수만으로 구현체가 바뀐다** *(ADR-2)*
- **Given**: `INFERENCE_PROVIDER=replicate` 가 설정됨
- **When**: 팩토리를 호출함
- **Then**: Replicate 구현체가 반환된다. **코드 변경·재배포 없이 값만 바꿔 교체된다**

**Scenario 6 (실패): 어댑터 없는 프로바이더 지정**
- **Given**: 등록되지 않은 프로바이더 이름이 주어짐
- **When**: 팩토리를 호출함
- **Then**: **기동 시점에** 명확한 오류로 실패한다. 런타임 첫 요청까지 지연되지 않는다

## ⚙️ Technical & Non-Functional Constraints
- **비동기 필수** — `submit()` 은 `inferenceId` 만 반환하고 결과는 webhook으로 온다 *(Vercel 함수 실행 시간 상한)*
- **좌표 정규화** — bbox는 0~1 정규화. 픽셀 좌표를 인터페이스에 노출하지 않는다
- 🔴 **얼굴 임베딩을 인터페이스에 두지 않는다** — DD-5(특징 벡터 미저장). **얼굴 대조 방식 후보를 채택하면 이 제약을 재검토해야 한다**
- **타임아웃** — `submit()` 은 동기 5초. webhook 미수신은 큐 재시도로 처리
- 🔺 **후보 미선정 상태** — 어댑터 구현은 이 태스크의 범위가 **아니다**. 인터페이스와 팩토리 골격까지

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **SP-1 벤치마크 하니스가 이 인터페이스로 두 후보를 돌릴 수 있는가?** *(설계 검토로 확인)*
- [ ] `reidConfidence` 와 구간 점수가 타입·주석으로 구분되었는가?
- [ ] B8(해상도 3단)이 인터페이스로 표현되었는가?
- [ ] 타입 테스트 — 잘못된 구현체가 컴파일 오류로 걸리는가?
- [ ] ESLint · TypeScript strict 경고가 없는가?
- [ ] 🔺 **`DS/[DS]hilit-DSv1.1.md` 에 이 인터페이스를 반영했는가?** *(현재 DS에 없다)*

## 🚧 Dependencies & Blockers
- **Depends on**: 없음 — 🟢 **S1-1·S1-3과 병렬 가능**
- **Blocks**: **SP-1 벤치마크 하니스** · S1-6(추론 결과 Mock) · Wave 7(어댑터 구현 2건)
- 🔴 **Blocked by (구현 단계)**: **SP-1 완료** — 어댑터 실제 구현은 후보 선정 후
- **참고**: 이 태스크가 늦어지면 **SP-1 하니스를 임시 코드로 짜게 되고, 그 코드는 버려진다**
