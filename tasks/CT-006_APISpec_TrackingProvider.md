---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[API Spec] CT-006: TrackingProvider 인터페이스 · 팩토리 · 타입 가드"
labels: 'api-spec, contract, ai, priority:critical, step-1, wave-1'
assignees: ''
---

> 🔧 **v2 개정 (2026-08-30)** — 실행 명세로 구체화. 파일 경로 · 타입 정의 · 검증 방법을 확정했다.

## 🎯 Summary
- 기능명: **[CT-006] 외부 추론 서비스 추상화 계층**
- 목적: **추론 API를 갈아 끼울 수 있는 인터페이스를 SP-1 전에 확정한다.** 이 인터페이스로 벤치마크 하니스를 짜면 **선정된 어댑터가 그대로 프로덕션 코드가 된다.**

> 🔴 **이것이 이 아키텍처의 유일한 실질 잠금이다.** 다른 외부 의존(Supabase·Vercel·Gemini)은 대체가 쉽지만, **추론 API는 API 스펙이 아니라 정확도 특성에 잠긴다** — 바꾸면 O9·오탐률이 달라져 **Gate A를 다시 통과해야 한다**.
>
> 🟢 **그리고 이 태스크는 SP-1 결과와 무관하게 지금 쓸 수 있다.** 후보가 정해지기 전에 인터페이스를 먼저 정하는 것이 순서상 맞다.

### 🔴 이 태스크가 끊는 사슬

```
CT-006 없음 → CT-007 Mock 못 만듦
            → 프론트가 SP-1 완료를 기다림
            → SP-1은 정답셋 10~15편이 선행
            → 정답셋은 실제 농구 영상 수급이 선행
```

**M 규모의 타입 정의 하나가 프론트 전체를 영상 수급 대기에서 풀어낸다.**

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.

| 문서 | 절 | 내용 |
| --- | --- | --- |
| `SRS/[SRS]hilit-SRSv2.0-nextjs.md` | **§7.4** | 🔴 **T1 확정 연동 시퀀스 — `submit` → 202 → webhook** |
| `SRS/[SRS]hilit-SRSv2.0-nextjs.md` | **§7.3** | 🔴 **신뢰도 이름 충돌 경고 — 두 값을 같은 이름으로 쓰면 요구가 조용히 바뀐다** |
| `SRS/[SRS]hilit-SRSv2.0-nextjs.md` | §1.5.2 | 파생 전제 **A-T1**(함수 실행 시간) · **A-T4**(GPU 직접 사용 불가) |
| `SRS/[SRS]hilit-SRSv1.8.md` | REQ-FUNC-002·003·027 | 1회 지정 · 탐지율 · 저신뢰 제외 |
| `SRS/[SRS]hilit-SRSv1.8.md` | §1.5.2 **ADR-2** | 모델 갱신이 앱 배포에 종속되지 않는다 |
| `실행 계획/04_SP-1_API후보조사.md` | §2 · §5-1 | 🔴 **후보별 응답 형태 차이 — 마스크 vs bbox** |
| `실행 계획/03_스파이크_실행계획.md` | §1.3 | 벤치마크 항목 **B1~B8** *(B3 신뢰도 제공 · B8 해상도)* |
| `DS/[DS]hilit-DSv1.1.md` | §4.2 PersonTrack | `anchor_bbox` 정규화 0~1 · 🔴 **DD-5 특징 벡터 미저장** |

## ✅ Task Breakdown (실행 계획)

### 1. 타입 정의 — `lib/inference/types.ts`
- [ ] `NormalizedBBox` · `BBoxFrame` · `DetectedInterval` 기본 타입
- [ ] `TrackingProvider` 인터페이스
- [ ] `TrackingResult` 결과 타입 — 🔴 **`reidConfidence: number[] | null`**
- [ ] `SubmitInput` · `SubmitResult` · `InferenceError` 보조 타입
- [ ] 🔴 **JSDoc으로 신뢰도 의미를 명시** — 아래 §신뢰도 참조

