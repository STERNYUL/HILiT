# Software Requirements Specification (SRS) — 기술 제약 반영판

**Document ID:** SRS-HILIT-NEXTJS-001

**version:** 2.2

**Date:** 2026-08-30

**Standard:** ISO/IEC/IEEE 29148:2018

**성격:** `[SRS]hilit-SRSv1.8.md`와 **병렬 문서**. 기존 SRS를 대체하지 않는다.

---

## 이 문서의 위치

| 문서 | 전제 | 답하는 것 |
| --- | --- | --- |
| `[SRS]hilit-SRSv1.8.md` | **기술 중립** | 무엇을 만족해야 하는가 |
| **이 문서 (v2.0)** | **C-TEC-001~007 고정** | **그 제약 안에서 무엇을 만들 수 있는가** |

**두 문서는 요구사항 ID를 공유한다.** v1.5의 `REQ-FUNC-nnn`·`REQ-NF-nnn`을 그대로 인용하고, 이 문서는 **각 요구사항이 지정된 스택에서 구현 가능한지를 판정**한다.

> ### 🔴 먼저 읽어야 할 결론
>
> **지정된 스택은 이 제품의 소비·기록 계층을 잘 지원하지만, 트래킹 계층은 지원하지 못한다.**
>
> MVP 요구사항 45건 중 **✅ 32건은 그대로 구현 가능**하고, **🟡 8건은 설계를 바꾸면 가능**하며, **🔴 5건은 이 스택만으로는 불가능**하다. 불가능한 5건이 **하필 제품의 차별점 D1**(REQ-FUNC-002 · 003 · 006 · 027 · REQ-NF-003)이다.
>
> **§2가 이 문서의 핵심이다.** 무엇이 왜 막히는지와 선택지 3개를 거기에 정리했다.

---

# 1. Introduction

## 1.1 Purpose

**Next.js 단일 풀스택 프레임워크 · Vercel 배포 · Supabase · Gemini API** 제약 하에서, HILiT MVP의 요구사항 중 **구현 가능한 범위와 그 설계**를 정의한다.

## 1.2 Scope

### 1.2.1 In-Scope

이 문서는 v1.5의 요구사항을 **재작성하지 않고 판정한다.** 판정 결과 ✅·🟡인 요구사항의 **구현 설계**를 §3~§7에 담는다.

### 1.2.2 Out-of-Scope

- 요구사항의 신규 정의 — v1.5 소관
- 제품 가치·시장 판단 — VPS 0.3 소관
- 🔴 판정 요구사항의 **대체 구현** — §2.4의 선택지 결정 후 별도 문서

## 1.3 Definitions

| 용어 | 정의 |
| --- | --- |
| **Server Action** | Next.js App Router에서 `'use server'`로 표시된 서버 실행 함수. 클라이언트에서 직접 호출 |
| **Route Handler** | `app/api/**/route.ts`의 HTTP 핸들러 |
| **Serverless Function** | Vercel에서 Route Handler·Server Action이 실행되는 단위. **실행 시간 상한이 있다** |
| **Signed URL** | Supabase Storage가 발급하는 시한부 직접 업로드·다운로드 주소 |
| **Resumable Upload** | 중단 지점부터 재개 가능한 업로드 프로토콜 |
| **RLS** | Row Level Security. PostgreSQL의 행 단위 접근 제어 |
| **인물 추적 (Person Tracking)** | 영상 프레임마다 특정 인물의 위치(bbox)를 산출하고 시간축으로 연결하는 것 |
| **영상 이해 (Video Understanding)** | 영상의 내용을 자연어로 기술하거나 구간을 분류하는 것. **좌표를 산출하지 않는다** |

## 1.4 References

| ID | 문서 |
| --- | --- |
| **TREF-01** | `[SRS]hilit-SRSv1.8.md` — 요구사항 원천 |
| **TREF-02** | `[DS]hilit-DSv1.1.md` — 기술 중립 설계 |
| **TREF-03** | `VPS_v0_3.html` — 차별점 D1~D4 |
| **TREF-04** | Next.js App Router · Vercel · Supabase · Prisma · Vercel AI SDK 공식 문서 ⚠️ **버전별 제한값은 착수 시 재확인** |

## 1.5 Assumptions & Constraints

### 1.5.1 기술 제약 — 확정

**시스템 내부 — 단일 통합 프레임워크**

| ID | 제약 |
| --- | --- |
| **C-TEC-001** | 모든 서비스는 **Next.js (App Router)** 기반 단일 풀스택 프레임워크로 구현한다. 프론트엔드와 백엔드를 별도 분리하지 않는다 |
| **C-TEC-002** | 서버 측 로직(DB 접근·API 호출)은 **Server Actions 또는 Route Handlers**로 구현한다. 별도 백엔드 서버를 두지 않는다 |
| **C-TEC-003** | 데이터베이스는 **Prisma + 로컬 Supabase**로 개발환경을 구성하고, 배포 시 **Supabase(PostgreSQL)** 를 사용한다 |
| **C-TEC-004** | UI·스타일링은 **Tailwind CSS + shadcn/ui**를 사용한다 |

**시스템 외부 — 연결 및 AI 통합**

| ID | 제약 |
| --- | --- |
| **C-TEC-005** | AI 기능은 자체 서버 구축 없이 **Vercel AI SDK**로 Next.js에서 외부 API를 호출하는 형태로 구현한다 |
| **C-TEC-006** | 외부 AI 호출은 **Google Gemini API**를 기본으로 하며, **환경 변수만으로 모델 교체**가 가능하도록 SDK 표준 인터페이스를 준수한다 |
| **C-TEC-007** | 배포·인프라는 **Vercel 단일화**하며, CI/CD 설정 없이 **Git Push만으로 배포**한다 |

### 1.5.2 제약에서 파생되는 전제

| # | 전제 | 근거 |
| --- | --- | --- |
| **A-T1** | 서버 실행 시간에 **상한이 있다** | Serverless Function의 성질 (C-TEC-002 · 007) |
| **A-T2** | 요청 본문 크기에 **상한이 있다** | 동일 |
| **A-T3** | **장시간 백그라운드 워커를 둘 수 없다** | 별도 서버 금지 (C-TEC-002) |
| **A-T4** | **GPU를 직접 사용할 수 없다** | 외부 API 호출만 허용 (C-TEC-005) |
| **A-T5** | AI 능력은 **Gemini API가 제공하는 범위**로 한정된다 | C-TEC-006 |
| **A-T6** | 상태 저장은 **PostgreSQL + Supabase Storage**로 한정된다 | C-TEC-003 |

