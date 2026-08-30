# 작업 로그 — FE-001 앱 셸 + CT-007 Mock 통합

**브랜치** `feat/fe-001-app-shell` · **시작 커밋** `fd41366` · **기간** 2026-08-30 ~ 08-31
**활성 범위** FE-001(앱 셸) · UX-001(설계 근거) · CT-007 Mock(피드 계층)

---

## 1. 목표와 결과

| | |
| --- | --- |
| 목표 | UX/UI를 먼저 설계·구현하고, 검증된 UI를 CT-007 Mock에 통합한다 |
| STATUS | **COMPLETE** |
| STOP REASON | **INTEGRATION_COMPLETE** |
| UX/UI | **COMPLETE** |
| INTEGRATION | **COMPLETE** |
| VERIFICATION | **PASS** (lint · typecheck · test 30 · build) |

---

## 2. 카운터

| 카운터 | 값 |
| --- | ---: |
| `UX_UI_IMPLEMENTATION_TURN` | 2 |
| `UI_VERIFY_TURN` | 2 |
| `INTEGRATION_TURN` | 2 |
| **`TOTAL_TURN`** | **6** / 20 |
| `TEST_FAILURE_COUNT` | **2** / 3 |
| `BLOCKED_COUNT` | 0 |
| 반복 수정 | 1 (ESLint 설정 2회) / 3 |

---

## 3. 변경 파일

### 신규 — 구현
| 파일 | 역할 |
| --- | --- |
| `src/components/AppShell.tsx` | 앱 셸. 🔴 **데이터를 가져오지 않는다** — 받아서 그린다 |
| `src/components/BottomNav.tsx` | 3탭 + 가운데 `+`. `+` 는 `role="tab"` 없음 |
| `src/components/FeedViewport.tsx` | 정상 / 로딩 / 빈 상태 / 오류 4종 |
| `src/components/SoundToggle.tsx` | 음소거를 상태로 제시 |
| `src/components/FeedContainer.tsx` | 🔗 **통합 계층** — Mock ↔ 셸 |
| `src/lib/mock/feed.ts` | CT-007 피드 픽스처 6종 |
| `src/lib/telemetry/events.ts` | 계측 5종 |
| `src/lib/format.ts` | 재생 시간 표기 |
| `src/app/page.tsx` | RSC 첫 조회 |
| `src/app/layout.tsx` · `globals.css` | 셸 토큰 |

### 신규 — 검증
| 파일 | 건수 |
| --- | ---: |
| `tests/app-shell.test.tsx` | 20 |
| `tests/feed-integration.test.tsx` | 10 |

### 신규 — 설정
`package.json` · `tsconfig.json` · `next.config.ts` · `eslint.config.mjs` · `postcss.config.mjs` · `vitest.config.ts`

---

## 4. 의사결정

### DECISION-1 — 첫 제스처 "계측"과 "음소거 해제"를 분리
- **문제**: `handleToggleSound` 가 `activateSoundOnFirstGesture`(→ `setMuted(false)`)와 `setMuted(prev => !prev)` 를 같은 핸들러에서 호출. React 배치 처리로 두 번째 함수형 업데이트의 `prev` 가 이미 `false` 라 🔴 **"소리 켜기" 첫 클릭이 오히려 음소거로 되돌아갔다.**
- **선택**: 첫 제스처는 계측만, 음소거 전환은 `setMuted` 가 단독 책임
- **선택 이유**: 테스트를 현재 동작에 맞추면 REQ-FUNC-011을 코드가 아니라 테스트로 후퇴시키는 것이다. 그리고 **명시적 토글은 사용자의 지시이고 자동 활성은 정책 우회**라 의미가 다르다 — 한 함수가 둘을 겸하면 안 된다.
- **검증**: `소리 켜기 버튼의 첫 클릭이 실제로 소리를 켠다` + `first_unmute 세션당 1회` 통과

### DECISION-2 — 데이터 조회를 이펙트에서 RSC로
- **문제**: `useEffect` 안에서 피드를 조회하며 `setStatus('loading')` 동기 호출 → `react-hooks/set-state-in-effect` 위반
- **선택**: `AppShell` 을 프롭 주도로, 조회는 `page.tsx`(RSC)
- **선택 이유**: 억제는 오류 은폐라 템플릿 금지 사항이다. **v2.2 §5.1이 "조회는 RSC 직접 조회"를 이미 정해 뒀고**, 이 구조가 템플릿의 PHASE 경계와 정확히 맞는다 — PHASE 2는 셸이 상태를 그리는지, PHASE 3은 RSC가 데이터를 물리는지. 덤으로 첫 프레임이 서버 렌더가 되어 REQ-NF-001에 유리하다.
- **검증**: lint 0 errors · `RSC가 넘긴 initialPage 가 첫 렌더에 반영된다`(로딩 미경유) 통과

### DECISION-3 — 🔴 REQ-NF-001 측정 기준 정정
- **문제**: 요구는 *"앱 실행부터 첫 영상 프레임까지"* 인데 **컴포넌트 마운트 기준**으로 재고 있었다. 마운트는 페이지 로드보다 늦으므로 **실제보다 짧게 나온다.**
- **선택**: `performance.now()`(페이지 로드 기준)로 교체, 필드명 `msSinceMount` → `msSinceLoad`
- **영향 범위**: 🔺 이 값이 **p95 ≤ 1.5초 판정의 입력**이다. 기준이 틀리면 게이트를 통과한 것처럼 보인다.
- **검증**: `shell_ready 는 페이지 로드 기준으로 측정된다` 통과