### 2. 팩토리 — `lib/inference/provider.ts`
- [ ] `PROVIDERS` 레지스트리 (`Record<string, () => TrackingProvider>`)
- [ ] `getTrackingProvider()` — `process.env.INFERENCE_PROVIDER` 로 선택
- [ ] 🔴 **미등록 프로바이더는 모듈 로드 시점에 throw** — 첫 요청까지 지연되지 않게

### 3. 런타임 검증 — `lib/inference/schema.ts`
- [ ] `TrackingResultSchema` — Zod. `parseWebhook()` 구현체가 반환값을 이 스키마로 검증
- [ ] 🔴 **`bbox` 값이 0~1 범위인지 Zod에서 강제** — 픽셀 좌표 혼입 차단
- [ ] 🔴 **`intervals[].startMs < endMs` refine** — CT-001의 `chk_ai_range` 와 같은 불변식을 경계에서도 막는다

### 4. 골격 구현체 — `lib/inference/providers/`
- [ ] `mock.ts` — 🔺 **선언만.** 픽스처 본체는 CT-007 소관
- [ ] 🔴 **실제 어댑터(AWS·Replicate)는 이 태스크의 범위가 아니다** — FR-008이 SP-1 선정 후 구현

### 5. 타입 테스트 — `lib/inference/types.test-d.ts`
- [ ] `expectTypeOf` 또는 `@ts-expect-error` 로 **불완전 구현이 컴파일 오류인지** 검증
- [ ] `reidConfidence` 를 `null` 체크 없이 인덱싱하면 오류인지 검증

### 6. 문서 반영
- [ ] 🔺 **`DS/[DS]hilit-DSv1.1.md` §3에 이 인터페이스를 추가** — 현재 DS에 없다

### 인터페이스 — 확정안

```ts
// lib/inference/types.ts

/** 정규화 좌표. 🔴 픽셀 좌표를 이 경계에 노출하지 않는다 (B8 해상도 실험 전제) */
export interface NormalizedBBox {
  x: number; y: number; w: number; h: number;   // 각 0~1
}

export interface BBoxFrame {
  frameMs: number;
  bbox: NormalizedBBox | null;                  // null = 해당 프레임에 대상 미검출
}

export interface DetectedInterval {
  startMs: number;
  endMs: number;                                // 🔴 startMs < endMs
}

export interface SubmitInput {
  videoUrl: string;                             // Storage 읽기용 Signed URL
  anchor: { frameMs: number; bbox: NormalizedBBox };
  callbackUrl: string;                          // POST /api/webhooks/inference
  /** B8 — 해상도별 탐지율 실험. 코드 변경 없이 전송량을 조절한다 */
  resolution?: 'original' | 'half' | 'quarter';
}

export interface TrackingProvider {
  readonly name: string;

  /** 🔴 즉시 반환한다. 결과를 기다리지 않는다 (A-T1) */
  submit(input: SubmitInput): Promise<{ inferenceId: string }>;

  /** 공급자별 페이로드를 공통 형태로 정규화한다 */
  parseWebhook(body: unknown): TrackingResult;
}

export interface TrackingResult {
  inferenceId: string;
  intervals: DetectedInterval[];
  bboxTimeline: BBoxFrame[];

  /**
   * 🔴 재식별 신뢰도 — "이 사람이 지정한 그 대상인가"
   *    REQ-FUNC-027의 제외 판정 입력이며, intervals 와 같은 길이·순서다.
   *
   * 🔴 null = 공급자가 이 값을 제공하지 않는다 (B3 실패).
   *    이때 FR-009는 제외를 수행하지 않고 그 사실을 표면화해야 한다.
   *    🔴 0으로 채우면 전량 제외, 1로 채우면 전량 통과 — 둘 다 틀리다.
   *
   * ⚠️ Gemini 보조 경로의 semanticScore("이 구간이 볼 만한가")와 다른 값이다.
   *    두 값을 같은 필드에 담으면 요구사항이 조용히 바뀐다 (v2.2 §7.3).
   */
  reidConfidence: number[] | null;
}
```