> ⚠️ **A-T1·A-T2의 구체적 수치는 플랜과 버전에 따라 다르므로 이 문서에 적지 않는다.** 착수 시 실측하고 확정한다. **다만 "40분 영상을 함수 안에서 처리할 수 없다"는 결론은 어떤 플랜에서도 성립한다.**

---

# 2. 🔴 제약이 요구사항에 미치는 영향

**이 절이 이 문서의 존재 이유다.**

## 2.1 판정 요약

| 판정 | 건수 | 뜻 |
| :--: | ---: | --- |
| ✅ **구현 가능** | **32** | 스택 그대로 만족 |
| 🟡 **설계 변경 후 가능** | **8** | 우회 설계 필요. 요구사항은 유지 |
| 🔴 **이 스택으로 불가** | **5** | 요구사항을 낮추거나 제약을 풀어야 함 |

## 2.2 🔴 불가 5건

| REQ | 요구 | 막히는 이유 |
| --- | --- | --- |
| **REQ-FUNC-002** | 대상 지정 후 **가림·재등장 시 재식별** · 오인식 ≤ 2% | Gemini는 **영상 이해**를 하고 **인물 추적**을 하지 않는다. 프레임별 동일 인물 식별과 오인식률 관리는 전용 추적 모델의 작업이다 |
| **REQ-FUNC-003** | 등장 구간 탐지 · **IoU 기반 정탐 판정** · 탐지율 ≥ 85% | IoU는 **bbox 좌표**를 전제한다. 좌표를 산출하지 않는 API로는 판정 자체가 불가능하다 |
| **REQ-FUNC-006** | **추적 좌표 기반** 구도 재구성 | 🔴 **입력이 없다.** 좌표가 없으면 리프레이밍이 성립하지 않는다 |
| **REQ-FUNC-027** | 재식별 신뢰도 임계 미만 후보 **제외** | 재식별 신뢰도라는 값 자체가 생성되지 않는다 |
| **REQ-NF-003** | 40분 원본 탐지 **p95 ≤ 8분** | 🔴 **A-T1·A-T3.** Serverless Function 실행 시간 상한 안에서 40분 영상을 처리할 수 없고, 장시간 워커를 둘 수 없다 |

> ### 이 5건이 왜 치명적인가
>
> VPS 0.3이 정의한 차별점 **D1 — "말하지 않고 움직이는 사람을 추적한다"** 가 정확히 이 다섯이다. SRS v1.8 §6.6은 **D1이 실패하면 나머지 셋은 일반 기록 앱이 된다**고 적었다.
>
> **즉 이 스택으로 만들면, 만들 수 있는 것은 "기록이 남는 숏폼 SNS"이지 "AI가 나를 찾아주는 서비스"가 아니다.**

## 2.3 🟡 설계 변경 후 가능 8건

| REQ | 요구 | 우회 설계 |
| --- | --- | --- |
| **REQ-FUNC-001** | 40~50분 · 4GB 업로드 | 🟡 **A-T2 우회** — Route Handler를 경유하지 않고 **Supabase Storage로 직접 업로드**(Signed URL). 서버는 메타데이터와 완료 통지만 받는다 |
| **REQ-NF-002** | 업로드 p95 ≤ 6분 · 재개 성공률 ≥ 99% | 🟡 Supabase Storage의 **resumable upload**로 구현. 서버 재개 로직을 두지 않는다 |
| **REQ-FUNC-004** | 후보 **약 30개** 제시 | 🟡 좌표 없이 **시간 구간만** 산출하는 방식으로 대체 가능 — §7.3 |
| **REQ-FUNC-008** | 합치기·렌더링 · p95 ≤ 90초 | 🟡 **A-T1.** 서버 렌더 불가 → **클라이언트 측 렌더**(WebCodecs·ffmpeg.wasm)로 이전. 단말 성능 편차가 새 위험이 된다 |
| **REQ-NF-004** | 렌더 p95 ≤ 90초 | 🟡 위와 동일. 단말 기준으로 재정의 필요 |
| **REQ-NF-009** | **공개 범위 서버 측 강제** · 우회 0건 | 🟡 **Supabase RLS**로 구현. Server Action 계층이 아니라 **DB 정책**에 두어야 우회가 원천 차단된다 |
| **REQ-NF-013** | 편당 처리 원가 상한 | 🟡 원가 구조가 셋으로 나뉜다 — **① 외부 추론 API(주 원가) ② Gemini 토큰(보조) ③ 렌더(사용자 단말 · 0원)**. 🔴 **추론 API 견적 없이는 산정 불가** |
| **REQ-NF-018** | 사용자 조작 시간 계측 | 🟡 계측 자체는 가능. 다만 §2.2로 인해 **조작 흐름이 달라지면 기준선이 무의미**해진다 |

## 2.4 선택지 3개

**이 문제는 설계로 풀리지 않는다. 제약이나 제품 정의를 바꿔야 한다.**

| # | 선택 | 바뀌는 것 | 유지되는 것 | 비용 |
| :--: | --- | --- | --- | --- |
| **T1** | **C-TEC-005를 완화** — AI만 전용 추론 서비스 사용 | AI 계층만 외부 (Replicate·Modal 등 추적 모델 호스팅) | 제품 정의 · D1 · 나머지 6개 제약 | 인프라 1개 추가 · 원가 구조 재산정 |
| **T2** | **제품 범위 축소** — 추적을 포기하고 **구간 탐색**만 | 🔴 **D1 상실.** "AI가 나를 찾아준다" → "AI가 볼 만한 구간을 골라준다" | 스택 7개 제약 전부 · 기록·소비 계층 | **차별점 소실** · VPS 재작성 |
| **T3** | **단계 분리** — 1단계는 기록·소비만, 2단계에 추적 | 출시 순서 | 최종 제품 정의 | Gate A가 2단계로 밀림 · **검증 순서 역전** |

### ✅ 결정 — T1 확정 (2026-08-30)

**T1을 채택한다.** AI 추론만 외부 전용 서비스로 분리하고 나머지 여섯 제약을 유지한다.