### DECISION-4 — 탭 재조회를 라우트가 아니라 클라이언트 컨테이너로
- **문제**: App Router 관용 방식은 라우트 세그먼트 + `Link` 로 RSC 재조회를 트리거하는 것이다
- **선택**: `FeedContainer`(클라이언트) + `useTransition`
- **선택 이유**: 🔴 **라우트 방식은 REQ-FUNC-011의 "소리 활성을 세션 내 유지"를 깨뜨린다.** `AppShell` 이 페이지라 내비게이션마다 언마운트되어 `muted` 가 `true` 로 되돌아간다. 살리려면 사운드 상태를 `layout` 으로 올려야 하는데 그건 활성 범위를 넘는 아키텍처 변경이다.
- **대안**: FR-026이 Server Action으로 오면 재검토한다. 그때 사운드 상태를 `layout` 으로 올리는 변경을 함께 승인받아야 한다.
- **검증**: `탭을 옮겨도 소리 설정이 유지된다` 통과 — 라우트 방식이었다면 여기서 실패한다

### DECISION-5 — ESLint 평면 설정으로 이관
- **문제**: `next lint` 가 Next 16에서 제거됨. `FlatCompat` 경유는 `eslint-config-next` 와 순환 참조 오류
- **선택**: `eslint-config-next/core-web-vitals` · `/typescript` 를 평면 설정으로 직접 import
- **영향 범위**: `eslint.config.mjs` · `package.json` `lint` 스크립트

---

## 5. 검증 결과

```
VERIFICATION
- lint:      PASS  (0 errors, 0 warnings)
- typecheck: PASS
- test:      PASS  (30/30)
- build:     PASS
```

### UX-001 산출물 9항목 대응

| # | 산출물 | 구현 | 검증 |
| :--: | --- | --- | :--: |
| 1 | 3탭 + 가운데 `+` | `BottomNav` | ✅ |
| 2 | 로그인 화면 없는 진입 재생 | `page.tsx` · `AppShell` | ✅ |
| 3 | 음소거 표시 (결함 아닌 상태) | `SoundToggle` | ✅ |
| 4 | 첫 조작 → 소리 켜짐 피드백 | `markFirstGesture` + 토스트 | ✅ |
| 5 | 빈 피드 대체 상태 | `fallback-notice` | ✅ |
| 6 | 로딩 상태 (흰 화면 금지) | 스켈레톤 | ✅ |
| 7 | 탭 전환·활성 표시 | `aria-selected` + 밑줄 | ✅ |
| 8 | `+` 의 위계 | `role="tab"` 없음 · 돌출 배치 | ✅ |
| 9 | 계측 훅 위치 | `first_unmute{trigger}` | ✅ |

### 템플릿 A-5 상태 6종

정상 ✅ · Loading ✅ · Empty ✅ · Error ✅ · 사용자 입력 ✅ · 성공·실패 피드백 ✅

---

## 6. 남은 이슈

| # | 항목 | 성격 |
| :--: | --- | --- |
| 1 | 🔺 **미디어 파일이 없다** — 포스터가 색 플레이스홀더다. `<video>` 의 `muted`·`autoPlay`·`playsInline` DOM 계약만 검증했고 **실제 재생은 검증하지 못했다** | 자산 수급 |
| 2 | 🔺 **실기기 검증 미수행** — 자동재생 정책은 브라우저·OS마다 다르다. jsdom으로는 확인 불가 | 디바이스 테스트 |
| 3 | 🔺 **REQ-NF-001 p95 ≤ 1.5초 미측정** — 계측 훅만 심었다. 판정은 NF-001(계측 하니스) 소관 | NF-001 |
| 4 | 🔴 **Q17 미결** — 첫 조작 범위를 "탭 + 스크롤" 둘 다로 잡았으나 근거가 없다. 무음 소비 비율 실측 후 재검토 | 제품 결정 |
| 5 | 🔺 **`+` 가 편집 플로우로 가지 않는다** — 토스트만 띄운다. UX-002 · FE-002 범위 | 다음 단계 |
| 6 | 🔴 **CT-001 스키마 보류** — 템플릿이 DB schema 변경에 승인을 요구해 중단. Prisma는 설치만 됨 | 승인 대기 |
| 7 | 🔺 **프로젝트 초기 설정 태스크가 54건에 없다** — CT-001 §1이 `prisma init` 을 포함하나 `package.json` 생성 주체가 없다 | 리스트 반영 |

---

## 7. 통합 계약 — FR-026 교체 지점

```
page.tsx (RSC)          → getFeedMock('following')
FeedContainer (client)  → getFeedMock(tab, options)
```

🔴 **두 곳의 import 한 줄만 바뀐다.** 시그니처가 같아야 하며, 그것이 CT-007의 인수 기준
(*"실제 API 교체 시 프론트·서버 코드 변경 0건"*)이다.