```ts
// lib/inference/provider.ts
import type { TrackingProvider } from './types';

const PROVIDERS: Record<string, () => TrackingProvider> = {
  mock: () => require('./providers/mock').mockProvider,
  // aws / replicate — 🔴 FR-008이 SP-1 선정 후 등록한다
};

export function getTrackingProvider(): TrackingProvider {
  const key = process.env.INFERENCE_PROVIDER ?? 'mock';
  const factory = PROVIDERS[key];
  // 🔴 기동 시점 실패. 첫 요청까지 지연되지 않는다
  if (!factory) {
    throw new Error(
      `[inference] 등록되지 않은 프로바이더: "${key}". 사용 가능: ${Object.keys(PROVIDERS).join(', ')}`,
    );
  }
  return factory();
}
```

### 🔴 신뢰도 — 두 값을 같은 이름으로 쓰면 안 된다

| 값 | 뜻 | 쓰이는 곳 | 타입 위치 |
| --- | --- | --- | --- |
| **`reidConfidence`** | *"이 사람이 **당신**인가"* | **REQ-FUNC-027 제외 판정** | `TrackingResult` |
| `semanticScore` | *"이 구간이 **볼 만한가**"* | 후보 정렬 | Gemini 보조 경로(FR-012 §C) |

> **v2.2 §7.3이 명시적으로 경고한 지점이다.** 타입 이름과 JSDoc으로 구분을 강제한다.

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1 (정상): 후보 두 개가 같은 인터페이스로 호출된다**
- **Given**: 서로 다른 두 구현체 *(마스크 반환 · bbox 반환)*
- **When**: 동일한 `SubmitInput` 으로 `submit()` 을 호출함
- **Then**: 호출 코드에 분기가 없다. **어댑터 내부에서만 요청 형태가 달라진다**

**Scenario 2 (정상): 응답 형태가 달라도 결과 타입이 같다**
- **Given**: 두 공급자의 서로 다른 webhook 페이로드
- **When**: 각 어댑터의 `parseWebhook()` 을 호출함
- **Then**: 둘 다 동일한 `TrackingResult` 를 반환한다. 🔺 **마스크는 외접 사각형으로 변환해 `bboxTimeline` 을 채운다**

**Scenario 3 (정상): 해상도 선택이 인터페이스에 있다** *(B8)*
- **Given**: `resolution: 'half'`
- **When**: `submit()` 을 호출함
- **Then**: 어댑터가 저해상도 입력을 전달한다. **B8 측정이 같은 코드로 반복 가능하다**

**Scenario 4 (정상): 환경 변수만으로 구현체가 바뀐다** *(ADR-2)*
- **Given**: `INFERENCE_PROVIDER=mock`
- **When**: `getTrackingProvider()` 를 호출함
- **Then**: Mock 구현체가 반환된다. **코드 변경·재배포 없이 값만 바꿔 교체된다**

**Scenario 5 (예외): 신뢰도 미제공이 타입으로 드러난다** *(B3)*
- **Given**: `reidConfidence: null` 을 반환하는 구현체
- **When**: 호출부가 `result.reidConfidence[0]` 처럼 **null 체크 없이** 접근하는 코드를 작성함
- **Then**: 🔴 **TypeScript strict가 컴파일 오류로 막는다.** REQ-FUNC-027의 제외 로직이 성립하지 않는 경우를 **개발자가 반드시 다루게 된다**

**Scenario 6 (예외): 픽셀 좌표가 경계를 통과하지 못한다**
- **Given**: `bbox: { x: 640, y: 360, w: 100, h: 200 }` *(픽셀 좌표)*
- **When**: `TrackingResultSchema.parse()` 를 실행함
- **Then**: 🔴 **Zod가 거부한다.** 0~1 범위 밖이므로 **B8 해상도 실험을 깨뜨리기 전에 막힌다**

**Scenario 7 (예외): 뒤집힌 구간이 거부된다**
- **Given**: `{ startMs: 5000, endMs: 3000 }`
- **When**: `TrackingResultSchema.parse()` 를 실행함
- **Then**: refine 위반으로 거부된다. **CT-001의 `chk_ai_range` 에 도달하기 전에 경계에서 걸린다**