| 항목 | 내용 |
| --- | --- |
| **결정** | 인물 추적·재식별·좌표 산출을 **외부 추론 API**로 위임 |
| **유지되는 제약** | C-TEC-001 · 002 · 003 · 004 · 006 · 007 (6/7) |
| **완화되는 제약** | **C-TEC-005** — "AI 기능은 Vercel AI SDK로 외부 API 호출" → **Gemini는 AI SDK로, 추적은 전용 API로** |
| **추가되는 것** | 호출 대상 API 1개 · webhook 수신 Route Handler 1개 |
| **추가되지 않는 것** | 🔴 **서버 · 인프라 관리 · CI/CD 설정** |

> **C-TEC-005의 취지는 지켜진다.** 제약의 문구는 *"별도 자체 서버 구축 없이"* 이고, 전용 추론 서비스는 **자체 서버가 아니라 또 하나의 외부 API**다. Vercel에는 결과를 받는 Route Handler만 늘어난다.

**T2·T3 기각 사유**

| # | 기각 사유 |
| --- | --- |
| **T2** | 차별점 D1·D3이 성립하지 않는다. 제품이 *"AI가 나를 찾아주는 서비스"* 에서 *"AI가 볼 만한 구간을 골라주는 서비스"* 로 바뀌며 **VPS부터 개정해야 한다.** 기술 제약이 제품 정의를 바꾸는 것은 순서가 거꾸로다 |
| **T3** | VPS·SRS가 *"Gate A가 실패하면 이후 전부 무의미"* 를 반복 명시했다. 추적 검증을 2단계로 미루면 **가장 비싼 것을 가장 늦게 확인**하게 된다 |

### 권고 근거 (결정 전 검토 기록)

> 일곱 제약 중 여섯(001~004 · 006~007)이 그대로 유지되고, **C-TEC-005의 "자체 서버 구축 없이"라는 취지도 지켜진다** — 전용 추론 서비스는 자체 서버가 아니라 **또 하나의 외부 API**다.
>
> **T3은 겉보기에 안전하나 위험하다.** VPS와 SRS가 *"Gate A가 실패하면 이후 전부 무의미"* 를 반복해 명시했다. 추적 검증을 뒤로 미루면 **가장 비싼 것을 가장 늦게 확인**하게 된다.
>
> **T2는 사업 판단이다.** 기술 문서가 결정할 사안이 아니다. 다만 그 경우 **VPS의 차별점 4개 중 D1·D3이 성립하지 않으므로 상위 문서부터 개정해야 한다.**

**§3 이후는 T1 확정을 전제로 한다.**

---

# 3. System Architecture

## 3.1 단일 앱 구성 (C-TEC-001 · 002)

```mermaid
flowchart TB
    subgraph V["Vercel — Next.js App Router 단일 배포"]
        subgraph CL["클라이언트 (RSC + Client Components)"]
            UI["Tailwind + shadcn/ui<br/>3탭 셸 · 후보 선택 · 마이페이지"]
            WC["클라이언트 렌더러<br/>WebCodecs · ffmpeg.wasm"]
        end
        subgraph SV["서버 (Server Actions · Route Handlers)"]
            SA["Server Actions<br/>기록 · 공개범위 · 그룹 · 반응"]
            RH["Route Handlers<br/>webhook · 업로드 완료 통지 · cron"]
            AI["Vercel AI SDK<br/>모델 추상화 계층"]
        end
    end
    subgraph SB["Supabase"]
        PG[("PostgreSQL<br/>+ RLS")]
        ST[("Storage<br/>resumable upload")]
        RT["Realtime<br/>작업 상태 구독"]
    end
    subgraph EX["외부"]
        GM["Google Gemini API<br/>영상 이해"]
        TR["추적 추론 서비스<br/>✅ T1 확정"]
    end
    UI --> SA
    UI -.->|"직접 업로드"| ST
    UI --> WC
    SA --> PG
    RH --> PG
    AI --> GM
    RH --> TR
    ST -.->|"완료 webhook"| RH
    TR --> RH
    PG --> RT --> UI
    
```

## 3.2 계층 책임

| 계층 | 구현 | 담당 요구사항 |
| --- | --- | --- |
| **RSC (서버 컴포넌트)** | 피드·기록 목록 조회 · 초기 렌더 | REQ-FUNC-011 · 014 · REQ-NF-001 |
| **Client Component** | 후보 선택 · 공개 범위 UI · 렌더 진행 | REQ-FUNC-005 · 010 |
| **Server Action** | 상태 변경 전부 (기록·그룹·반응·팔로우) | REQ-FUNC-009 · 010 · 012 · 013 · 015~017 |
| **Route Handler** | 외부 webhook 수신 · Vercel Cron · 업로드 완료 통지 | REQ-FUNC-001 · 003 |
| **Supabase RLS** | 🔴 **공개 범위 강제** | **REQ-NF-009** |
| **Supabase Storage** | 원본·결과물 · 직접 업로드 | REQ-FUNC-001 · REQ-NF-002 · 011 |
| **Supabase Realtime** | 처리 상태 구독 | SC-1.F4 |
| **Vercel AI SDK** | 모델 호출 추상화 | REQ-FUNC-004 |

## 3.3 🔴 서버 렌더를 클라이언트로 옮긴다

**A-T1 때문에 서버에서 영상을 인코딩할 수 없다.** 렌더를 클라이언트로 이전한다.

| 항목 | 서버 렌더(v1.5) | **클라이언트 렌더(v2.0)** |
| --- | --- | --- |
| 실행 위치 | GPU 인프라 | **사용자 단말** |
| 소요 | p95 ≤ 90초 (REQ-NF-004) | 🔺 **단말 성능에 종속** — 재정의 필요 |
| 실패 처리 | 서버 재시도 3회 | 단말 재시도 · **선택 상태는 서버 보존** |
| 원가 | 편당 GPU | **0** — 사용자 단말 부담 |
| 새 위험 | — | 🔴 **구형 단말에서 완성 불가** · 배터리·발열 |

> **원가가 0이 되는 대신 성공률이 단말에 종속된다.** REQ-NF-004(p95 ≤ 90초)를 **단말 등급별로 재정의**해야 하며, 저사양 단말에서의 실패는 SC-3.F1(선택 상태 보존)로 흡수한다.

---

# 4. Data Design (C-TEC-003)

