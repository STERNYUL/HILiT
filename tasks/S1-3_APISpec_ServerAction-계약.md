---
name: Feature Task
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[API Spec] S1-3: Server Action 시그니처 · Zod 스키마 · 오류 코드 정의"
labels: 'api-spec, contract, priority:critical, wave-1'
assignees: ''
---

## 🎯 Summary
- 기능명: **[S1-3] 서버 로직 계약 확정**
- 목적: **모든 상태 변경·조회의 함수 이름·인자·반환·오류를 코드로 고정한다.** 이후 17개 로직 태스크와 10개 테스트 태스크가 이 계약을 참조한다.

> 🔴 **이 스택에는 API Controller도 OpenAPI 문서도 없다.** Server Action은 함수이므로 **타입 정의 자체가 계약**이다. 그래서 이 태스크의 산출물은 문서가 아니라 **타입 파일**이다.

## 🔗 References (Spec & Context)
> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- **API 명세 23개**: `DS/[DS]hilit-DSv1.1.md` §3.2 — 요청·응답·오류·멱등성
- **공통 규약**: `DS/[DS]hilit-DSv1.1.md` §3.1 — 🔴 **인증·오류 형식·멱등성·속도 제한**
- **Server Action 배분**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §5.1 — 무엇이 Action이고 무엇이 Route Handler인가
- **공통 규약(스택)**: `SRS/[SRS]hilit-SRSv2.0-nextjs.md` §5.2
- **엔드포인트 목록**: `SRS/[SRS]hilit-SRSv1.8.md` §6.1
- **비즈니스 규칙**: `SRS/[SRS]hilit-SRSv1.8.md` §6.3
- 시퀀스: `SRS/[SRS]hilit-SRSv1.8.md` §3.5 · §6.4

## ✅ Task Breakdown (실행 계획)
- [ ] `lib/contracts/` 디렉터리 구성 — 도메인별 파일 분리
- [ ] **Zod 입력 스키마 작성** — 상태 변경 Action 전량
- [ ] **반환 타입 정의** — 🔴 예외를 던지지 않고 `{ok:true, data} | {ok:false, code, message}` 판별 유니온
- [ ] **오류 코드 열거형** — DS §3.1.2의 상태 코드 대응표를 코드로
- [ ] 🔴 **권한 없음은 `404` 계열로 통일** — `403`을 쓰지 않는다 (아래 참조)
- [ ] `Idempotency-Key` 를 받는 Action 식별 및 인자 추가
- [ ] Route Handler 계약 별도 정의 — webhook 2종 *(수신 규격은 S1-5)*
- [ ] 타입 전용 export barrel 구성 — 클라이언트에서 서버 코드가 딸려오지 않게

### 정의할 Server Action 목록 *(SRS v2.2 §5.1)*

| 도메인 | Action | 멱등 |
| --- | --- | :--: |
| 업로드 | `createUpload(meta)` | ✅ |
| 추적 | `anchorSubject(videoId, frameMs, bbox)` · `requestDetection(videoId)` | ✅ |
| 편집 | `confirmSelection(videoId, candidateIds, musicId?)` · `registerRendered(draftId, path)` | ✅ |
| 기록 | `setVisibility(recordId, scope, groupIds?)` | 자연 멱등 |
| 그룹 | `createGroup` · `inviteMember` · `leaveGroup` | ✅ |
| 관계 | `follow(followeeId)` · `unfollow(followeeId)` | ✅ |
| 반응 | `react(recordId, type, text?)` · `report(reactionId, reason)` | ✅ |
| 공유 | `issueShareLink(recordId)` | ✅ |

### 조회는 RSC 직접 조회 *(Action 아님)*

`getCandidates` · `getRecords` · `getProfile` · `getGroupMembers` · `getFeed` — **타입만 정의하고 구현은 Wave 3**

## 🧪 Acceptance Criteria (BDD/GWT)

**Scenario 1: 권한 없는 자원 접근이 존재를 노출하지 않는다** *(REQ-NF-009)*
- **Given**: 타인의 비공개 기록 ID가 주어짐
- **When**: 해당 기록을 조회·변경하는 Action을 호출함
- **Then**: `403`이 아니라 **`404` 계열 코드**를 반환한다. 🔴 **`403`은 *"그 자원은 있는데 당신은 못 본다"* 를 알려주므로 REQ-NF-009 위반이다**