**Scenario 8 (예외): 어댑터 없는 프로바이더 지정**
- **Given**: `INFERENCE_PROVIDER=nonexistent`
- **When**: `getTrackingProvider()` 를 호출함
- **Then**: 🔴 **사용 가능한 목록을 담은 명확한 오류로 즉시 실패한다.** 런타임 첫 요청까지 지연되지 않는다

**Scenario 9 (예외): 불완전 구현이 컴파일에서 걸린다**
- **Given**: `parseWebhook` 을 빠뜨린 객체를 `TrackingProvider` 로 선언함
- **When**: `tsc --noEmit` 을 실행함
- **Then**: 타입 오류가 발생한다 *(`types.test-d.ts` 가 이를 고정한다)*

## ⚙️ Technical & Non-Functional Constraints

### 아키텍처
- 🔴 **비동기 필수** — `submit()` 은 `inferenceId` 만 반환하고 결과는 webhook으로 온다. **A-T1(함수 실행 시간 상한) 때문에 동기 대기는 구조적으로 불가능하다**
- 🔴 **좌표는 정규화 0~1** — 픽셀 좌표를 인터페이스에 노출하지 않는다. **노출하면 B8(해상도별 탐지율) 실험이 불가능해진다**
- **타임아웃** — `submit()` 동기 구간 **5초** `[PROPOSED]`. webhook 미수신은 FR-011의 재시도로 처리

### 보안 · 개인정보
- 🔴 **얼굴 임베딩을 인터페이스에 두지 않는다** — DD-5(특징 벡터 미저장). **얼굴 대조 방식 후보를 채택하면 이 제약과 NF-017의 범위를 함께 재검토해야 한다**
- 🔴 **`videoUrl` 은 만료가 있는 Signed URL** — 인터페이스가 영구 URL을 전제하지 않는다. 만료는 추론 상한보다 길게(FR-005 소관)
- **`callbackUrl` 검증은 수신 측 책임** — 서명 검증은 CT-004의 webhook 계약에 있다

### 유지보수
- 🔴 **이 계약을 FR-008이 변경하지 않는다** — 계약이 흔들리면 CT-007 Mock과 FR-005가 함께 깨지고 **다음 공급자로 갈아탈 수 없게 된다**
- 🔺 **어댑터 구현은 범위 밖** — 인터페이스 · 팩토리 · Zod 스키마 · 타입 테스트까지다
- 🔺 **`name` 필드는 계측용** — `detection_started` 이벤트에 공급자를 남겨 NF-006(원가 추적)이 공급자별로 집계할 수 있게 한다

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria(9건)를 충족하는가?
- [ ] 🔴 **`reidConfidence` 가 `number[] | null` 이고, null 미처리가 컴파일 오류인가?** *(Scenario 5)*
- [ ] 🔴 **JSDoc에 `semanticScore` 와의 구분이 명시되었는가?**
- [ ] 🔴 **Zod가 픽셀 좌표와 뒤집힌 구간을 거부하는가?** *(Scenario 6·7)*
- [ ] B8(해상도 3단)이 `SubmitInput` 으로 표현되었는가?
- [ ] 미등록 프로바이더가 **기동 시점에** 실패하는가?
- [ ] 🔴 **SP-1 벤치마크 하니스가 이 인터페이스로 후보를 돌릴 수 있는가?** *(설계 검토로 확인)*
- [ ] `types.test-d.ts` 가 불완전 구현을 잡는가?
- [ ] 🔺 **`DS/[DS]hilit-DSv1.1.md` §3에 인터페이스를 반영했는가?** *(현재 DS에 없다)*
- [ ] `tsc --noEmit` · ESLint 경고 0건인가?

## 🚧 Dependencies & Blockers
- **Depends on**: 없음 — 🟢 **CT-001과 병렬 가능** *(파일도 담당도 겹치지 않는다)*
- **Blocks**: **CT-004**(webhook 결과 타입) · **CT-007**(Mock) · **FR-005** · **SP-1 벤치마크 하니스**
- 🔴 **Blocked by (구현 단계만)**: **SP-1 완료** — 실제 어댑터는 FR-008
- **참고**: 이 태스크가 늦어지면 **SP-1 하니스를 임시 코드로 짜게 되고, 그 코드는 버려진다**