## 4.1 Prisma 스키마 — 핵심 발췌

```prisma
model User {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  handle            String    @unique @db.VarChar(30)
  displayName       String    @db.VarChar(50)
  birthYear         Int?      @db.SmallInt
  guardianConsentAt DateTime?
  role              Role      @default(user)
  createdAt         DateTime  @default(now())
  deletedAt         DateTime?

  sourceVideos SourceVideo[]
  records      Record[]
  @@index([deletedAt])
  @@map("users")
}

model SourceVideo {
  id          String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId     String      @db.Uuid
  durationSec Int
  sizeBytes   BigInt
  codec       String      @db.VarChar(20)
  storagePath String
  status      VideoStatus @default(UPLOADING)
  createdAt   DateTime    @default(now())

  owner     User        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  intervals AppearanceInterval[]
  job       ProcessingJob?
  @@index([ownerId, createdAt(sort: Desc)])
  @@map("source_videos")
}

model Record {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId           String   @db.Uuid
  generatedVideoId  String   @unique @db.Uuid
  sport             String?  @db.VarChar(30)
  createdAt         DateTime @default(now())

  owner      User               @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  visibility VisibilitySetting?
  reactions  Reaction[]
  @@index([ownerId, createdAt(sort: Desc)])
  @@map("records")
}

model VisibilitySetting {
  recordId  String          @id @db.Uuid
  scope     VisibilityScope @default(private)   // 🔴 DB 기본값
  groupIds  String[]        @db.Uuid
  updatedAt DateTime        @updatedAt

  record Record @relation(fields: [recordId], references: [id], onDelete: Cascade)
  @@map("visibility_settings")
}

enum VisibilityScope { public group private }
enum VideoStatus { UPLOADING UPLOADED PROCESSING READY FAILED }
enum Role { user operator }
```

**전체 16개 모델의 속성·제약·인덱스는 `[DS]hilit-DSv1.1.md` §4.2를 따른다.** 이 문서는 **Prisma·PostgreSQL로의 사상만** 다룬다.

| DS 설계 | Prisma·PG 구현 |
| --- | --- |
| ~~ULID PK~~ | ✅ **`uuid` 로 확정** — `gen_random_uuid()` · Prisma·PG 기본 지원 우선 `[확정 2026-08-30 · DS 갱신 완료]` |
| `CHECK` 제약 | Prisma 미지원 → **마이그레이션 SQL에 직접 작성** |
| `uuid[]` 배열 | `String[] @db.Uuid` — PG 네이티브 배열 |
| 부분 UNIQUE | Prisma 미지원 → 마이그레이션 SQL |
| 논리/물리 삭제 분리 | `deletedAt` + `onDelete: Cascade` 병용 |

> 🔺 **Prisma가 표현하지 못하는 제약이 있다.** `CHECK (member_count <= 20)` 같은 것은 마이그레이션 SQL로 넣고 **스키마 파일에 주석으로 남긴다.** 그러지 않으면 다음 `prisma migrate` 때 유실된다.

## 4.2 🔴 RLS로 공개 범위를 강제한다 (REQ-NF-009)

**Server Action 계층의 필터링만으로는 REQ-NF-009를 만족하지 못한다.** 새 조회 경로가 추가될 때마다 누락 위험이 생기기 때문이다. **DB 정책에 둔다.**

```sql
alter table records enable row level security;

create policy record_read on records for select using (
  owner_id = auth.uid()
  or exists (
    select 1 from visibility_settings v
    where v.record_id = records.id
      and (
        v.scope = 'public'
        or (v.scope = 'group' and exists (
              select 1 from group_members m
              where m.user_id = auth.uid()
                and m.left_at is null
                and m.group_id = any(v.group_ids)))
      )
  )
);
```

| REQ-NF-009 요구 | RLS 구현 |
| --- | --- |
| 서버 측 강제 | ✅ **DB 계층** — 애플리케이션 우회 불가 |
| 우회 성공 0건 | ✅ 모든 `select`가 정책을 통과 |
| **건수·존재 유추 정보 반환 금지** | ✅ 정책 미통과 행은 **결과 집합에 없다** — `count(*)`도 자동으로 제외 |
| 감사 로그 100% | 🔺 **RLS는 로그를 남기지 않는다** — 별도 설계 필요(§9-2) |

> **RLS가 SC-4.4(타인 프로필 — 개수에도 미포함)를 구조적으로 해결한다.** 애플리케이션이 `count(*)`를 세도 정책이 걸러낸 뒤의 수만 보인다. **개발자가 실수할 여지가 없다** — 이것이 이 스택의 가장 큰 이점이다.

---

# 5. Interface Design (C-TEC-002)

## 5.1 Server Action / Route Handler 배분

**원칙** — 사용자가 일으키는 상태 변경은 **Server Action**, 외부가 일으키는 것은 **Route Handler**.

| 기능 | 방식 | 시그니처 | REQ |
| --- | --- | --- | --- |
| 업로드 개시 | Server Action | `createUpload(meta) → {videoId, signedUrl}` | REQ-FUNC-001 · SC-1.F1 |
| 업로드 완료 통지 | **Route Handler** | `POST /api/webhooks/storage` | REQ-FUNC-001 |
| 대상 지정 | Server Action | `anchorSubject(videoId, frameMs, bbox)` | REQ-FUNC-002 |
| 탐지 요청 | Server Action | `requestDetection(videoId) → {jobId}` | REQ-FUNC-003 |
| 추론 결과 수신 | **Route Handler** | `POST /api/webhooks/inference` | REQ-FUNC-003 |
| 후보 조회 | **RSC 직접 조회** | `getCandidates(videoId)` | REQ-FUNC-004 |
| 선택 확정 | Server Action | `confirmSelection(videoId, candidateIds, musicId)` | REQ-FUNC-005 |
| 렌더 완료 등록 | Server Action | `registerRendered(draftId, storagePath)` | REQ-FUNC-008 · 009 |
| 공개 범위 변경 | Server Action | `setVisibility(recordId, scope, groupIds?)` | REQ-FUNC-010 |
| 그룹 생성·초대·이탈 | Server Action | `createGroup` · `inviteMember` · `leaveGroup` | REQ-FUNC-013 |
| 팔로우 | Server Action | `follow(followeeId)` · `unfollow(...)` | REQ-FUNC-012 |
| 반응·신고 | Server Action | `react(recordId, type, text?)` · `report(reactionId, reason)` | REQ-FUNC-015 · 016 |
| 공유 링크 | Server Action | `issueShareLink(recordId) → {url, expiresAt}` | REQ-FUNC-017 |
| 상태 폴링 대체 | **Supabase Realtime** | `processing_jobs` 구독 | SC-1.F4 |
| 정리 배치 | **Vercel Cron → Route Handler** | `GET /api/cron/expire-shares` | REQ-NF-012 |