**Scenario 2: 오류가 예외가 아니라 값으로 전달된다**
- **Given**: 검증에 실패하는 입력이 주어짐
- **When**: Server Action을 호출함
- **Then**: 예외를 던지지 않고 `{ok:false, code:'…', message:'…'}` 를 반환한다. 클라이언트가 `ok` 로 분기할 수 있다

**Scenario 3: 동일 멱등 키의 재요청이 최초 응답을 재생한다**
- **Given**: 이미 처리된 `Idempotency-Key` 가 주어짐
- **When**: 같은 키로 동일 Action을 재호출함
- **Then**: 새 자원을 만들지 않고 **최초 응답을 그대로 반환**한다 (24시간 이내)

**Scenario 4: 미지원 코덱이 업로드 개시 전에 걸러진다** *(SC-1.F1)*
- **Given**: 지원 목록에 없는 코덱 메타가 주어짐
- **When**: `createUpload(meta)` 를 호출함
- **Then**: `CODEC_UNSUPPORTED` 를 반환하고 **Signed URL을 발급하지 않는다.** 🔴 **바이트가 한 번도 전송되지 않아야 한다**

**Scenario 5: 입력 검증이 Action 첫 줄에서 일어난다**
- **Given**: 타입은 맞으나 범위를 벗어난 입력이 주어짐 (예: 정규화 bbox가 0~1 밖)
- **When**: Action을 호출함
- **Then**: Zod 파싱 단계에서 `VALIDATION_FAILED` 를 반환하고 **DB에 도달하지 않는다**

**Scenario 6 (실패): 타입 정의가 클라이언트 번들에 서버 코드를 끌고 오지 않는다**
- **Given**: 클라이언트 컴포넌트가 계약 타입을 import 함
- **When**: 프로덕션 빌드를 수행함
- **Then**: 번들에 Prisma·서버 전용 모듈이 포함되지 않는다 — `import type` 경계가 지켜진다

## ⚙️ Technical & Non-Functional Constraints
- **검증**: Zod — Server Action **첫 줄에서 파싱**
- **오류 형식**: `{ error: { code, message, detail?, traceId } }` *(DS §3.1.2)*
- **상태 코드 대응**: `400` 검증 · `401` 미인증 · **`404` 없음 또는 권한 없음** · `409` 상태 충돌 · `413` 크기 초과 · `415` 코덱 · `429` 속도 제한 · `503` 큐 포화
- **인증**: Supabase Auth 세션 → `auth.uid()`
- **속도 제한**: 분당 60건 · **업로드 개시는 분당 3건** `[PROPOSED]`
- 🔺 **속도 제한 구현 방식 미확정** — 미들웨어 vs DB 카운터 *(DS §9-3)*

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 🔴 **DS §3.2의 23개 엔드포인트가 전부 타입으로 존재하는가?** *(누락 0건)*
- [ ] 오류 코드가 열거형으로 정의되고 문자열 리터럴이 흩어져 있지 않은가?
- [ ] 타입 테스트가 추가되었는가? *(잘못된 인자가 컴파일 오류로 걸리는지)*
- [ ] 🔺 **`DS/[DS]hilit-DSv1.1.md` §3.2와 시그니처가 일치하는가?** *(불일치 시 DS를 갱신)*
- [ ] ESLint · TypeScript strict 경고가 없는가?
- [ ] 🔺 **`403`을 반환하는 경로가 하나도 없는가?**

## 🚧 Dependencies & Blockers
- **Depends on**: **S1-1**(스키마) — 엔티티 타입을 참조한다
- **Blocks**: S1-5(webhook 계약) · S1-6·S1-7(Mock) · Step 2 전량(17건)
- **참고**: S1-4(Provider 인터페이스)와 **무관** — 병렬 가능
- 🔺 **미결**: 속도 제한 구현 방식 *(DS §9-3)* — 이 태스크에서는 **인터페이스만** 정하고 구현은 Wave 5
