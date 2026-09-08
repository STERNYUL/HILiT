# Hilit 추적 코어 — `appearance` · `motion` · `association`

`HILIT_추적PoC_기술기획서.md`(1,897줄)에서 **전사**한 TypeScript 인터페이스다.
PoC는 Python(`shared/config.py` 464줄 · `shared/schemas.py` 525줄)이며, 이
패키지는 그 자료구조·상수·판정 규칙을 옮긴 것이다.

> 🔺 **타입 표현은 전사자의 선택이다** — `Float32Array` · `ImageData` 같은
> 표현은 기획서에 없다. **상수·조건·구조는 전부 기획서 값**이며 각 항목에
> 출처 절 번호를 주석으로 달아 두었다.

## 파일

| 파일 | 담당 | PoC 대응 | 기획서 |
| --- | --- | --- | --- |
| `src/types.ts` | 공유 자료구조 · 상태 · Health 가중치 | `shared/schemas.py` | §4.5 · §3.2 |
| `src/appearance.ts` | Re-ID · 앵커 · 신원 거부권 | `mobile/reid/osnet_mobile` · `identity_memory` | §3.10 · §4.6.2 |
| `src/motion.ts` | 가림 예측 · 카메라 보정 · 궤적 보간 | `mobile/tracker/occlusion_memory` · `mobile/vision/camera_motion` | §3.6 · §3.7 · §4.6.10 |
| `src/association.ts` | 후보 병합 · 랭킹 · ID 전환 | `mobile/reid/candidate_ranking` | §3.8 · §4.6.5~4.6.7 |

## Health 7신호의 출처

세 모듈이 7신호 중 **6개**를 만든다. 나머지 하나(`tracker`)는 NanoTrack의
`getTrackingScore()`라 외부 입력이다.

| 신호 | 정규화 가중치 | 어디서 |
| --- | --- | --- |
| `reid` | 0.333 | `appearance.reidScore()` |
| `tracker` | 0.208 | 🔺 **외부** — NanoTrack |
| `motion` | 0.125 | `motion.motionScore()` |
| `box` | 0.083 | `motion.boxScore()` |
| `visibility` | 0.083 | `motion.visibilityScore()` |
| `occlusion` | 0.100 | `motion.occlusionScore()` |
| `ambiguity` | 0.067 | `association.ambiguityScore()` |

가중치 합이 **1.20**이라 `types.normalizeWeights()`로 정규화해서 쓴다.
합산을 우회하는 **거부권 2개**(`appearance.reidVeto()` · `types.updateTrackerTrend().dropped`)가
따로 있다 — 신원 증거가 가중 합산에 묻히면 안 되기 때문이다(§3.2 · §6.3).

🔺 `computeHealth()`(7신호 합산 + 거부권)는 PoC의
`mobile/confidence/tracking_health`에 해당하며 **이 패키지에 없다.**

## 모델 경계 — 교체해도 호출부는 안 바뀐다

추론이 필요한 두 지점만 Provider 인터페이스 뒤에 둔다.
CLAUDE.md의 *"실제 API로 교체할 때 호출부 코드 변경이 0건"* 규칙을 따른 것이다.

```ts
appearance.setEmbeddingProvider({ embed: (crop) => osnet(crop) });
motion.setOpticalFlowProvider({ sparseFlow: (a, b, n, s) => lk(a, b, n, s) });
```

미설정 상태에서 `appearance.embed()`는 던지고, `motion.estimateCameraMotion()`은
`NO_CAMERA_MOTION`(보정 없음)을 반환한다.

## 🔴 타입에 박아 둔 설계 판단 3건

기획서가 *"코드 수준에서 강제했다"* 고 명시한 것들이다.

1. **`Anchor.confirmedByUser: true`** — `boolean`이 아니라 리터럴. 사용자 확인
   외의 경로로는 앵커 객체를 만들 수 없다. Identity Poisoning 방지(§3.10)
2. **`ReidResult.measured: boolean`** — 측정값과 19프레임 전 재사용값을 구분한다.
   이 플래그 부재가 §6.4의 9프레임 감지 지연 원인이었다
3. **`AssociationOutcome`의 `ambiguous` 분기** — 애매함이 `reject`와 다른 갈래다.
   합치면 *"모르면 찍는다"* 로 퇴화한다(§3.8)

## 검증

```
npm run verify     # typecheck + test
npm run typecheck  # strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
npm test           # node:test — 의존성 0
```

**테스트 56건 / 4파일.** 기획서에 **수치로 검증된 것만** 단언한다.

| 테스트 | 기획서 근거 |
| --- | --- |
| IoU `0.528` · 포함률 `1.00` (P1/P3) | §6.6 — IoU 하나로는 중복을 못 잡는다 |
| 비대칭 EMA가 급락을 계속 잡음 / 대칭은 흡수 | §4.6.3 — `0.917 → 0.757` |
| `0.608 < 0.60 + 0.10` → 간격 20→5 | §6.4 — 감지가 9프레임 늦었던 사례 |
| Health 정규화 `0.333·0.208·0.125·0.083·0.083·0.100·0.067` | §3.2 가중치표 |
| N-Level 우회 7건 / 정상 1건 | §4.5.4 |
| 가림 30프레임 상한 · 감쇠 0.92 | §3.6 |
| 카메라 이동 **중앙값**(이상치 50 무시) | §3.7 |
| 수락 AND · 마진 `0.06` → `ambiguous` | §3.8 · §4.6.6 |
| 전환 3프레임 + 마진 `0.12` | §4.6.7 |

🔺 **§4.6.9 해상도 변환 3건은 여기에 없다** — `mobile/video/reframe` 소관이라
이 세 모듈 밖이다.