## 5.2 공통 규약 (C-TEC-002)

| 항목 | 설계 |
| --- | --- |
| 인증 | **Supabase Auth** 세션 → Server Action에서 `auth.uid()` 확보 |
| 권한 없음 | RLS가 **빈 결과**를 반환 → 애플리케이션은 `notFound()` 처리 (DS §3.1.1의 `404` 원칙과 일치) |
| 입력 검증 | **Zod** 스키마 — Server Action 첫 줄에서 파싱 |
| 오류 전달 | Server Action은 **예외를 던지지 않고** `{ok:false, code, message}` 반환 — 클라이언트 UI가 분기 |
| 멱등성 | `Idempotency-Key`를 인자로 받아 `idempotency_keys` 테이블에 기록 |
| 속도 제한 | 🔺 Vercel 미들웨어 또는 DB 카운터. **설계 미확정**(§9-3) |

## 5.3 🔴 4GB 업로드 — Route Handler를 우회한다

**A-T2 때문에 서버를 경유할 수 없다.**

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as Client Component
    participant SA as Server Action
    participant ST as Supabase Storage
    participant RH as Route Handler
    participant DB as PostgreSQL
    U->>C: 원본 선택 (메타 추출)
    C->>SA: createUpload({codec, sizeBytes, durationSec})
    SA->>SA: 코덱 검증 — SC-1.F1
    alt 미지원
        SA-->>C: {ok:false, code:"CODEC_UNSUPPORTED"}
        Note over SA: 바이트 수신 0 · 추론 호출 0
    else 지원
        SA->>DB: source_videos INSERT (UPLOADING)
        SA->>ST: signed upload URL 발급
        SA-->>C: {videoId, signedUrl}
        C->>ST: 직접 업로드 (resumable)
        Note over C,ST: 중단 시 같은 URL로 재개<br/>서버 재개 로직 없음 — REQ-NF-002
        ST->>RH: POST /api/webhooks/storage
        RH->>DB: status = UPLOADED
    end
```

**이 설계가 SC-1.F1을 더 잘 만족한다** — 코덱 판정이 **Signed URL 발급 전**에 일어나므로 바이트가 단 한 번도 전송되지 않는다.

---

# 6. UI Design (C-TEC-004)

| 화면 | shadcn/ui 구성 | REQ |
| --- | --- | --- |
| 앱 셸 3탭 | `Tabs` + 하단 고정 네비 · RSC 스트리밍 | REQ-FUNC-011 · REQ-NF-001 |
| 후보 목록 | `ScrollArea` + `Card` + `Checkbox` · 가상 스크롤 | REQ-FUNC-004 · 005 |
| 공개 범위 | `RadioGroup` + `Badge`(글자 배지) | REQ-FUNC-010 · ADR-4 |
| 그룹 | `Dialog` + `Command`(멤버 검색) | REQ-FUNC-013 |
| 마이페이지 | `Tabs` + `ToggleGroup`(필터) | SC-4.3 · 4.5 |
| 반응 | `Sheet`(하단 시트 댓글) | REQ-FUNC-015 · 016 · SC-6.2 |
| 공유 | `Sheet` + OS 공유 API | REQ-FUNC-017 |
| 처리 진행 | `Progress` + Realtime 구독 | SC-1.F4 |

**공개 범위 배지는 `Badge` variant로 고정한다** — 프로토타입이 *"글자 배지 · 영상 가림 없이"* 를 확정했다(ADR-4).

---

# 6.5 🔴 웹 플랫폼 고유 제약

**브라우저에서만 발생하는 제약 3건이다. 스택 선택의 결과이므로 v1.5에는 없다.**

## 6.5.1 자동재생 — 음소거로 시작할 수밖에 없다

브라우저는 **사용자 조작 없는 유성 자동재생을 차단**한다. REQ-FUNC-011(*"로그인 화면 없이 바로 재생"*)을 지키려면 **음소거 시작이 유일한 경로**다.

**문제는 음악이 부가 기능이 아니라는 것이다** — VPS는 F18a를 **O2(완성 전환율 4% → 60%)의 인과 경로**로 지목했다. 만드는 쪽에는 음악이 필수인데 **보는 쪽 첫 접점에서 소리가 나지 않는다.**

### ✅ 채택 — 첫 조작 시 소리 활성

```ts
// app/(feed)/_components/FeedPlayer.tsx
const [muted, setMuted] = useState(true);          // 정책상 필수
useEffect(() => {
  const unmute = () => { setMuted(false); track('first_unmute'); };
  window.addEventListener('scroll', unmute, { once: true, passive: true });
  window.addEventListener('pointerdown', unmute, { once: true });
  return () => { /* cleanup */ };
}, []);
```

| 대안 | 판정 |
| --- | :--: |
| 음소거 + 해제 버튼 | 🟡 첫 인상에서 음악이 없다 |
| **첫 조작(스크롤·탭) 시 활성** | ✅ **채택** — 사용자가 어차피 하는 동작 · 별도 UI 불필요 |
| 진입 화면에서 묻기 | 🔴 REQ-FUNC-011의 *"로그인 화면 없이"* 취지가 흐려진다 |
| 무음 전제 설계(자막·시각 강조) | 🔴 **F18a의 MVP 포함 근거가 무너진다** |

**계측** — `first_unmute` 이벤트로 **무음 재생 시간 비율**을 잰다. 높으면 진입 방식을 재검토한다(v1.5 Q17).

## 6.5.2 F9 폰 용량 회수 — 웹에서는 측정이 불가능하다

| 동작 | 웹 | 근거 |
| --- | :--: | --- |
| 사용자 갤러리 파일 삭제 | 🔴 불가 | 브라우저는 단말 파일 시스템에 쓰지 못한다 |
| 기기 저장공간 조회 | 🔴 불가 | 오리진 할당량만 알 수 있고 갤러리 용량은 알 수 없다 |
| 삭제 안내 | ✅ 가능 | — |
| 삭제 여부 확인 | 🔴 불가 | **자기신고 외 수단 없음** |

### ✅ 채택 — 안내 유지 · O4를 자기신고 지표로

**O4(원본 삭제율 50%)를 관측할 수단이 없다.** 완성 후 1문항으로 묻고 `origin_delete_reported`로 기록한다.

> **"서버에서 원본을 지운다"로 대체하지 않는다.** UC-03이 겪는 문제는 **폰 용량**이며 서버 정리는 사용자에게 아무 변화도 주지 않는다. **문제를 바꿔치기하는 설계다.**

## 6.5.3 탭 종료 — 렌더만 소실된다

**T1 확정이 여기서 이득을 만든다.** 가장 긴 단계인 탐지가 외부 추론 API에서 돌아 **탭 종료에 영향받지 않는다.**

| 단계 | 실행 위치 | 탭 종료 시 | 재개 |
| --- | --- | :--: | --- |
| 업로드 | 브라우저 → Storage | 중단 | ✅ resumable upload |
| **탐지** | **외부 추론 API** | 🟢 **영향 없음** | ✅ webhook이 DB에 기록 |
| 선택 | 브라우저 | 중단 | ✅ 서버 저장분에서 복원 |
| **렌더** | **브라우저** | 🔴 소실 | ❌ 다시 실행 |

### ✅ 채택 — R1 + R2

| # | 설계 |
| --- | --- |
| **R1** | 렌더 중 `beforeunload` 이탈 경고 + 진행률 표시 |
| **R2** | 🔴 **선택·음악 설정을 렌더 시작 전에 서버 저장** — SC-3.F1과 같은 요구 |

**R2가 있으면 사용자가 잃는 것은 렌더 시간뿐이고 선택은 남는다.** SRS의 *"처음부터 다시 고르게 하지 않는다"* 가 지켜진다.

**Service Worker 백그라운드 렌더는 기각한다** — 신뢰성이 낮고, 실패 시 사용자가 알 방법이 없다.

---

# 7. AI Integration (C-TEC-005 · 006)

## 7.1 모델 추상화 (C-TEC-006)

```ts
// lib/ai/provider.ts — 환경 변수만으로 교체
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';

export const videoModel = google(process.env.AI_VIDEO_MODEL ?? 'gemini-2.0-flash');
```

| C-TEC-006 요구 | 구현 |
| --- | --- |
| Gemini 기본 | `@ai-sdk/google` 프로바이더 |
| **환경 변수만으로 교체** | 모델 ID를 `AI_VIDEO_MODEL`로 주입 · 프로바이더는 팩토리로 분리 |
| SDK 표준 인터페이스 | `generateObject` + Zod 스키마 — 프로바이더 무관 |

## 7.2 Gemini가 할 수 있는 것과 없는 것

| 작업 | Gemini | 근거 |
| --- | :--: | --- |
| 영상 내용 요약·구간 분류 | ✅ | 영상 이해 |
| "슛하는 장면" 같은 **의미 구간** 식별 | ✅ | 동일 |
| **특정 인물**을 프레임마다 추적 | 🔴 | 인물 추적은 전용 모델 작업 |
| 가림 후 **동일 인물 재식별** · 오인식률 관리 | 🔴 | 동일 |
| **bbox 좌표 시계열** 산출 | 🔴 | 리프레이밍의 입력 |
| 40분 영상 **8분 내** 처리 | 🔴 | A-T1 · A-T3 |

## 7.3 🟡 후보 생성의 대체 설계 (REQ-FUNC-004)

**좌표 없이 시간 구간만** 산출하는 경로다. T2를 택할 경우의 최소 구현이며, **T1에서는 추적 결과와 병합**한다.

```ts
const CandidateSchema = z.object({
  segments: z.array(z.object({
    startMs: z.number(),
    endMs: z.number(),
    reason: z.string(),          // "골대 앞 슈팅"
    confidence: z.number(),      // 🔺 인물 신뢰도가 아니다
  })).max(30),                   // REQ-FUNC-004 — 약 30개
});
```

> 🔴 **여기서 나오는 `confidence`는 REQ-FUNC-027의 재식별 신뢰도가 아니다.** *"이 구간이 볼 만한가"* 이지 *"이 사람이 당신인가"* 가 아니다. **두 값을 같은 이름으로 쓰면 요구사항이 조용히 바뀐다.**

## 7.4 ✅ 추적 추론 서비스 연동 (T1 확정)

```mermaid
sequenceDiagram
    participant SA as Server Action
    participant TR as 추적 추론 서비스
    participant RH as Route Handler
    participant DB as PostgreSQL
    SA->>TR: POST /predict {storageUrl, anchorBbox, callbackUrl}
    TR-->>SA: 202 {inferenceId}
    SA->>DB: processing_jobs (DETECTING)
    Note over TR: 장시간 처리 — Vercel 밖
    TR->>RH: POST /api/webhooks/inference<br/>{intervals[], bboxTimeline}
    RH->>DB: appearance_intervals INSERT
    RH->>DB: stage = SELECTION_READY
```

**C-TEC-002·007은 유지된다** — 자체 서버를 두지 않고 **외부 API를 호출**할 뿐이며, Vercel에는 webhook 수신 Route Handler만 추가된다. 실행 시간 상한에도 걸리지 않는다.

---

# 8. Deployment (C-TEC-007)

| 항목 | 설계 |
| --- | --- |
| 배포 | Vercel Git 연동 · **`main` push → 프로덕션** · PR → Preview |
| 마이그레이션 | 🔺 `prisma migrate deploy`를 **빌드 단계에 넣지 않는다** — 롤백 불가. **수동 실행 후 배포** |
| 환경 변수 | Vercel 대시보드 · `AI_VIDEO_MODEL` 포함 |
| 로컬 | Supabase CLI 로컬 스택 + `prisma migrate dev` |
| 배포 게이트 | ✅ **빌드 타임 검증 + 저장소 보호 + 킬 스위치** — §8.1 |

## 8.1 🔴 C-TEC-007과 배포 게이트의 충돌

SRS v1.5는 **얼굴 정보 4종·미성년자 3종·음원 증빙이 미승인이면 CI가 배포를 차단**하도록 요구한다(REQ-NF-010 · 016 · 017). **CI 설정 없이 Git Push만으로 배포하면 이 차단이 작동하지 않는다.**

### 8.1.1 대안 비교

| # | 대안 | 차단 시점 | 강도 | C-TEC-007 위반 | 판정 |
| :--: | --- | --- | :--: | :--: | :--: |
| **A** | 런타임 기능 플래그 (환경 변수) | 실행 시 | 🟡 약 | 아니오 | 보조 |
| **B** | **빌드 타임 게이트 검증** (`prebuild` 스크립트) | **빌드 시** | 🟢 **강** | **아니오** | ✅ **채택** |
| **C** | **저장소 브랜치 보호 + CODEOWNERS** | 병합 시 | 🟢 **강** | **아니오** | ✅ **채택** |
| D | Vercel Deployment Protection | 배포 승인 | 🟡 중 | 아니오 | 기각 — 플랜 의존 · 승인자가 산출물을 본다는 보장 없음 |
| E | DB 기반 런타임 게이트 조회 | 매 요청 | 🟡 약 | 아니오 | 기각 — 조회 비용 · 여전히 사람이 켬 |

**A의 한계** — 배포는 되고 기능만 꺼진다. **환경 변수를 켜는 사람이 승인 여부를 확인해야 하고**, 그 확인이 문서가 아니라 사람의 기억에 남는다.

**D를 기각한 이유** — 승인 버튼을 누르는 것과 **산출물 7종을 실제로 확인하는 것**은 다르다. 게이트가 형식만 남는다.

### 8.1.2 ✅ 채택 — B + C + A 3중 구조

**세 층이 서로 다른 실패를 막는다.**

| 층 | 막는 실패 |
| --- | --- |
| **B 빌드 타임** | *"승인 안 된 걸 잊고 배포했다"* |
| **C 저장소 보호** | *"개발자가 승인 파일을 임의로 만들었다"* |
| **A 런타임 플래그** | *"배포한 뒤에 문제를 발견했다"* — 긴급 차단 |

### 8.1.3 B — 빌드 타임 게이트 검증

🔴 **핵심 통찰 — 이것은 CI가 아니다.** `package.json`의 스크립트일 뿐이고, **Vercel은 어차피 빌드를 실행한다.** CI 설정 파일이 하나도 없이 실질 차단이 작동한다.

**승인 아티팩트를 저장소에 둔다.**

```
gates/
  face-consent.gate.json      # REQ-NF-010 · 산출물 4종
  minor-policy.gate.json      # REQ-NF-016 · 산출물 4종
  minor-subject.gate.json     # REQ-NF-017 · 산출물 3종
  music-license.gate.json     # REQ-FUNC-007 · 증빙 3종
```

```json
{
  "gateId": "FACE_CONSENT",
  "requirement": "REQ-NF-010",
  "status": "PENDING",
  "requiredArtifacts": 4,
  "artifacts": [],
  "blocks": ["PUBLIC_PUBLISH", "GROUP_PUBLISH"],
  "expiresAt": null
}
```

```jsonc
// 승인 후
{
  "gateId": "FACE_CONSENT",
  "requirement": "REQ-NF-010",
  "status": "APPROVED",
  "requiredArtifacts": 4,
  "artifacts": [
    { "name": "동의 문구",      "ref": "legal/consent-copy-v2.pdf",  "sha256": "…", "approvedBy": "법무", "approvedAt": "2026-09-15" },
    { "name": "보관 기간",      "ref": "legal/retention-policy.md",  "sha256": "…", "approvedBy": "법무", "approvedAt": "2026-09-15" },
    { "name": "파기 절차",      "ref": "legal/erasure-procedure.md", "sha256": "…", "approvedBy": "법무", "approvedAt": "2026-09-15" },
    { "name": "처리 위탁",      "ref": "legal/processor-agreement.pdf","sha256": "…","approvedBy": "법무","approvedAt": "2026-09-15" }
  ],
  "blocks": [],
  "expiresAt": "2027-09-15"
}
```

**검증 스크립트** `[PROPOSED]`

```ts
// scripts/verify-gates.ts — package.json: "prebuild": "tsx scripts/verify-gates.ts"
const gates = loadGates('gates/*.gate.json');
const blocked = new Set<string>();

for (const g of gates) {
  const ok =
    g.status === 'APPROVED' &&
    g.artifacts.length === g.requiredArtifacts &&
    g.artifacts.every(a => fileExists(a.ref) && sha256(a.ref) === a.sha256) &&
    (!g.expiresAt || new Date(g.expiresAt) > new Date());

  if (!ok) {
    console.error(`⛔ ${g.gateId} (${g.requirement}) — 차단: ${g.blocks.join(', ')}`);
    g.blocks.forEach(f => blocked.add(f));
  }
}

// 🔴 기능 상수를 생성한다 — 미승인 기능은 빌드 산출물에 포함되지 않는다
writeFileSync('lib/gates.generated.ts',
  `export const BLOCKED = ${JSON.stringify([...blocked])} as const;\n` +
  [...ALL_FEATURES].map(f =>
    `export const ${f} = ${!blocked.has(f)};`).join('\n'));
```

**전체 배포를 막지 않고 해당 기능만 뺀다.**

```ts
// app/(feed)/publish/page.tsx
import { PUBLIC_PUBLISH } from '@/lib/gates.generated';
if (!PUBLIC_PUBLISH) notFound();   // 상수 false → 번들에서 제거됨
```

> 🔴 **런타임 플래그보다 강한 이유** — 플래그는 **켤 수 있지만, 없는 코드는 켤 수 없다.** 상수가 `false`면 해당 분기가 트리 셰이킹으로 사라지고 **미승인 기능의 라우트가 빌드 산출물에 존재하지 않는다.**
>
> 이는 SRS의 *"배포를 차단한다"* 보다 **실질 보장이 강하다** — 배포는 되지만 그 기능은 물리적으로 없다. 🔺 SRS 문구 개정을 요청한다(§9-7).

### 8.1.4 C — 저장소 보호로 승인 주체를 강제

**B만으로는 개발자가 `gate.json`을 직접 `APPROVED`로 고칠 수 있다.** 저장소 설정으로 막는다.

```
# .github/CODEOWNERS
/gates/     @법무-담당자 @제품-리드
/legal/     @법무-담당자
```

| 설정 | 효과 |
| --- | --- |
| `main` 직접 push 금지 | 모든 변경이 PR을 거친다 |
| PR 승인 1인 이상 필수 | 단독 병합 불가 |
| **CODEOWNERS 승인 필수** | 🔴 **`gates/` 변경에는 법무 승인이 반드시 붙는다** |
| 강제 푸시 금지 | 승인 이력이 히스토리에서 지워지지 않는다 |

> **이것은 CI 설정이 아니라 저장소 설정이다.** C-TEC-007은 *"CI/CD 설정 없이 Git Push만으로 배포"* 를 요구했고, 브랜치 보호는 **배포 파이프라인이 아니라 협업 규칙**이다. **제약과 충돌하지 않는다.**

### 8.1.5 A — 런타임 킬 스위치 (보조)

배포 후 문제를 발견했을 때 **재배포 없이** 끄는 수단만 남긴다.

```ts
// 환경 변수 하나. 켜는 용도가 아니라 끄는 용도다.
export const killSwitch = (f: Feature) =>
  process.env.KILL_SWITCH?.split(',').includes(f) ?? false;
```

**빌드 타임 상수가 `false`면 킬 스위치와 무관하게 기능이 없다.** 킬 스위치는 **승인된 기능을 긴급히 내리는 데만** 쓴다 — 반대 방향으로는 작동하지 않는다.

### 8.1.6 게이트 ↔ 기능 매핑

| 게이트 | 요구사항 | 차단 대상 | 산출물 |
| --- | --- | --- | :--: |
| `FACE_CONSENT` | REQ-NF-010 | 공개 발행 · 그룹 공개 | 4종 |
| `MINOR_POLICY` | REQ-NF-016 | **가입 플로우** | 4종 |
| `MINOR_SUBJECT` | REQ-NF-017 | 공개 발행 · 그룹 공개 | 3종 |
| `MUSIC_LICENSE` | REQ-FUNC-007 | 음악 라이브러리 | 3종 |

> **`MINOR_POLICY`가 가입 플로우를 막는다는 것은 서비스 자체가 열리지 않는다는 뜻이다.** 이 게이트만은 **베타 초대 경로에도 적용**해야 한다 — 초대도 가입이다.

## 8.2 배포 파이프라인

---

# 9. 🔺 상위 문서 개정 요청

| # | 내용 | 대상 | 사유 |
| :--: | --- | --- | --- |
| **9-1** | 🔴 **REQ-FUNC-002 · 003 · 006 · 027 · REQ-NF-003의 실현 경로 확정** | VPS · SRS v1.5 | §2.4의 T1·T2·T3 중 택일 없이는 개발 착수 불가 |
| **9-2** | **RLS 감사 로그** — RLS는 접근 거부를 기록하지 않는다 | SRS REQ-NF-009 | 감사 로그 100% 요구를 별도 설계로 충족해야 함 |
| **9-3** | 속도 제한 구현 방식 미확정 | DS §3.1.3 | Vercel 미들웨어 vs DB 카운터 |
| **9-4** | **REQ-NF-004(렌더 p95 ≤ 90초)를 단말 기준으로 재정의** | SRS | 클라이언트 렌더 전환(§3.3) |
| **9-5** | **REQ-NF-013 원가 구조 재산정** | SRS | GPU 원가 → **추론 API + Gemini 토큰 + 단말(0원)** 3분할 |
| **9-8** | **REQ-FUNC-011에 자동재생 정책 반영** | ✅ **v1.5에 반영 완료** | §6.5.1 |
| **9-9** | **O4 정의를 자기신고로 변경** | ✅ **v1.5에 반영 완료** | §6.5.2 |
| **9-6** | **배포 게이트 방식 승인** — 빌드 타임 검증 + 저장소 보호 + 킬 스위치 3중 | SRS REQ-NF-010 · 016 · 017 | §8.1 |
| **9-7** | 🔺 **"CI가 배포를 차단한다" → "미승인 기능은 빌드 산출물에 포함되지 않는다"** 로 문구 개정 | SRS REQ-NF-010 · 016 · 017 | §8.1.3 — **실질 보장이 더 강하다.** 배포는 되되 기능이 물리적으로 없다 |

---

# 10. 판정 종합

| 계층 | 이 스택 적합도 | 근거 |
| --- | :--: | --- |
| **기록·보관** (REQ-FUNC-009 · 010) | 🟢 **매우 적합** | RLS가 공개 범위를 구조적으로 보장 |
| **소비·관계** (REQ-FUNC-011~017) | 🟢 **매우 적합** | RSC + Server Action의 전형적 영역 |
| **업로드** (REQ-FUNC-001) | 🟡 적합 | Storage 직접 업로드로 우회 |
| **완성·렌더** (REQ-FUNC-008) | 🟡 조건부 | 클라이언트 렌더 · 단말 종속 |
| **트래킹** (REQ-FUNC-002 · 003 · 006 · 027) | 🟢 **적합 (T1 확정 후)** | 외부 추론 API 위임 · Vercel에는 webhook 수신만 추가 |
| **배포 게이트** (REQ-NF-010 · 016 · 017) | 🟢 **적합** | 빌드 타임 검증이 CI 차단보다 강한 보장 |

> **이 스택은 잘못된 선택이 아니다.** 이 제품의 **기록·소비 계층에는 오히려 강점**이 있다 — 특히 RLS가 REQ-NF-009를 개발자 실수 없이 보장하는 것은 일반 백엔드 구성보다 안전하다.
>
> **트래킹만 이 틀 밖에 있었고, T1 확정으로 해소됐다.** 추가되는 것은 서버가 아니라 **호출 대상 API 하나**이며 나머지 여섯 제약은 그대로다.
>
> **배포 게이트의 충돌도 해소됐다.** §8.1의 빌드 타임 검증은 **CI 설정 파일 없이** 작동하며, 미승인 기능을 **빌드 산출물에서 제거**하므로 원래 요구(CI 차단)보다 실질 보장이 강하다.

---

*작성자: 제품 아키텍트 · 검토자: AI 리드 · 백엔드 리드 · 승인자: 제품 리드 (PM)*
*이 문서는 `[SRS]hilit-SRSv1.8.md`를 대체하지 않는다. 요구사항의 원천은 v1.5이며, 이 문서는 지정된 기술 제약 하에서의 실현 가능성과 설계를 다룬다.*
