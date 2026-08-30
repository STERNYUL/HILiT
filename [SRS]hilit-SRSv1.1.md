# Software Requirements Specification (SRS)

**Document ID:** SRS-HILIT-MVP-001

**version:** 1.1

**Date:** 2026-08-30

**Standard:** ISO/IEC/IEEE 29148:2018

---

### 판 이력

| 판 | 날짜 | 변경 | 근거 |
| --- | --- | --- | --- |
| v0.1 | 2026-08-29 | PRD v1.0 → 29148 SRS 양식 이관 초안 | 팀 작업 |
| v1.0 | 2026-08-29 | 추적성 매트릭스 30건 확정 · 운영 시나리오 33건에 REQ 연결 · 매트릭스 범위 명문화 | 팀 작업 (`hilit-srs-v1_0.html`) |
| **v1.1** | **2026-08-30** | **통합 개정.** 팀 SRS v1.0(REQ 41건)의 **ID 체계를 그대로 보존**하고, PRD v0.1(REF-02)에서만 확인되는 내용을 **REQ-FUNC-027~035 · REQ-NF-016~022 로 증분 추가**(16건). 단일성(§5.2.5) 위반 분해 · ADR 확정 2건 · 기준선 확보 순서 신설 | REF-02 · REF-04 |

> **v1.1의 개정 성격 — 이것은 대체가 아니라 증분이다.** 팀 SRS v1.0은 이미 추적성 매트릭스와 테스트 케이스 ID를 확정했다. **ID를 재번호하면 그 매트릭스가 전부 끊어지므로**, REQ-FUNC-001~026 · REQ-NF-001~015의 **식별자와 의미를 손대지 않고** 새 번호만 뒤에 붙였다.
>
> 증분 16건의 성격은 두 가지다. ① **단일성 분해** — 팀 v1.0이 하나의 요구사항에 묶어둔, 이행 수단이 서로 다른 통제를 분리했다(업로드/이어올리기/코덱검증). ② **PRD v0.1 고유 내용** — 실패 경로 요구사항과 확정된 설계 결정 2건이다.

> **출처 상태 태그를 보존한다.** `[SOURCE]`(VPS 명시) · `[HYPOTHESIS]`(1년차 가설) · `[PROPOSED]`(신규 제안) · `[TBD]`(미정). 인수 기준에 수치가 있어도 그것이 실측치인지 가설인지를 태그가 구분한다. **없는 숫자를 지어내지 않았고, 상위 문서가 비워둔 칸은 비워둔 채로 옮겼다.**

---

# 1. Introduction

## 1.1 Purpose

본 문서는 ISO/IEC/IEEE 29148:2018 표준에 따라, **이미 촬영된 긴 스포츠 영상에서 특정 인물을 추적해 본인이 선택한 구간만 숏폼으로 완성하고, 공개 여부와 무관하게 개인 기록으로 보관하는 서비스**의 요구사항을 정의한다.

이 제품이 해결하는 단일 과업(Core Job)은 다음과 같으며, **세 조건 중 하나라도 빠지면 기존 대안으로도 충족된다** [REF-01].

> **이미 찍어둔 긴 영상**에서, **내가 의미 있다고 판단한 순간만** 건져서, **남에게 보여줄지와 무관하게** 내 기록으로.

해결 대상 문제는 셋이다.

| # | 문제 | 근본 원인 | 해당 | 현재 실패 수준 |
| --- | --- | --- | :---: | --- |
| **P1** | 원본에서 자기 장면을 찾는 시간이 편집보다 오래 걸린다 | 고정 카메라는 경기를 담지만 **누가 어디에 있었는지는 기록하지 않는다** | **6/6** | 원본 1편당 탐색 60분 이상 · 원본→완성 전환율 약 4% `[SOURCE]` |
| **P2** | 고정 카메라는 사람을 따라오지 않아 화면에 작게 잡힌다 | P1과 원인이 동일 | 3/6 | 재촬영 1~3회/결과물 `[SOURCE]` |
| **P3** | 공개할 자신이 없으면 기록도 남지 않는다 | 기존 SNS는 **올려야 남는** 구조다 | 3/6 | 비공개 기록 비율 0% · 월 기록 생성 0.7건 `[SOURCE]` |

**P1과 P2는 원인이 같다.** 추적 기능(REQ-FUNC-002 · 003 · 006)이 둘을 함께 제거한다.

## 1.2 Scope

### 1.2.1 In-Scope

| # | 범위 | 대응 요구사항 |
| --- | --- | --- |
| 1 | 이미 촬영된 40~50분·4GB급 원본의 업로드와 비동기 처리 | REQ-FUNC-001 · 027 · 028 |
| 2 | 추적 대상 1회 지정 및 가림·재등장 시 재식별 | REQ-FUNC-002 · 029 |
| 3 | 등장 구간 자동 탐지 및 후보 제시 | REQ-FUNC-003 · 004 · 030 |
| 4 | **최종 선택권의 사용자 귀속** — 기계가 확정하지 않는다 | REQ-FUNC-005 |
| 5 | 추적 좌표 기반 구도 보정 및 세로 숏폼 렌더 | REQ-FUNC-006 · 008 · 031 |
| 6 | 저작권이 정리된 곡만 담은 앱 내 음악 라이브러리 | REQ-FUNC-007 |
| 7 | **공개 여부와 무관한 개인 기록 보관** 및 기록 단위 3단 공개 범위 | REQ-FUNC-009 · 010 |
| 8 | 소비 루프 — 앱 셸 3탭 · 팔로우 · 그룹 · 피드 · 좋아요 · 댓글/신고 · 공유 | REQ-FUNC-011~017 · 033 · 034 |
| 9 | 처리 실패 복구 — 체크포인트 재개 · 상태 보존 | REQ-FUNC-031 · 032 · 035 |

### 1.2.2 Out-of-Scope

| 제외 | 사유 | 근거 |
| --- | --- | --- |
| **앱 내 촬영 기능** | Core Job "이미 찍어둔"의 경계. 포함하면 제품 정의가 바뀐다 | `[SOURCE]` |
| **게시 이후의 결과** — 팔로워 성장 · 조회수 최적화 · 수익화 | "게시 이후의 결과 문제는 풀지 않는다" | `[SOURCE]` |
| **매출 목표 · 과금 구조 · 가격** | 구독 도입 여부와 시점이 미정 | `[SOURCE]` |
| 팀 공유 편집 (한 원본 다중 사용자) | 팀 계정 · 공유 권한 · 얼굴 동의 · 인원 비례 원가 **넷이 전부 미정** | REQ-FUNC-024 |
| 촬영 가이드 | 원본이 없는 사용자 유입용. 본 범위의 전제와 어긋남 | REQ-FUNC-025 |
| 자막 편집 | 기획 미정. 음악(REQ-FUNC-007)과 분리 | REQ-FUNC-026 |

## 1.3 Definitions, Acronyms, Abbreviations

| 용어 | 정의 |
| --- | --- |
| **Core Job** | 이 제품이 해결하는 단일 과업. 1.1 참조 |
| **원본 (Source Video)** | 사용자가 이미 촬영해 보유한 40~50분·4GB급 긴 영상 |
| **재식별 (Re-identification)** | 대상이 가려지거나 화면을 벗어났다 다시 나타났을 때 동일 인물로 판정하는 것 |
| **등장 구간 (Appearance Interval)** | 원본 안에서 지정 대상이 화면에 존재하는 시간 구간 |
| **후보 (Candidate)** | 등장 구간을 1차 컷편집해 사용자에게 제시하는 선택 단위 |
| **구도 보정 (Reframing)** | 추적 좌표를 기준으로 프레임을 재구성해 대상을 화면 주인공으로 만드는 처리 |
| **기록 (Record)** | 완성 영상이 **공개 여부와 무관하게** 개인 계정에 남는 단위 |
| **공개 범위 (Visibility Scope)** | 기록 단위로 지정하는 `public` · `group` · `private` 3단 |
| **VisibilityEnforcer** | 조회 시 반드시 통과해야 하는 **서버 측 공개 범위 검문소**. 클래스가 아니라 경로다 |
| **Gate A** | 등장 구간 탐지율이 임계에 도달하는지 판정하는 최우선 관문. 실패 시 이후가 무의미하다 |
| **Gate B** | 개인 기록 공간이 부계정을 대체할 만큼 편한지 판정하는 관문 |
| **수렴형 작업** | 완료 판정이 "구현됐다"가 아니라 "임계에 도달했다"인 작업. 스프린트로 종료를 판정할 수 없다 |
| **JTBD** (Jobs To Be Done) | 사용자가 제품을 "고용"해 완수하려는 과업. 사용자 스토리의 원천 |
| **AOS** (Adjusted Opportunity Score) | 중요도 × (1 − 만족도/5). 기회 크기 산정 지표 |
| **DOS** (Discovered Opportunity Score) | AOS × 시장 관련도. 사분면 배치에 사용 |
| **O1~O10** | 고객 성과 지표(Outcome). 5.2 참조 |
| **북극성 지표** | 기록 3개 이상을 축적한 사용자 수 (O7) |
| **p95 / p90** | 응답 시간 분포의 95 / 90 백분위수 |
| **IoU** (Intersection over Union) | 정답 구간과 탐지 구간의 겹침 비율. 정탐 판정 기준 |
| **MSCW** | Must / Should / Could / Won't Have 우선순위 체계 |
| `[SOURCE]` | 상위 문서(REF-01)에 직접 명시된 값 |
| `[HYPOTHESIS]` | 상위 문서가 1년차 가설·추정으로 명시한 값. 실측치가 아니다 |
| `[PROPOSED]` | 이 SRS 또는 REF-02가 새로 제안하는 값. 상위 문서에 근거가 없다 |
| `[TBD]` | 추가 의사결정이 필요한 미정 상태 |

## 1.4 References

| ID | 문서 | 역할 |
| --- | --- | --- |
| **REF-01** | `VPS_v0_3.html` — Value Proposition v0.3 | **Source of Truth.** Core Job · Outcome · 차별점 · MVP 범위의 원천 |
| **REF-02** | `PRD/HILiT_PRD_v0.1.md` — PRD v0.1 | 요구사항 도출 원천. 실패 경로 AC · ADR · 기준선 계획 |
| **REF-03** | `hilit-prd-v1_0.html` — 팀 PRD v1.0 | 요구사항 도출 원천 (팀 작업) |
| **REF-04** | `hilit-srs-v1_0.html` — 팀 SRS v1.0 | **ID 체계·운영 시나리오·추적성 매트릭스의 기준** |
| **REF-05** | ISO/IEC/IEEE 29148:2018 | 문서 구조 및 요구사항 품질 기준 |
| **REF-06** | `reference/SRS-example-AD-Core-Platform.md` | 사내 SRS 양식 — 절 구성 · 9열 표 서식 · ID 체계 |
| **REF-07** | `페르소나 스펙트럼/` (7건) | 이용자 클래스(2.2)의 원천 |
| **REF-08** | `고객 여정지도/01_고객여정지도_하일릿-페르소나-6인.md` | 운영 시나리오(3.4)의 원천 |
| **REF-09** | `JTBD/01_인터뷰-문항지_하일릿.md` | 사용자 스토리의 원천 |
| **REF-10** | `경쟁사 분석/` (3건) | 차별점 판정 근거 |
| **REF-11** | `기술 검토/01_화질리스크_정량계산.md` | 구도 보정의 물리적 상한 근거 |
| **REF-12** | `시장기회분석/01_AOS-DOS_매트릭스_하일릿.md` | 기회 점수 산정 |

> **REF-05는 저장소에 포함하지 않는다.** IEEE 라이선스 제한 문서로 공개 배포가 저작권 위반이다. 조항 내용은 본문에 인용 형태로만 반영했다.

## 1.5 Constraints

ADR(설계 결정)·제약을 여기에 통합한다 (REF-05 §9.6.7 · §9.6.16).

### 1.5.1 제품 정의상 제약

| # | 제약 | 위반 시 결과 |
| --- | --- | --- |
| **C1** | 앱 내 촬영 기능을 제공하지 않는다 | Core Job "이미 찍어둔"이 깨지고 촬영 앱이 된다 |
| **C2** | **최종 선택을 기계가 대신하지 않는다** | 자동 하이라이트 생성기가 되어 기존 대안과 같아진다 |
| **C3** | 사용자가 외부에서 음원을 반입하는 경로를 제공하지 않는다 | 저작권 리스크 · 앱 이탈 |
| **C4** | 게시 이후의 결과를 다루지 않는다 | 범위 확산 |
| **C5** | **전용 하드웨어를 요구하지 않는다** | 차별점 D3의 전제가 무너진다 |
| **C6** | 음원 라이선스 계약이 미체결이다 | REQ-FUNC-007의 **배포 차단 요인.** 개발 일정이 아니라 계약이 병목 |

### 1.5.2 확정된 설계 결정 (ADR)

| # | 결정 | 상태 |
| --- | --- | :---: |
| **ADR-1** | 추적 모델 조달 | ⏸ **보류** — Gate A 결과에 종속 |
| **ADR-2** | 처리 방식 | ✅ **확정 — 서버 GPU** |
| **ADR-3** | 후보 생성 해상도 | ✅ **확정 — 저해상도 1차 → 선택분만 고화질** |
| **ADR-4** | 공개 범위 기본값 | ⏸ **보류** — 양방향 리스크, Gate B에서 판정 |
| **ADR-5** | 외부 내보내기 | ⏸ **보류** — 상위 문서 무언급 |

**ADR-2 · 처리 방식은 서버 GPU로 한다** → REQ-NF-020

- **맥락** : 4.2의 응답 시간·가용성·원가 요구사항이 이미 서버 처리를 전제로 기술되어 있다. 이 결정은 새 선택이 아니라 **암묵적 전제의 명문화**다
- **근거** : ① 40분·4GB 원본을 단말에서 처리하면 발열·배터리·소요 시간이 사용자 경험을 지배한다 ② 탐지 모델은 Gate A 판정 대상이라 자주 교체·재학습해야 하는데, **온디바이스는 모델 갱신이 앱 배포 주기에 묶인다** — 수렴형 작업(4.3)과 배포 주기가 충돌한다 ③ 전용 하드웨어를 쓰지 않는 것이 차별점이지, 처리 부담을 단말에 전가하는 것이 차별점은 아니다
- **감수하는 것** : 원본이 서버로 전송되므로 **얼굴 정보 처리(REQ-NF-010)·삭제 요청(REQ-NF-022)의 부담이 온디바이스 대비 커진다.** GPU 원가가 사용량에 비례한다(RISK-03)
- **재검토 조건** : 편당 처리 원가가 REQ-NF-013의 상한을 초과하면 하이브리드(1차 탐지만 온디바이스)를 재검토한다

**ADR-3 · 후보는 저해상도로 생성하고 선택분만 고화질로 처리한다** → REQ-NF-019

- **맥락** : 후보 전량을 고화질 처리하면 실제로 쓰이지 않는 대부분의 처리비가 버려진다
- **근거** : ① RISK-03을 직접 완화하는 유일한 설계 수단이다 ② **최종 선택권이 사용자에게 있으므로**(C2) 선택 이전 단계에 고화질이 필요 없다 — 후보 화면에서 사용자가 판단하는 것은 화질이 아니라 **구간의 적합성**이다 ③ 후보 목록의 목적은 감상이 아니라 탐색이다
- **감수하는 것** : 선택 시점에 최종 화질을 알 수 없어 **만족도가 선택 단계에서 예측되지 않는다.** 선택 → 렌더 → 재선택 루프가 발생하면 그 비용이 절감분을 잠식할 수 있다(RISK-06)
- **재검토 조건** : `reselection_started` 비율이 높게 나오면 후보 미리보기 해상도 상향을 검토한다. **이 결정의 검증 지표는 원가가 아니라 재선택률이다**

**보류 3건 — 지금 결정하지 않는 이유**

| # | 보류 근거 |
| --- | --- |
| **ADR-1** 추적 모델 조달 | **Gate A 결과에 종속된다.** 공개 모델로 85%가 달성되면 자체 학습이 불필요하고, 미달이면 모든 선택지를 같은 조건에서 재평가해야 한다. 지금 결정하면 어느 쪽이든 근거가 없다 |
| **ADR-4** 공개 범위 기본값 | 논리는 `private`을 가리킨다 — P3 · O5 · 제품 정의가 모두 그쪽이다. **그러나 그 경우 피드에 볼 것이 없어져 REQ-FUNC-034가 상시 발동하고 재방문 루프가 첫 진입에서 끊긴다.** 한쪽을 고르면 다른 쪽이 깨지는 **양방향 리스크**라 논리로 해소되지 않는다 → Gate B에서 판정 |
| **ADR-5** 외부 내보내기 | 🔴 **REF-01에 근거가 없다.** 허용하면 UC-05(크리에이터)의 진입 조건이 되지만 Core Job "앱을 옮기지 않고 완성"(REQ-FUNC-008)과 정면 충돌한다. 상위 문서가 침묵하는 사안을 SRS가 단독으로 결정할 수 없다 |

### 1.5.3 리스크

| # | 리스크 | 영향 | 완화 | 조기 경보 |
| --- | --- | --- | --- | --- |
| **RISK-01** | 등장 구간 탐지율이 85%에 미달한다 | 🔴 **치명 — 이후 전부 무의미** | Gate A를 최우선·단독 수행 | 탐지율 < 85% |
| **RISK-02** | 재식별 실패로 타인의 장면을 사용자 것으로 제공한다 | 🔴 치명 — 신뢰 즉시 붕괴 | 재식별·탐지 분리 계측 · 저신뢰 표시(REQ-FUNC-029) | 오탐률 `[TBD]` |
| **RISK-03** | 처리 물량 증가로 GPU 원가가 급증한다 | 🔴 높음 — 성장이 곧 적자 | 선택 후 고도화(REQ-NF-019) · 단가 조기 산정 | 편당 원가 `[TBD]` |
| **RISK-04** | 촬영 조건(거리·조도)에 따라 품질이 크게 갈린다 | 🔴 높음 | Gate A 테스트에 다양한 조건 포함 · 실패 시 원인 안내(REQ-FUNC-030) | 조건별 탐지율 편차 |
| **RISK-05** | 공개하지 않고 기록만 하는 사용자가 재방문하지 않는다 | 🟡 중간 | 소비 루프를 MVP에 포함 · 그룹으로 공개 문턱 완화 | O7 코호트 |
| **RISK-06** | 사용자가 후보를 신뢰하지 않아 전부 다시 고른다 | 🟡 중간 | `reselection_started` 계측 — **ADR-3의 검증 지표** | 재선택률 |
| **RISK-07** | 얼굴 정보 처리 방침 부재 상태로 공개 기능이 배포된다 | 🔴 높음 | REQ-NF-010을 **CI 배포 차단 게이트**로 운영 | 산출물 4종 승인 상태 |

## 1.6 Assumptions

| # | 가정 | 검증 창구 | 상태 |
| --- | --- | --- | :---: |
| **A1** | 대상 사용자는 이미 원본 영상을 보유하고 있다 | 세그먼트 정의 자체가 이 가정 | `[SOURCE]` |
| **A2** | 첫 카테고리는 농구·구기 종목이다 | REF-01 선별 기준 | `[SOURCE]` |
| **A3** | 후보 약 30개가 적정 규모다 | 🔴 **초안값** — 후보 15/30/50 A/B/n 테스트 | `[SOURCE·초안]` |
| **A4** | 사용자는 "나만 보기"를 실제로 사용한다 (O5 30%) | Gate B | `[HYPOTHESIS]` |
| **A5** | 그룹 기능이 부계정을 대체한다 | Gate B | `[SOURCE]` |
| **A6** | **"한국 사용자가 원본을 쌓아두고 게시하지 않는다"가 사실이다** | 🔴 **국내 정량 근거 0건** — 6.4.4 | `[TBD]` |

> **A6이 가장 위험한 가정이다.** 남은 정량 근거 9건은 전부 마케터·해외 크리에이터·미국 이용자 대상의 **대리 지표**다. **"한국 사람이 찍어놓고 안 올린다"를 증명한 국내 자료가 한 건도 없다.** 1.1의 실패 수준(원본 47편 → 게시 2건, 비공개 기록 0%)은 현재 가상 인터뷰 예시에 의존한다. **이 가정이 뒤집히면 1.1의 문제 정의부터 재검토해야 한다.**

---

# 2. Stakeholders

## 2.1 이해관계자

| 역할 | 부서 | 책임 | 관심사 |
| --- | --- | --- | --- |
| 제품 리드 (PM) | 제품팀 | 요구사항 우선순위 · 범위 경계 판정 · Gate 통과 승인 | 북극성 지표 달성 · 범위 확산 방지 |
| 제품 아키텍트 | 제품팀 | 요구사항 문서화 · 상위 문서와의 정합성 유지 | 추적성 · Core Job 3조건 보존 |
| AI 리드 | AI팀 | 탐지·재식별·구도 보정 모델 · Gate A 판정 지표 정의 | 탐지율 85% · 오탐률 상한 |
| 백엔드 리드 | 백엔드팀 | 처리 파이프라인 · 큐 · 스토리지 · 편당 단가 | 가용성 · 완주율 · 원가 |
| 백엔드 온콜 | 백엔드팀 | 가용성·저장 성공률 상시 감시 및 1차 대응 | 대응 SLA 준수 |
| 클라이언트 개발자 | 클라이언트팀 | 앱 셸 · 선택 UI · 피드 · 업로드 재개 | 진입 응답 시간 · 이탈률 |
| 디자인 리드 | 디자인팀 | 공개 범위 UX · 후보 검토 화면 · 첫 저장 경험 | 첫 저장 이탈 · 기본값 설계 |
| 보안 담당자 | 보안팀 | 암호화 · 접근 통제 · 공개 범위 서버 측 강제 검증 | 우회 시도 0건 |
| 사업 담당자 | 사업팀 | 음원 라이선스 조달 · 확장 종목 결정 · 원가 상한 | 계약 · 손익 |
| 법무 담당자 | 법무팀 | 얼굴 정보 처리 · 미성년자 정책 · 신고 처리 절차 | 규제 준수 · 배포 게이트 |
| QA 담당자 | 품질팀 | 인수 기준 검증 · 실패 경로 회귀 | 테스트 커버리지 |

## 2.2 이용자 클래스 및 특성

> 이 절은 이용자 특성만 기술하며 **구체적 요구사항을 명시하지 않는다** (REF-05 §9.6.6). 대응 요구사항 ID만 참조한다.

| 클래스 | 대표 | 특성 | 문제 | 대응 요구사항 |
| --- | --- | --- | --- | --- |
| **UC-01 기록형 동호인** | 26 · 직장인 · 주 2회 · 본계정+부계정 | 원본이 쌓이지만 게시로 이어지지 않음. 계정을 쪼개 운영 | P1 · P2 · P3 | REQ-FUNC-001~010 |
| **UC-02 촬영 담당 겸 참가자** | 22 · 동아리 주장 | 팀원 다수를 손으로 찾는 것이 불가능. **촬영 담당이라 본인 기록만 없음** | P1 | REQ-FUNC-002~005 · 013 |
| **UC-03 저장공간 압박형** | 34 · 자영업 · 액션캠 50분·4GB | 남길 것은 15초인데 원본을 지우지 못함. **공개 의사 없음** | P1 · P3 | REQ-FUNC-009 · 010 · 019 · 035 |
| **UC-04 편집 포기형** | 28 · 사무직 · 게시 연 3회 | 컷·자막·음악에 30분 넘어 중도 포기 | P1 | REQ-FUNC-006~008 |
| **UC-05 크리에이터** | 24 · 팔로워 8,200 | 촬영 1시간 + 편집 3시간. 외주 지출 발생 | P1 | REQ-FUNC-003~008 |
| **UC-06 팀 운영자** | 30 · 팀원 12명 | 팀원 다수가 각자 원하나 편집 인력 1명. 팀 계정 하나라 개인 기록이 남지 않음 | P1 · P3 | REQ-FUNC-010 · 013 · 014 |

> **UC-02·UC-06은 본 범위에서 절반만 충족된다.** 완전 충족은 팀 공유 편집(REQ-FUNC-024)이 필요하나 **넷이 전부 미정**이라 제외했다. 본 범위는 **본인 기록 생성**과 **각 구성원의 개별 계정 처리** 경로만 지원한다.

---

# 3. System Context and Interfaces

## 3.1 External Systems

| 시스템 | 용도 | 대응 요구사항 | 상태 |
| --- | --- | --- | :---: |
| 객체 스토리지 | 원본 · 중간 산출물 · 결과물 보관 | REQ-FUNC-001 · REQ-NF-011 | `[PROPOSED]` |
| GPU 인프라 | 탐지 · 재식별 · 리프레이밍 · 렌더 | REQ-FUNC-002 · 003 · 006 · 008 | `[PROPOSED]` |
| 음원 라이선스 제공자 | 음악 라이브러리 | REQ-FUNC-007 | 🔴 **`[TBD]` 계약 미체결** |
| 카카오톡 · OS 공유 시트 | 공유 링크 전달 | REQ-FUNC-017 | `[PROPOSED]` |
| 외부 플랫폼 발행 | — | ADR-5 | 🔴 **`[TBD]` REF-01 무언급** |

> **하드웨어 인터페이스는 해당 없다** (REF-05 §9.6.4.3). 전용 카메라·전용 단말을 요구하지 않는 것이 차별점의 전제이며(C5), 입력은 사용자가 이미 보유한 파일이다.
>
> **메모리 제약도 별도로 규정하지 않는다** (§9.6.4.6). 이 시스템의 자원 제약은 메모리 용량이 아니라 **GPU 처리량과 편당 단가**로 표현되며, REQ-NF-013으로 대체한다.

## 3.2 Client Applications

| 클라이언트 | 구성 | 대응 요구사항 |
| --- | --- | --- |
| 모바일 앱 (Client Shell) | 3탭 내비게이션 — **팔로잉 · 추천 · 그룹** · 가운데 `+`가 편집·업로드 진입 · 마이페이지 | REQ-FUNC-011 · REQ-NF-001 |

**진입 규칙** — 앱 실행 시 **로그인 화면 없이 팔로잉 탭에서 영상이 바로 재생**된다. 첫 프레임까지 p95 ≤ 1.5초 (REQ-NF-001).

## 3.3 API Overview

| 서비스 | 책임 | 주요 엔드포인트 |
| --- | --- | --- |
| **Media Ingest Service** | 업로드 · 청크 · 이어올리기 · 코덱 검증 | `POST /videos` · `PATCH /videos/{id}/chunks` |
| **Vision Tracking Engine** | 대상 지정 · 재식별 · 등장 구간 탐지 · 리프레이밍 | `POST /videos/{id}/subject` · `POST /videos/{id}/detect` |
| **Highlight Composer** | 후보 산출 · 선택 · 음악 · 렌더 | `GET /videos/{id}/candidates` · `POST /records` |
| **Record Store Service** | 기록 저장 · 공개 범위 강제 · 그룹 | `PATCH /records/{id}/visibility` · `POST /groups` |
| **Social Graph Service** | 팔로우 관계 | `POST /follows` |
| **Feed Service** | 피드 구성 · 반응 · 공유 링크 | `GET /feed` · `POST /records/{id}/reactions` |
| **Telemetry Service** | 계측 · 게이트 지표 집계 · 알림 | `POST /events` |

전체 목록은 **6.1**에 있다.

## 3.4 Interaction Sequences

> **시퀀스 다이어그램 읽는 법** — 위쪽 가로줄이 참여자(사람·서비스), 아래로 내려가는 세로선이 시간이다. 가로 화살표는 요청·응답이고, `alt`로 묶인 영역은 **조건에 따라 갈리는 분기**다.

### 3.4.1 원본 업로드 및 등장 구간 탐지

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as Client Shell
    participant MI as Media Ingest
    participant Q as Processing Queue
    participant VT as Vision Tracking
    U->>C: 원본 선택 (40분·4GB)
    C->>MI: POST /videos
    MI-->>C: 코덱 검증 결과
    alt 미지원 코덱
        MI-->>U: 사유 안내 · GPU 작업 생성 0건
    else 지원 코덱
        C->>MI: PATCH /videos/{id}/chunks (반복)
        U->>C: 본인 1회 지정
        C->>VT: POST /videos/{id}/subject
        C->>Q: POST /videos/{id}/detect
        Q->>VT: 탐지 작업 배정
        VT->>VT: 재식별 + 등장 구간 탐지
        VT-->>C: detection_completed
    end
```

### 3.4.2 후보 선택 및 완성

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as Client Shell
    participant HC as Highlight Composer
    participant VT as Vision Tracking
    C->>HC: GET /videos/{id}/candidates
    HC-->>C: 후보 목록 (저해상도 · 신뢰도 플래그)
    Note over C: selection_opened
    U->>C: 후보 선택 · 제외
    U->>C: 음악 선택
    C->>HC: POST /records
    HC->>VT: 선택분만 원본 해상도 리프레이밍
    VT-->>HC: 보정 결과
    HC->>HC: 음악 병합 · 렌더
    alt 렌더 실패
        HC-->>C: 선택 상태 보존 · 사유 안내
    else 렌더 성공
        HC-->>C: render_succeeded
    end
```

### 3.4.3 기록 저장 및 공개 범위 지정

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as Client Shell
    participant HC as Highlight Composer
    participant RS as Record Store
    HC->>RS: 기록 생성 요청
    RS->>RS: 기록 행 생성 (기본 visibility=private)
    RS-->>C: record_saved
    Note over RS: 공개 범위를 정하기 전에<br/>기록은 이미 존재한다
    U->>C: 공개 범위 선택
    C->>RS: PATCH /records/{id}/visibility
    RS-->>C: 반영 완료
```

### 3.4.4 피드 조회와 공개 범위 강제

```mermaid
sequenceDiagram
    actor V as 조회자
    participant C as Client Shell
    participant FS as Feed Service
    participant VE as VisibilityEnforcer
    participant RS as Record Store
    V->>C: 피드 열기
    C->>FS: GET /feed?tab=following
    FS->>VE: 조회 권한 판정 요청
    VE->>RS: visibility · group_ids 조회
    RS-->>VE: 범위 정보
    alt 권한 없음
        VE-->>FS: 제외 (자원 존재를 노출하지 않음)
    else 권한 있음
        VE-->>FS: 허용
    end
    FS-->>C: 필터링된 피드
    alt 결과 0건
        C-->>V: 본인 기록 또는 추천 노출
    end
```

---

# 4. Specific Requirements

## 4.1 Functional Requirements

**REQ-FUNC-001~026은 REF-04(팀 SRS v1.0)의 식별자와 의미를 보존한다.** REQ-FUNC-027 이후가 v1.1 증분이다.

| ID | 제목 | 출처 | 우선순위 | 유형 | 검증 방식 | 인수 기준 | 상태 | 담당자 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **REQ-FUNC-001** | 장시간 원본 영상 업로드 | US-1 · REF-03 4-1 (F1) | Must Have | Functional | 1) 대용량 업로드 테스트<br>2) 형식 수용 검증<br>3) QA 검증 | 40~50분·4GB급 원본을 업로드할 수 있어야 한다 | Draft | 백엔드 리드 |
| **REQ-FUNC-002** | 추적 대상 지정 및 재식별 | US-1 · REF-03 4-1 (F2a) | Must Have | Functional | 1) 재식별 정확도 테스트<br>2) 가림 구간 라벨 정답셋 검증<br>3) QA 검증 | 사용자가 자기를 **1회 지정**하면, 대상이 가려지거나 화면을 벗어났다 다시 나타나도 **동일 인물로 인식**해야 한다 | Draft | AI 리드 |
| **REQ-FUNC-003** | 사용자 등장 구간 자동 탐지 | US-1 · REF-03 4-1 (F2b) | Must Have | Functional | 1) 정답셋 회귀 배치<br>2) **IoU 기반 정탐 판정**<br>3) QA 검증 | 사람이 표시한 정답 구간 대비 탐지 구간 비율이 **85% 이상**이어야 한다 `[HYPOTHESIS · Gate A 판정]` | Draft | AI 리드 |
| **REQ-FUNC-004** | 장면 후보 제시 | US-1 · REF-03 4-1 (F3) | Must Have | Functional | 1) 후보 산출 테스트<br>2) 온전도 우선순위 검증<br>3) QA 검증 | 탐지 결과를 사용자가 판단 가능한 개수의 후보로 좁혀 제시해야 하며, 각 후보에 **시작·종료 타임코드**가 표시되어야 한다. 온전히 잡힌 구간을 우선 배열한다 | Draft | AI 리드 |
| **REQ-FUNC-005** | 사용자 장면 선택 | US-1 · REF-03 4-1 (F4) | Must Have | Functional | 1) 선택 이벤트 검증<br>2) **자동 확정 차단 테스트**<br>3) QA 검증 | **최종 선택권은 사람에게 있어야 한다.** 사용자의 명시적 선택 없이 결과물이 확정되어서는 안 되며, 제시된 후보 **100% 전부**에 선택·제외가 가능해야 한다 | Draft | 제품 아키텍트 |
| **REQ-FUNC-006** | 사용자 중심 크롭·리프레이밍 | US-3 · REF-03 4-1 (F5a) | Must Have | Functional | 1) 주관 평가(5점 척도)<br>2) 출력 해상도 검증<br>3) QA 검증 | 화면 구석에 작게 잡힌 대상을 **중앙·확대 배치**해 세로 숏폼으로 출력해야 한다 | Draft | AI 리드 |
| **REQ-FUNC-007** | 음악 라이브러리 | US-3 · REF-03 4-1 (F18a) | Must Have | Functional | 1) 곡 선택·삽입 테스트<br>2) 저작권 메타 검증<br>3) QA 검증 | **저작권이 정리된 곡만** 앱 안에서 제공해야 하며, 사용자가 외부에서 곡을 반입하는 경로를 열어서는 안 된다. 라이선스 문서 확보율 **100%** · 삽입 성공률 **≥ 99%** · **곡 수 하한은 라이선스 조달 확정 후 정한다** `[TBD]` | Draft | 사업 담당자 |
| **REQ-FUNC-008** | 합치기 및 렌더링 | US-3 · REF-03 4-1 (F6) | Must Have | Functional | 1) 렌더 시간 측정<br>2) 실패 복구 테스트<br>3) QA 검증 | 선택된 장면이 하나의 완성 영상으로 합쳐져야 하며, 업로드부터 완성까지 **외부 앱 전환 이벤트 0건**이어야 한다 | Draft | 백엔드 리드 |
| **REQ-FUNC-009** | 개인 기록 자동 저장 | US-2 · REF-03 4-1 (F7) | Must Have | Functional | 1) 저장 성공률 측정<br>2) **공개 범위 결정 전 존재 검증**<br>3) QA 검증 | **공개 범위를 정하기 전에 이미 기록이 저장돼 있어야 한다.** 게시하지 않은 결과물도 동일하게 보관된다 | Draft | 백엔드 리드 |
| **REQ-FUNC-010** | 기록 단위 공개 범위 | US-2 · REF-03 4-1 (F8) | Must Have | Functional | 1) 3단계 전환 테스트<br>2) 기본값 검증<br>3) QA 검증 | 기록마다 **전체공개 / 그룹에만 공개 / 나만 보기**를 선택할 수 있어야 한다. 미선택 시 기본값은 **나만 보기**다 `[PROPOSED · ADR-4 보류]` | Draft | 디자인 리드 |
| **REQ-FUNC-011** | 앱 셸 — 3탭 내비 · 마이페이지 | US-5 · REF-03 4-1 (F22) | Must Have | Functional | 1) 진입 시간 측정<br>2) 탭 전환 테스트<br>3) QA 검증 | 앱 진입 시 **로그인 화면 없이 팔로잉 탭**에서 영상이 재생되어야 한다. 탭은 팔로잉·추천·그룹 3종이며 가운데 `+`가 편집·업로드 진입점이다 | Draft | 클라이언트 개발자 |
| **REQ-FUNC-012** | 팔로워 · 팔로잉 관계 | US-5 · REF-03 4-1 (F11) | Must Have | Functional | 1) 관계 CRUD 테스트<br>2) 공개 범위 경계 검증<br>3) QA 검증 | 관계는 **공개 기록만** 정해야 한다. 팔로우는 단방향이며 **팔로우 관계만으로 그룹·비공개 기록에 접근할 수 없다** | Draft | 백엔드 리드 |
| **REQ-FUNC-013** | 그룹 — 소그룹 공유 | US-4 · REF-03 4-1 (F23) | Must Have | Functional | 1) 생성·초대·탈퇴 테스트<br>2) **3경로 노출 차단 검증**<br>3) QA 검증 | 승인 절차 없이 생성되며 **인원 상한 20명**(생성자 포함)이다. 그룹 공개 기록은 구성원에게만 노출되어야 한다 | Draft | 백엔드 리드 |
| **REQ-FUNC-014** | 피드 — 팔로잉 · 추천 · 그룹 | US-5 · REF-03 4-1 (F13) | Must Have | Functional | 1) 피드 구성 테스트<br>2) 빈 피드 대체 노출 검증<br>3) QA 검증 | MVP는 **팔로잉·인기 기준**으로 구성한다. 취향 설문 반영은 본 범위에 포함하지 않는다 | Draft | 백엔드 리드 |
| **REQ-FUNC-015** | 좋아요 | US-5 · REF-03 4-1 (F19) | Must Have | Functional | 1) 반응 기록 테스트<br>2) 공개 범위 연동 검증<br>3) QA 검증 | **공개 범위 안에서만** 노출되어야 한다. **"나만 보기" 기록에 반응 UI가 붙어서는 안 된다** | Draft | 클라이언트 개발자 |
| **REQ-FUNC-016** | 댓글 및 신고 | US-5 · REF-03 4-1 (F20) | Must Have | Functional | 1) 댓글 CRUD 테스트<br>2) 신고 접수 테스트<br>3) QA 검증 | 댓글에 신고 기능이 포함되어야 하며 **접수 성공률 ≥ 99%**. **신고 처리 절차는 미정**이므로 접수와 이력 보존까지만 구현한다 `[TBD]` | Draft | 법무 담당자 |
| **REQ-FUNC-017** | 공유 — 링크 · 카카오톡/메시지 | US-5 · REF-03 4-1 (F21) | Must Have | Functional | 1) 링크 생성 테스트<br>2) **공개 범위 승계 검증**<br>3) QA 검증 | 공유 링크도 **기록의 공개 범위를 따라야 한다.** 비공개 기록의 링크는 발급되지 않거나 접근이 거부되어야 한다 | Draft | 클라이언트 개발자 |
| **REQ-FUNC-018** | 촬영 노하우 기반 구도 규칙 | REF-03 4-1 (F5b) | Should Have | Functional | 1) 구도 규칙 적용 테스트<br>2) 주관 평가 비교<br>3) QA 검증 | 추적 좌표 활용을 넘어 촬영 노하우 기반 구도·앵글 연출을 적용해야 한다 | Draft | AI 리드 |
| **REQ-FUNC-019** | 원본 삭제 안내 및 저장공간 회수 | US-2 · REF-03 4-1 (F9) | Should Have | Functional | 1) 삭제 안내 노출 테스트<br>2) 실행률 측정<br>3) QA 검증 | 결과물 확보 후 원본 삭제를 안내해야 하며, 삭제 실행률을 계측해야 한다 | Draft | 클라이언트 개발자 |
| **REQ-FUNC-020** | 기록 타임라인 (날짜별 축적 뷰) | REF-03 4-1 (F10) | Should Have | Functional | 1) 타임라인 렌더 테스트<br>2) 정렬 검증<br>3) QA 검증 | 날짜별로 기록 축적을 확인할 수 있는 뷰를 제공해야 한다 | Draft | 클라이언트 개발자 |
| **REQ-FUNC-021** | 온보딩 카테고리 취향 설문 | REF-03 4-1 (F12) | Should Have | Functional | 1) 설문 흐름 테스트<br>2) 피드 반영 검증<br>3) QA 검증 | 취향 설문 결과가 추천 피드 구성에 반영되어야 한다 | Draft | 디자인 리드 |
| **REQ-FUNC-022** | 카테고리별 조회수 랭킹 | REF-03 4-1 (F15) | Should Have | Functional | 1) 랭킹 산정 테스트<br>2) 노출 정책 검증<br>3) QA 검증 | 시점은 MVP 직후로 확정했으나 **도입 여부 자체는 미정**이다 `[TBD]` | Draft | 제품 리드 |
| **REQ-FUNC-023** | 선택 데이터 학습 기반 정확도 개선 | REF-03 4-1 (F14) | Could Have | Functional | 1) 학습 파이프라인 테스트<br>2) 정확도 개선 측정<br>3) QA 검증 | 사용자 선택 데이터가 축적되어 탐지·후보 순위 품질을 개선해야 한다. **선행 조건은 사용자 축적이며, 사용자가 없으면 학습 데이터가 생기지 않는다** | Draft | AI 리드 |
| **REQ-FUNC-024** | 팀 공유 편집 (한 원본 다중 사용자) | REF-03 4-1 (F16) | **Won't Have (P3)** | Functional | 기획 확정 후 재판정 | 팀 계정 · 원본 공유 권한 · 얼굴 정보 동의 · 인원 비례 원가 **넷이 전부 미정**이다 | Draft | 제품 리드 |
| **REQ-FUNC-025** | 촬영 가이드 | REF-03 4-1 (F17) | **Won't Have (P3)** | Functional | 기획 확정 후 재판정 | 원본이 없는 사용자를 유입시키기 위한 기능. 본 범위에서 제외한다 | Draft | 제품 리드 |
| **REQ-FUNC-026** | 자막 편집 | REF-03 4-1 (F18b) | **Won't Have (P3)** | Functional | 기획 확정 후 재판정 | 기획 미정. 음악(REQ-FUNC-007)과 분리해 본 범위에서 제외한다 | Draft | 제품 리드 |
| **REQ-FUNC-027** | 업로드 이어올리기 | REF-02 AC1-4 · AF-2<br>*(REQ-FUNC-001에서 분리)* | Must Have | Functional | 1) 네트워크 중단 재개 테스트<br>2) 진행률 보존 검증<br>3) QA 검증 | 업로드가 중단된 후 재시도하면 **중단 지점부터** 재개되어야 한다 | Proposed | 백엔드 리드 |
| **REQ-FUNC-028** | 미지원 형식 사전 거부 | REF-02 AF-1<br>*(REQ-FUNC-001에서 분리)* | Must Have | Functional | 1) 미지원 코덱 거부 테스트<br>2) 사전 판별 시점 검증<br>3) QA 검증 | 지원하지 않는 코덱·컨테이너는 **업로드 개시 전에** 거부하고 지원 형식과 변환 방법을 안내해야 한다. **GPU 작업 생성 0건** — 업로드 완료 후 실패로 알리는 동작은 허용하지 않는다 | Proposed | 클라이언트 개발자 |
| **REQ-FUNC-029** | 저신뢰 재식별 표시 및 제외 | REF-02 AF-4 · RISK-02<br>*(REQ-FUNC-002에서 분리)* | Must Have | Functional | 1) 임계 미만 구간 처리 테스트<br>2) 표시 일관성 검증<br>3) QA 검증 | 재식별 신뢰도가 임계 미만인 후보는 **제외하거나 저신뢰로 표시**해야 한다. **타인의 장면을 아무 표시 없이 후보에 섞어서는 안 된다** | Proposed | AI 리드 |
| **REQ-FUNC-030** | 탐지 결과 0건 처리 | REF-02 AF-3 | Must Have | Functional | 1) 0건 시나리오 테스트<br>2) 원인 안내 검증<br>3) QA 검증 | 탐지 결과가 0건인 경우 빈 화면 대신 **원인 후보**(대상 미검출 · 촬영 거리 · 조도)와 다음 행동을 제시해야 한다 | Proposed | 디자인 리드 |
| **REQ-FUNC-031** | 렌더 실패 시 상태 보존 | REF-02 AF-5<br>*(REQ-FUNC-008에서 분리)* | Must Have | Functional | 1) 렌더 실패 재시도 테스트<br>2) 선택 상태 영속성 검증<br>3) QA 검증 | 렌더 실패 후 재시도할 때 **선택 구간과 음악 설정이 보존**되어야 하며, **원본을 삭제해서는 안 된다**. 사용자에게 처음부터 다시 고르게 해서는 안 된다 | Proposed | 백엔드 리드 |
| **REQ-FUNC-032** | 단계별 체크포인트 재개 | REF-02 AF-6 | Must Have | Functional | 1) 앱 강제 종료 후 재진입 테스트<br>2) 단계 복원 검증<br>3) QA 검증 | 처리 중 앱이 종료되어도 재진입 시 **마지막 완료 단계**(업로드 / 탐지 / 선택 / 렌더)에서 재개되어야 한다 | Proposed | 백엔드 리드 |
| **REQ-FUNC-033** | 그룹 이탈 시 공유 회수 | REF-02 AF-7 | Must Have | Functional | 1) 구성원 이탈 시나리오 테스트<br>2) 링크 무효화 검증<br>3) QA 검증 | 그룹 구성원이 이탈하면 **본인 기록은 유지**되고 이탈자를 대상으로 발급된 **공유 링크는 회수**되어야 한다 | Proposed | 백엔드 리드 |
| **REQ-FUNC-034** | 빈 피드 대체 노출 | REF-02 AF-8<br>*(REQ-FUNC-014에서 분리)* | Must Have | Functional | 1) 팔로잉 0명 시나리오 테스트<br>2) 대체 콘텐츠 검증<br>3) QA 검증 | 팔로잉이 없거나 새 영상이 없을 때 빈 화면 대신 **본인 기록 또는 추천**을 노출해야 한다 | Proposed | 디자인 리드 |
| **REQ-FUNC-035** | 저장 용량 초과 안내 | REF-02 AF-9 | Should Have | Functional | 1) 쿼터 초과 시나리오 테스트<br>2) 정리 대상 제시 검증<br>3) QA 검증 | 저장 용량·쿼터를 초과한 경우 초과 사실과 **정리 가능한 대상**을 함께 제시해야 한다 | Proposed | 클라이언트 개발자 |

## 4.2 Non-Functional Requirements

| ID | 제목 | 출처 | 우선순위 | 유형 | 검증 방식 | 인수 기준 | 상태 | 담당자 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **REQ-NF-001** | 앱 진입 응답 시간 | REF-03 5-1 | Must Have | Performance | 콜드/웜 스타트 부하 테스트 | 앱 실행부터 첫 영상 프레임까지 **p95 ≤ 1.5초**, 빈 피드 노출률 **< 5%** `[PROPOSED]` | Draft | 클라이언트 개발자 |
| **REQ-NF-002** | 원본 업로드 소요 시간 | REF-03 5-1 | Must Have | Performance | LTE 환경 대용량 업로드 테스트 | 40분·4GB 원본 업로드 **p95 ≤ 6분**, 업로드 실패율 **< 0.5%**, 재개 성공률 **≥ 99%** `[PROPOSED]` | Draft | 백엔드 리드 |
| **REQ-NF-003** | 탐지 처리 시간 | REF-03 5-1 · REF-02 AC1-3 | Must Have | Performance | 정답셋 100편 배치 처리 시간 측정 | 40분 원본의 탐지 완료 **p95 ≤ 8분**. `detection_started` → `selection_opened` 구간의 **중앙값 ≤ 5분 · p90 ≤ 10분**을 만족하기 위한 상한이며, **앱 백그라운드 시간은 제외**한다 `[PROPOSED]` | Draft | AI 리드 |
| **REQ-NF-004** | 렌더링 시간 | REF-03 5-1 | Must Have | Performance | 15초 결과물 렌더 반복 측정 | 15초 결과물 렌더 **p95 ≤ 90초** `[PROPOSED]` | Draft | 백엔드 리드 |
| **REQ-NF-005** | 조회 API 응답 시간 | REF-03 5-1 | Must Have | Performance | API 부하 테스트 | 피드·목록 API **p95 ≤ 400ms**, 그룹 멤버 필터 **p95 ≤ 300ms**, 후보 목록 렌더 **p95 ≤ 1초**, 그룹 생성 **p95 ≤ 500ms** `[PROPOSED]` | Draft | 백엔드 리드 |
| **REQ-NF-006** | 가용성 | REF-03 5-2 | Must Have | Reliability | 월간 가용성 모니터링 및 SLA 검증 | 앱 셸·피드·기록 조회 월 가용성 **≥ 99.5%**, AI 처리 파이프라인 **≥ 99.0%**. 비동기 큐로 **처리 지연은 허용하되 유실은 불허**한다 `[PROPOSED]` | Draft | 백엔드 온콜 |
| **REQ-NF-007** | 기록 저장 성공률 | REF-03 5-2 · REF-02 AC2-3 | Must Have | Reliability | 저장 성공률 상시 모니터링 | 렌더 성공 대비 기록 저장 성공률 **≥ 99.9%**. **Gate B의 전제이며, 여기서 유실되면 제품의 핵심 주장이 무너진다.** 1차 대응 SLA **15분** `[PROPOSED]` | Draft | 백엔드 온콜 |
| **REQ-NF-008** | 오류율 및 재시도 정책 | REF-03 5-2 | Must Have | Reliability | 오류 주입 테스트 | API 5xx 오류율 **≤ 0.1%**. 처리 실패 시 원본·중간 산출물을 보존한 채 **재시도 3회 이상** 수행해야 한다 `[PROPOSED]` | Draft | 백엔드 리드 |
| **REQ-NF-009** | 공개 범위 서버 측 강제 | REF-03 5-3 | Must Have | Security | 회귀 테스트 스위트 · 우회 시도 테스트 | 공개 범위는 **서버에서 강제**해야 한다. **클라이언트 필터링만으로는 불충분하다.** 조작된 요청의 우회 성공 **0건**, 감사 로그 기록률 **100%** | Draft | 보안 담당자 |
| **REQ-NF-010** | 얼굴 정보 처리 동의 및 파기 | REF-03 5-3 | Must Have | Security | 법무 산출물 체크리스트 승인 | 동의 문구 · 보관 기간 · 파기 절차 · 처리 위탁 **4종이 전부 승인되기 전 프로덕션 배포 0건**. 미승인 시 **CI 배포를 차단**한다 `[TBD]` | Draft | 법무 담당자 |
| **REQ-NF-011** | 저장·전송 암호화 | REF-03 5-3 | Must Have | Security | 주간 스캔 및 핸드셰이크 검사 | 영상 저장 시 **at-rest 암호화**, 전송 구간 **TLS 1.2 이상**. 미암호화 객체 **0건**, TLS 1.1 이하 핸드셰이크 **0건** `[PROPOSED]` | Draft | 보안 담당자 |
| **REQ-NF-012** | 공유 링크 만료 및 회수 | REF-03 5-3 | Should Have | Security | 만료·회수 동작 테스트 | 공유 링크 기본 만료 **30일**, 만료 후 접근 성공 **0건**, 회수 반영 지연 **≤ 60초** `[PROPOSED]` | Draft | 백엔드 리드 |
| **REQ-NF-013** | 편당 처리 원가 가드레일 | REF-03 5-4 | Must Have | Cost | 처리 물량 대비 원가 추적 | 처리 물량은 **연 12만 편**(1만 명 × 월 1편)에 직접 비례한다 `[HYPOTHESIS]`. **편당 처리 원가 상한이 확정되기 전에는 무제한 업로드를 열지 않는다** `[TBD]` | Draft | 사업 담당자 |
| **REQ-NF-014** | 모니터링 · 알림 · 대응 SLA | REF-03 5-5 | Must Have | Operability | 알림 발화 테스트 및 대응 훈련 | 게이트 지표 · 저장 성공률 · 보안 위반 · 큐 적체 · 완주율 · 비용에 대해 **알림 기준 · 수신자 · 1차 대응 SLA**가 정의되어야 한다 | Draft | 백엔드 온콜 |
| **REQ-NF-015** | 유지보수성 — 열거형 확장 방식 | REF-03 6-1 | Could Have | Maintainability | 코드 리뷰 및 확장성 테스트 | 공개 범위·피드 탭·계측 이벤트 등 분류값을 추가할 때 **열거형(enum) 패턴**으로 코드 변경을 최소화해야 한다 | Draft | 백엔드 리드 |
| **REQ-NF-016** | 등장 구간 탐지율 | REF-02 5.3 · O9 | Must Have | AI Quality | 정답셋 대비 재현율 측정 (IoU 판정) | 등장 구간 탐지율이 **85% 이상**이어야 한다 `[HYPOTHESIS]`. **Gate A의 단독 판정 지표이며 미달 시 이후 개발을 중단한다** | Proposed | AI 리드 |
| **REQ-NF-017** | 재식별 오탐률 | REF-02 5.3 · RISK-02 | Must Have | AI Quality | 재식별·탐지 **분리 계측** | 재식별 오탐률의 상한을 정하고 그 이하를 유지해야 한다. **상한값은 미정이며** `[TBD]`, Gate A 실험에서 재식별과 탐지를 분리 계측해 실측 후 확정한다 | Proposed | AI 리드 |
| **REQ-NF-018** | 구도 보정 만족도 | REF-02 5.3 · O3 | Must Have | AI Quality | 완성 직후 1문항 설문 | 완성 직후 설문의 "잘 잡혔다" 응답이 **80% 이상**이어야 한다 `[HYPOTHESIS]` | Proposed | AI 리드 |
| **REQ-NF-019** | 선택 후 고도화 처리 | REF-02 ADR-3 | Must Have | Cost | 처리 단계별 해상도 검증 | 탐지·후보 생성은 **저해상도**로 수행하고, **사용자가 선택한 구간만** 원본 해상도로 구도 보정·렌더해야 한다. **후보 전량을 고화질 처리해서는 안 된다** | **Approved** | 백엔드 리드 |
| **REQ-NF-020** | 모델 갱신의 배포 독립성 | REF-02 ADR-2 | Must Have | Maintainability | 모델 교체 시나리오 검증 | 탐지·재식별 모델의 교체가 **클라이언트 앱 배포 주기에 종속되지 않아야 한다.** 모델은 서버 측에서 갱신 가능해야 한다 | **Approved** | AI 리드 |
| **REQ-NF-021** | 미성년자 이용 정책 | REF-02 5.4 | Must Have | Security | 법무 산출물 체크리스트 승인 | 최소 연령 · 연령 확인 방식 · 보호자 동의 경로 **3종이 전부 승인되기 전까지 가입 플로우를 배포할 수 없다** `[TBD]` | Proposed | 법무 담당자 |
| **REQ-NF-022** | 파이프라인 완주율 | REF-02 3.7 | Must Have | Observability | 완주율 집계 | `render_succeeded ÷ detection_started`가 **95% 이상**이어야 한다 `[PROPOSED]`. **개별 실패 요구사항(REQ-FUNC-028~035)이 잡지 못한 누수를 탐지하기 위한 상위 지표다** | Proposed | 백엔드 리드 |

> **`Approved` 2건**은 1.5.2 ADR에서 근거·감수 사항·재검토 조건을 갖춰 확정한 결정이다. 나머지는 Gate 통과 또는 미정 사항 해소 전까지 확정하지 않는다.
>
> **REQ-NF-022를 별도로 두는 이유** — REQ-FUNC-028~035는 각각 **알려진** 실패만 잡는다. 완주율은 **아직 이름 붙이지 못한 누수**까지 하나로 잡아낸다. 개별 실패 요구사항이 전부 통과하는데 완주율이 80%라면, 우리가 모르는 실패 경로가 있다는 뜻이다.

## 4.3 요구사항 의존성 및 구현 규모

> 확장 근거: REF-05 §9.6.9 Apportioning of requirements

```mermaid
flowchart LR
    subgraph T1["Gate A 트랙 — 수렴형"]
        A1["REQ-FUNC-002 · 029<br/>지정 · 재식별"]
        A2["REQ-FUNC-003<br/>등장 구간 탐지"]
        A3["REQ-FUNC-006<br/>구도 보정"]
    end
    subgraph T2["스프린트 트랙 — 완료형"]
        B1["REQ-FUNC-001 · 004 · 007<br/>008 · 011 · 013 · 014"]
        B2["REQ-FUNC-005 · 009 · 010<br/>012 · 015 · 016 · 017"]
    end
    A1 --> A2 --> A3
    A2 -.->|"후보 입력"| B1
    B1 --> B2
    style T1 fill:#ffe8e0,color:#111
    style T2 fill:#e8f0ff,color:#111
```

구현 규모는 **인·일로 환산하지 않는다.** 팀 속도 실측이 없으므로 상대 규모만 기술하며 첫 스프린트 종료 후 보정한다 `[PROPOSED]`.

| 규모 | 정의 | 1스프린트 적합성 | 대상 |
| :--: | --- | --- | --- |
| **S** | 기존 패턴 조합 · 신규 기술 위험 없음 | 한 스프린트에 복수 소화 | REQ-FUNC-005 · 009 · 010 · 012 · 015 · 016 · 017 |
| **M** | 신규 설계가 필요하나 **결과가 예측 가능** | 한 스프린트에 1건 | REQ-FUNC-001 · 004 · 007 · 008 · 011 · 013 · 014 · 027 |
| **L** | **모델 성능이 결과를 좌우** — 종료 조건이 정확도·만족도 | **부적합** | REQ-FUNC-002 · 003 · 006 · 023 |

> **L 4건을 일반 스프린트에 배치해서는 안 된다.** 완료 판정이 "구현됐다"가 아니라 **"85%에 도달했다"(REQ-NF-016) · "80%가 잘 잡혔다고 답했다"(REQ-NF-018)** 이기 때문이다. 정확도는 스프린트로 도달하는 것이 아니라 반복으로 **수렴**하므로, 일반 스프린트에 넣으면 **매 스프린트 미완으로 이월된다.**
>
> **두 트랙은 병렬로 진행한다.** 규모 S 7건은 탐지 결과 없이도 구현 가능하므로 Gate A를 기다릴 이유가 없다. **다만 Gate A가 실패하면 스프린트 트랙의 산출물은 일반 기록 앱으로 남는다** — 이것이 RISK-01을 치명으로 판정한 근거다.
>
> **REQ-FUNC-023은 규모 판정 이전 단계다.** 모델 작업인 데다 **학습할 선택 데이터가 사용자 없이는 생기지 않아 착수 자체가 불가능**하다. Could 유보의 실질 사유는 우선순위가 아니라 **선행 조건 부재**다.

## 4.4 표준 및 규제 준수

> 확장 근거: REF-05 §9.6.17 Standards compliance · §9.6.16 Design constraints

| 항목 | 요구 | 대응 | 상태 |
| --- | --- | --- | :---: |
| 저작권 (음원) | 라이선스가 확보된 곡만 제공. 곡별 사용 범위와 만료·회수 절차를 문서로 보유 | REQ-FUNC-007 | 🔴 `[TBD]` 계약 미체결 |
| 개인정보 — 얼굴 정보 | 동의 문구 · 보관 기간 · 파기 절차 · 처리 위탁 4종 승인 | REQ-NF-010 | 🔴 `[TBD]` 미수립 |
| 개인정보 — 정보주체 권리 | 삭제 요청 시 원본·파생물 전량 삭제 | REQ-NF-022 · 6.2 | `[PROPOSED]` |
| 개인정보 — 접근 통제 | 공개 범위 서버 측 강제 · 감사 로그 100% | REQ-NF-009 | `[PROPOSED]` |
| 전송 보안 | TLS 1.2 이상 · at-rest 암호화 | REQ-NF-011 | `[PROPOSED]` |
| 미성년자 보호 | 최소 연령 · 연령 확인 · 보호자 동의 3종 승인 | REQ-NF-021 | 🔴 `[TBD]` 미수립 |
| 유해 콘텐츠 대응 | 신고 접수 기능 제공. 처리 절차는 운영 정책 확정 후 | REQ-FUNC-016 | `[TBD]` |

> **REQ-NF-010 · 021은 "법무 검토 선행 필수"가 아니라 산출물 승인 게이트로 기술했다.** "검토했다"는 통과·실패를 판정할 수 없어 요구사항이 될 수 없고, **"명시한 산출물이 전부 승인 상태다"는 배포 파이프라인이 판정할 수 있기 때문이다.**

---

# 5. Traceability Matrix

## 5.1 Story ↔ Requirement ↔ Test Case

**본 매트릭스의 범위** — 1차 출시 대상인 **Must Have 요구사항**에 한정한다. 2차 이후 항목(REQ-FUNC-018~026 · REQ-NF-012 · 015)은 4.1·4.2의 우선순위 열을 참조한다. REQ-FUNC-024~026은 인수 기준이 "기획 확정 후 재판정"이므로 매트릭스에 행을 두지 않는다.

| Story | 요구사항 ID | 모듈 | 구현 컴포넌트 | 테스트 케이스 ID |
| --- | --- | --- | --- | --- |
| US-1 | REQ-FUNC-001 | Media Ingest Service | SourceVideoUploader | TC-FUNC-001 |
| US-1 | REQ-FUNC-002 | Vision Tracking Engine | SubjectReIdentifier | TC-FUNC-002 |
| US-1 | REQ-FUNC-003 | Vision Tracking Engine | AppearanceIntervalDetector | TC-FUNC-003 |
| US-1 | REQ-FUNC-004 | Highlight Composer | CandidateRanker | TC-FUNC-004 |
| US-1 | REQ-FUNC-005 | Highlight Composer | SelectionController | TC-FUNC-005 |
| US-3 | REQ-FUNC-006 | Vision Tracking Engine | SubjectReframer | TC-FUNC-006 |
| US-3 | REQ-FUNC-007 | Highlight Composer | MusicLibrary · LicenseRegistry | TC-FUNC-007 |
| US-3 | REQ-FUNC-008 | Highlight Composer | RenderPipeline | TC-FUNC-008 |
| US-2 | REQ-FUNC-009 | Record Store Service | RecordWriter | TC-FUNC-009 |
| US-2 | REQ-FUNC-010 | Record Store Service | VisibilityResolver | TC-FUNC-010 |
| US-5 | REQ-FUNC-011 | Client Shell | AppShell | TC-FUNC-011 |
| US-5 | REQ-FUNC-012 | Social Graph Service | FollowGraph | TC-FUNC-012 |
| US-4 | REQ-FUNC-013 | Record Store Service | GroupManager | TC-FUNC-013 |
| US-5 | REQ-FUNC-014 | Feed Service | FeedRanker | TC-FUNC-014 |
| US-5 | REQ-FUNC-015 | Feed Service | ReactionService | TC-FUNC-015 |
| US-5 | REQ-FUNC-016 | Feed Service | ReportIntake | TC-FUNC-016 |
| US-5 | REQ-FUNC-017 | Feed Service | ShareLinkIssuer | TC-FUNC-017 |
| US-1 | **REQ-FUNC-027** | Media Ingest Service | ResumeSessionManager | **TC-FUNC-027** |
| US-1 | **REQ-FUNC-028** | Media Ingest Service | CodecPreValidator | **TC-FUNC-028** |
| US-1 | **REQ-FUNC-029** | Vision Tracking Engine | ConfidenceGate | **TC-FUNC-029** |
| US-1 | **REQ-FUNC-030** | Highlight Composer | EmptyResultAdvisor | **TC-FUNC-030** |
| US-3 | **REQ-FUNC-031** | Highlight Composer | RenderStateStore | **TC-FUNC-031** |
| US-1 | **REQ-FUNC-032** | Processing Queue | CheckpointStore | **TC-FUNC-032** |
| US-4 | **REQ-FUNC-033** | Record Store Service | ShareLinkRevoker | **TC-FUNC-033** |
| US-5 | **REQ-FUNC-034** | Feed Service | FeedFallbackProvider | **TC-FUNC-034** |
| — | REQ-NF-001 | Client Shell | ColdStartProfiler | TC-NF-001 |
| — | REQ-NF-002 | Media Ingest Service | 설계 시 확정 | TC-NF-002 |
| — | REQ-NF-003 | Vision Tracking Engine | DetectionBenchmarkRunner | TC-NF-003 |
| — | REQ-NF-004 | Highlight Composer | 설계 시 확정 | TC-NF-004 |
| — | REQ-NF-005 | Feed Service · Highlight Composer · Social Graph Service | 설계 시 확정 | TC-NF-005 |
| — | REQ-NF-006 | 전 서비스 공통 *(책임자: 백엔드 온콜)* | 설계 시 확정 | TC-NF-006 |
| — | REQ-NF-007 | Record Store Service | PersistenceHealthMonitor | TC-NF-007 |
| — | REQ-NF-008 | 전 서비스 공통 *(책임자: 백엔드 리드)* | 설계 시 확정 | TC-NF-008 |
| — | REQ-NF-009 | Record Store Service | **VisibilityEnforcer (서버 측)** | TC-NF-009 |
| — | REQ-NF-010 | Vision Tracking Engine · Record Store Service | 설계 시 확정 | TC-NF-010 |
| — | REQ-NF-011 | 전 서비스 공통 *(책임자: 보안 담당자)* | 설계 시 확정 | TC-NF-011 |
| — | REQ-NF-013 | Telemetry Service | CostGuardrailMonitor | TC-NF-013 |
| — | REQ-NF-014 | Telemetry Service | AlertDispatcher | TC-NF-014 |
| — | **REQ-NF-016** | Vision Tracking Engine | ModelEvaluationHarness | **TC-NF-016** |
| — | **REQ-NF-017** | Vision Tracking Engine | ModelEvaluationHarness | **TC-NF-017** |
| — | **REQ-NF-018** | Vision Tracking Engine | SatisfactionSurveyCollector | **TC-NF-018** |
| — | **REQ-NF-019** | Vision Tracking Engine | ResolutionPolicy | **TC-NF-019** |
| — | **REQ-NF-020** | Vision Tracking Engine | ModelRegistry | **TC-NF-020** |
| — | **REQ-NF-021** | 정책 게이트 *(책임자: 법무 담당자)* | ReleaseGateChecklist | **TC-NF-021** |
| — | **REQ-NF-022** | Telemetry Service | PipelineCompletionMonitor | **TC-NF-022** |

> **전 서비스 공통 3건에 대하여** — REQ-NF-006(가용성) · 008(오류율·재시도) · 011(암호화)은 단일 서비스가 아니라 파이프라인 전 구간에 걸린다. **모듈이 `전 서비스 공통`인 행에는 단일 책임자를 함께 지정했다. 전원의 일은 아무의 일도 아니기 때문이다.**

## 5.2 Requirement ↔ 측정 지표

| 지표 | 정의 | 기준선 | 목표 | 대응 요구사항 | 상태 |
| --- | --- | ---: | ---: | --- | :---: |
| **O1** 체감 탐색 시간 | `detection_started` → `selection_opened` | 미측정 | 5분 | REQ-NF-003 | `[HYPOTHESIS]` |
| **O2** 완성 전환율 | 완성 건수 ÷ 업로드 건수 | 약 4% | 60% 이상 | REQ-FUNC-004~008 | `[HYPOTHESIS]` |
| **O3** 구도 만족도 | 완성 직후 1문항 긍정 응답률 | 측정 불가 | 80% 이상 | REQ-NF-018 | `[HYPOTHESIS]` |
| **O4** 원본 삭제율 | 완성 후 원본 삭제 비율 | 미측정 | 50% | REQ-FUNC-019 · 035 | `[HYPOTHESIS]` |
| **O5** 비공개 기록 비율 | `private` 기록 ÷ 전체 기록 | 0% | 30% | REQ-FUNC-009 · 010 | `[HYPOTHESIS]` |
| **O6** 월 기록 생성 | 사용자당 월 기록 건수 | 0.7건 | 4건 | REQ-FUNC-009 | `[HYPOTHESIS]` |
| **O7** **북극성** — 기록 3개 이상 사용자 | 월 코호트 집계 | **—** | 1만 명 | REQ-FUNC-009~017 | `[HYPOTHESIS]` |
| **O8** 편집 외주 지출 | 인터뷰 | 월 60만 원대 | 0원 | REQ-FUNC-003~008 | `[HYPOTHESIS]` |
| **O9** 등장 구간 탐지율 | 정답셋 대비 재현율 | 해당 없음 | 85% 이상 | REQ-NF-016 | `[HYPOTHESIS]` |
| **O10** 재촬영 횟수 | 결과물당 재촬영 | 1~3회 | 0회 | REQ-FUNC-006 | `[HYPOTHESIS]` |
| **S-완주** 파이프라인 완주율 | `render_succeeded ÷ detection_started` | 미측정 | 95% 이상 | REQ-NF-022 | `[PROPOSED]` |
| **S-원가** 편당 처리 원가 | 총 처리 비용 ÷ 처리 편수 | 미측정 | **`[TBD]`** | REQ-NF-013 · 019 | `[TBD]` |
| **S-재선택** 재선택률 | `reselection_started` ÷ `selection_opened` | 미측정 | **`[TBD]`** | ADR-3 검증 지표 | `[PROPOSED]` |

> **O7의 기준선은 대시(—)로 둔다.** 상위 문서가 비워둔 칸을 이 SRS가 구체값으로 채우지 않는다.
>
> **O7 1만 명은 첫 카테고리 단독으로 달성되지 않는다.** 촬영 습관이 있는 국내 농구 인구 약 3만~5만 명에 커뮤니티 침투율 10%를 적용하면 **약 4,000명으로 목표의 40%**다 `[SOURCE]`. 나머지 약 6,000명은 확장 종목에서 나오며, **확장 착수 시점은 임의 일정이 아니라 Gate A 통과에 연동**된다(6.6 Q11). 첫 카테고리에서 탐지가 실패하면 종목을 늘려도 같은 실패가 복제되기 때문이다.

---

# 6. Appendix

## 6.1 API Endpoint List

| 서비스 | 메서드 | 엔드포인트 | 설명 | 대응 요구사항 |
| --- | --- | --- | --- | --- |
| **Media Ingest** | POST | `/videos` | 원본 업로드 개시 · 코덱 검증 · 이어올리기 세션 생성 | REQ-FUNC-001 · 027 · 028 |
| **Media Ingest** | PATCH | `/videos/{id}/chunks` | 청크 업로드 · 진행률 갱신 | REQ-FUNC-027 |
| **Media Ingest** | DELETE | `/videos/{id}` | 원본 삭제 | REQ-FUNC-019 · REQ-NF-022 |
| **Vision Tracking** | POST | `/videos/{id}/subject` | 추적 대상 1회 지정 | REQ-FUNC-002 |
| **Vision Tracking** | POST | `/videos/{id}/detect` | 재식별 · 등장 구간 탐지 작업 등록 | REQ-FUNC-002 · 003 |
| **Highlight Composer** | GET | `/videos/{id}/candidates` | 후보 목록 조회 (신뢰도 플래그 포함) | REQ-FUNC-004 · 029 · 030 |
| **Highlight Composer** | GET | `/music` | 음악 라이브러리 목록 | REQ-FUNC-007 |
| **Highlight Composer** | POST | `/records` | 선택 확정 → 리프레이밍 · 렌더 · 기록 저장 | REQ-FUNC-005~009 · 031 |
| **Processing Queue** | GET | `/jobs/{id}` | 처리 작업 상태 · 체크포인트 조회 | REQ-FUNC-032 |
| **Record Store** | PATCH | `/records/{id}/visibility` | 공개 범위 변경 | REQ-FUNC-010 · REQ-NF-009 |
| **Record Store** | GET | `/records` | 마이페이지 기록 목록 · 타임라인 | REQ-FUNC-020 |
| **Record Store** | POST | `/groups` | 그룹 생성 (상한 20명) | REQ-FUNC-013 |
| **Record Store** | GET | `/groups/{id}/members` | 그룹 구성원 조회 · 필터 | REQ-FUNC-013 · REQ-NF-005 |
| **Record Store** | DELETE | `/groups/{id}/members/{userId}` | 구성원 이탈 · 공유 링크 회수 | REQ-FUNC-033 |
| **Social Graph** | POST | `/follows` | 팔로우 생성 (단방향) | REQ-FUNC-012 |
| **Feed** | GET | `/feed?tab=following\|recommend\|group` | 탭별 피드 조회 · 빈 피드 대체 | REQ-FUNC-014 · 034 |
| **Feed** | POST | `/records/{id}/reactions` | 좋아요 · 댓글 | REQ-FUNC-015 · 016 |
| **Feed** | POST | `/reactions/{id}/report` | 신고 접수 | REQ-FUNC-016 |
| **Feed** | POST | `/records/{id}/share` | 공유 링크 발급 (만료 30일) | REQ-FUNC-017 · REQ-NF-012 |
| **Telemetry** | POST | `/events` | 계측 이벤트 수집 | REQ-NF-014 · 022 |

## 6.2 Entity & Data Model

```mermaid
erDiagram
    User ||--o{ SourceVideo : "업로드"
    User ||--o{ Record : "소유"
    User ||--o{ FollowRelation : "팔로우"
    User ||--o{ Group : "생성"
    SourceVideo ||--o{ PersonTrack : "추적 궤적"
    SourceVideo ||--o{ AppearanceInterval : "등장 구간"
    SourceVideo ||--|| ProcessingJob : "처리 작업"
    AppearanceInterval ||--|| Candidate : "후보화"
    Candidate ||--o| Selection : "사용자 선택"
    Selection }o--|| GeneratedVideo : "렌더 입력"
    GeneratedVideo ||--|| Record : "기록화"
    Record ||--|| VisibilitySetting : "공개 범위"
    Record ||--o{ Reaction : "반응"
    Record ||--o{ ShareLink : "공유"
    Group ||--o{ GroupMember : "구성원"
    Group ||--o{ VisibilitySetting : "그룹 공개 대상"
    MusicTrack ||--o{ GeneratedVideo : "삽입"
```

| Entity | 주요 필드 | 설명 | 대응 요구사항 |
| --- | --- | --- | --- |
| **User** | `id` · `handle` · `profile` · `birth_year` | 개인 계정 | REQ-NF-021 |
| **SourceVideo** | `id` · `owner_id` · `duration` · `size` · `codec` · `storage_uri` · `status` | 업로드된 긴 원본 | REQ-FUNC-001 · 028 |
| **PersonTrack** | `id` · `video_id` · `subject_ref` · `bbox_timeline` | 지정 대상의 추적 궤적 | REQ-FUNC-002 |
| **AppearanceInterval** | `id` · `video_id` · `start_tc` · `end_tc` · `confidence` | 탐지된 등장 구간 | REQ-FUNC-003 |
| **Candidate** | `id` · `interval_id` · `rank` · `thumbnail_uri` · `confidence_flag` | 사용자에게 제시되는 후보 | REQ-FUNC-004 · 029 |
| **Selection** | `id` · `candidate_id` · `user_id` · `selected_at` | **사용자 선택 기록.** 향후 학습의 원천 | REQ-FUNC-005 · 023 |
| **GeneratedVideo** | `id` · `owner_id` · `source_video_id` · `duration` · `music_id` | 완성 영상 | REQ-FUNC-008 |
| **Record** | `id` · `generated_video_id` · `created_at` | **공개와 무관하게 존재하는 기록 단위** | REQ-FUNC-009 |
| **VisibilitySetting** | `record_id` · `scope` · `group_ids` | 기록 단위 공개 범위 | REQ-FUNC-010 · REQ-NF-009 |
| **Group** | `id` · `owner_id` · `name` · `member_count` | 승인 절차 없이 생성 · **상한 20명** | REQ-FUNC-013 |
| **GroupMember** | `group_id` · `user_id` · `joined_at` · `left_at` | 구성원 · 이탈 이력 | REQ-FUNC-033 |
| **FollowRelation** | `follower_id` · `followee_id` | **단방향** — 맞팔 개념 없음 | REQ-FUNC-012 |
| **ProcessingJob** | `id` · `video_id` · `stage` · `status` · `retry_count` · `checkpoint` | 비동기 작업 | REQ-FUNC-032 · REQ-NF-008 |
| **MusicTrack** | `id` · `title` · `license_ref` · `license_expires_at` | 라이선스가 확보된 곡만 | REQ-FUNC-007 |
| **Reaction** | `id` · `record_id` · `user_id` · `type` · `report_flag` | 공개 범위 내에서만 | REQ-FUNC-015 · 016 |
| **ShareLink** | `id` · `record_id` · `token` · `expires_at` · `revoked_at` | 만료 30일 · 회수 대상 | REQ-FUNC-017 · 033 · REQ-NF-012 |

```mermaid
classDiagram
    class VisibilityScope {
        <<enumeration>>
        PUBLIC : 전체공개
        GROUP : 그룹에만 공개
        PRIVATE : 나만 보기 — 기본값
    }
    class ProcessingStage {
        <<enumeration>>
        UPLOADING
        SUBJECT_ANCHORED
        DETECTING
        SELECTION_READY
        RENDERING
        COMPLETED
        FAILED
    }
    class FailureClass {
        <<enumeration>>
        CAPTURE : 촬영 조건
        MODEL : 모델 성능
        UX : 사용자 이탈
        INFRA : 인프라
        POLICY : 정책 차단
    }
    class ConfidenceFlag {
        <<enumeration>>
        NORMAL
        LOW : 저신뢰 — 표시 필요
        EXCLUDED : 임계 미만 — 후보 제외
    }
    VisibilitySetting --> VisibilityScope
    ProcessingJob --> ProcessingStage
    ProcessingJob --> FailureClass
    Candidate --> ConfidenceFlag
```

**데이터베이스 스키마 개요**

```sql
users                     -- 개인 계정
source_videos             -- 원본 (storage_uri, codec, status)
person_tracks             -- 추적 궤적 (bbox_timeline)
appearance_intervals      -- 등장 구간 (start_tc, end_tc, confidence)
candidates                -- 후보 (rank, thumbnail_uri, confidence_flag)
selections                -- 사용자 선택 이력 (학습 원천 데이터)
generated_videos          -- 완성 영상
records                   -- 기록 (공개와 무관하게 존재)
visibility_settings       -- 기록 단위 공개 범위 (scope, group_ids)
groups / group_members    -- 그룹 (상한 20명) 및 구성원·이탈 이력
follow_relations          -- 단방향 팔로우
processing_jobs           -- 비동기 작업 (stage, retry_count, checkpoint)
music_tracks              -- 라이선스 확보 곡 (license_ref, expires_at)
reactions                 -- 좋아요 · 댓글 · 신고 플래그
share_links               -- 공유 링크 (만료 30일, 회수 대상)
telemetry_events          -- 계측 이벤트 (schema_version)
```

**보존 및 삭제** — 사용자의 삭제 요청 시 `source_videos` · `person_tracks` · `appearance_intervals` · `candidates` · `generated_videos` · `records` 및 객체 스토리지의 모든 파생물을 **전량 삭제**한다 (REQ-NF-022). 구체적 보존 기간은 미정이다 `[TBD]`.

## 6.3 Detailed Interaction Models

### 6.3.1 업로드 실패와 재개 — 상세

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as Client Shell
    participant MI as Media Ingest
    participant OS as 객체 스토리지
    participant T as Telemetry
    U->>C: 원본 선택
    C->>MI: POST /videos (메타 + 코덱)
    MI->>MI: 코덱 사전 검증
    alt 미지원 코덱 — REQ-FUNC-028
        MI-->>C: 415 + 변환 방법 안내
        MI->>T: upload_rejected (GPU 작업 0건)
        Note over MI: 과금 없이 중단
    else 지원 코덱
        MI-->>C: 201 + upload_session_id
        C->>T: upload_started
        loop 청크 전송
            C->>MI: PATCH /videos/{id}/chunks
            MI->>OS: 청크 저장
        end
        alt 네트워크 중단 — REQ-FUNC-027
            C->>T: upload_failed (bytes_sent)
            U->>C: 앱 재실행
            C->>MI: GET 업로드 세션 상태
            MI-->>C: 마지막 완료 청크 오프셋
            C->>T: upload_resumed
            Note over C,MI: 중단 지점부터 재개<br/>재개 성공률 ≥ 99% (REQ-NF-002)
        end
        C->>T: upload_completed
    end
```

### 6.3.2 탐지 파이프라인과 Gate A 계측 — 상세

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as Client Shell
    participant Q as Processing Queue
    participant VT as Vision Tracking
    participant GPU as GPU 인프라
    participant HC as Highlight Composer
    participant T as Telemetry
    U->>C: 본인 1회 지정
    C->>VT: POST /videos/{id}/subject
    VT-->>C: subject_anchored
    C->>Q: POST /videos/{id}/detect
    Q->>T: detection_started
    Q->>VT: 작업 배정 (체크포인트 기록)
    VT->>GPU: 저해상도 1차 훑기 — REQ-NF-019
    GPU-->>VT: 프레임별 검출 결과
    VT->>VT: 재식별 — 가림·재등장 판정
    alt 신뢰도 < 임계 — REQ-FUNC-029
        VT->>VT: confidence_flag = LOW 또는 EXCLUDED
        Note over VT: 타인 장면을 표시 없이<br/>섞지 않는다 (RISK-02)
    end
    VT->>VT: 등장 구간 산출 (IoU 판정)
    alt 등장 구간 0건 — REQ-FUNC-030
        VT-->>C: 원인 후보 (미검출 / 거리 / 조도)
        C->>T: detection_empty
    else 등장 구간 ≥ 1
        VT->>HC: 구간 전달
        HC->>HC: 온전도 우선 정렬 → 후보 생성
        HC-->>C: 후보 목록
        C->>T: selection_opened
        Note over T: detection_started → selection_opened<br/>중앙값 ≤ 5분 · p90 ≤ 10분<br/>(앱 백그라운드 제외) — REQ-NF-003
    end
```

### 6.3.3 렌더 실패와 상태 보존 — 상세

```mermaid
sequenceDiagram
    actor U as 사용자
    participant C as Client Shell
    participant HC as Highlight Composer
    participant VT as Vision Tracking
    participant RS as Record Store
    participant T as Telemetry
    U->>C: 후보 선택 확정 + 음악 선택
    C->>HC: POST /records
    HC->>HC: 선택 상태 영속화 (RenderStateStore)
    HC->>VT: 선택분만 원본 해상도 리프레이밍
    Note over VT: 후보 전량 고화질 처리 금지<br/>REQ-NF-019
    VT-->>HC: 보정 결과
    HC->>T: render_started
    loop 최대 3회 — REQ-NF-008
        HC->>HC: 음악 병합 · 인코딩
        alt 성공
            HC->>T: render_succeeded
            HC->>RS: 기록 생성 요청
        else 실패
            HC->>T: render_failed (failure_class)
            Note over HC: 선택 상태·원본 보존<br/>REQ-FUNC-031
        end
    end
    alt 3회 연속 실패
        HC-->>U: 사유 안내 · 선택 결과 유지
        Note over HC: 선택 데이터 유실 0건<br/>원본 삭제하지 않음
    end
```

### 6.3.4 공개 범위 서버 측 강제 — 상세

```mermaid
sequenceDiagram
    actor V as 조회자
    participant C as Client Shell
    participant FS as Feed Service
    participant VE as VisibilityEnforcer
    participant RS as Record Store
    participant AL as 감사 로그
    V->>C: 기록 조회 요청
    C->>FS: GET /records/{id}
    FS->>VE: 판정 요청 (viewer_id, record_id)
    VE->>RS: visibility · group_ids · owner_id 조회
    RS-->>VE: 범위 정보
    alt scope = PRIVATE 且 viewer ≠ owner
        VE->>AL: 접근 거부 기록
        VE-->>FS: 거부
        FS-->>C: 404
        Note over FS: 자원의 존재를 노출하지 않는다
    else scope = GROUP 且 viewer ∉ group
        VE->>AL: 접근 거부 기록
        VE-->>FS: 거부
        FS-->>C: 404
    else 허용
        VE->>AL: 접근 허용 기록
        VE-->>FS: 허용
        FS-->>C: 200 + 기록
    end
    Note over VE,AL: 우회 성공 0건 · 감사 로그 100%<br/>REQ-NF-009 — 클라이언트 필터링만으로는 불충분
```

### 6.3.5 그룹 이탈과 공유 링크 회수 — 상세

```mermaid
sequenceDiagram
    actor O as 그룹 소유자
    actor M as 이탈 구성원
    participant RS as Record Store
    participant SL as ShareLinkRevoker
    participant VE as VisibilityEnforcer
    alt 자발적 이탈
        M->>RS: DELETE /groups/{id}/members/{me}
    else 소유자에 의한 제외
        O->>RS: DELETE /groups/{id}/members/{userId}
    end
    RS->>RS: group_members.left_at 기록
    RS->>SL: 해당 구성원 대상 링크 조회
    SL->>SL: revoked_at 설정
    Note over SL: 회수 반영 지연 ≤ 60초<br/>REQ-NF-012
    M->>VE: 이전 공유 링크로 접근 시도
    VE-->>M: 404
    Note over RS: 이탈자 본인의 기록은 유지된다<br/>REQ-FUNC-033
```

## 6.4 Validation Plan

> 확장 근거: REF-05 §9.6.19 Verification

### 6.4.1 검증 게이트

```mermaid
flowchart LR
    P0["Phase 0<br/>오프라인 AI 검증"] --> GA{"Gate A<br/>탐지율 ≥ 85%"}
    GA -->|"미달"| STOP["전면 재검토<br/>ADR-1"]
    GA -->|"통과"| P1["Phase 1<br/>내부 알파"]
    P1 --> P2["Phase 2<br/>클로즈드 베타"]
    P2 --> GB{"Gate B<br/>기록 공간 수용성"}
    GB -->|"미달"| RE["기록 구조 재설계"]
    GB -->|"통과"| P3["Phase 3<br/>한정 공개 베타"]
    style GA fill:#ffd9cc,color:#111
    style GB fill:#ffd9cc,color:#111
```

**Gate A와 Gate B는 순서를 바꿀 수 없다.**

| Phase | 대상 | 포함 요구사항 | 판정 지표 | 통과 기준 | 롤백 |
| --- | --- | --- | --- | --- | --- |
| **Phase 0** 오프라인 AI 검증 | 내부 · 수집 영상 | REQ-FUNC-001~003 · 027~029 | O9 | **Gate A — 탐지율 ≥ 85%** | ADR-1 재검토 |
| **Phase 1** 내부 알파 | 내부 팀 | + REQ-FUNC-004~008 · 030 · 031 | O3 · 완주율 | O3 ≥ 80% · 완주율 `[TBD]` | 파이프라인 단계 롤백 |
| **Phase 2** 클로즈드 베타 | 초대 · UC-01 · UC-02 · UC-06 | + REQ-FUNC-009~011 · 032 | **Gate B** · O5 | 저장 성공률 ≥ 99.9% · O5 `[TBD]` | 기록 구조 재설계 |
| **Phase 3** 한정 공개 베타 | 첫 카테고리 공개 | Must Have 전체 | O7 · O2 · O6 | O7 코호트 성립 | 소비 루프 재설계 |

**중단 기준**

| 조건 | 조치 |
| --- | --- |
| **Gate A 미달 (탐지율 < 85%)** | 🔴 **이후 개발 전면 중단.** ADR-1 재검토 |
| 재식별 오탐이 사용자 신고로 확인 | 해당 기능 비활성화 · 저신뢰 표시 도입 (REQ-FUNC-029) |
| 기록 저장 성공률 < 99.9% | 🔴 **Phase 진행 중단.** 제품 주장의 전제가 무너짐 |
| 편당 처리 원가가 상한 초과 | 처리 방식 재설계 (ADR-2 · ADR-3) |
| **REQ-NF-010 산출물 4종 미승인** | 🔴 **CI가 프로덕션 배포를 차단** |
| **REQ-FUNC-007 라이선스 증빙 미확보** | 음악 라이브러리 배포 차단 |
| **REQ-NF-021 산출물 3종 미승인** | 가입 플로우 배포 차단 |

### 6.4.2 실험 설계 — 착수 조건

| 실험 | 대상 | 설계 |
| --- | --- | --- |
| **Gate A 벤치마크** | REQ-FUNC-002 · 003 | 정답셋 **농구 원본 n=100편**(40분급). **촬영 거리·조도·복장 유사도가 다른 케이스를 포함**해야 한다 — 단일 조건에서만 검증하면 RISK-04가 출시 후 드러난다 |
| **후보 개수 A/B/n** | REQ-FUNC-004 · 가정 A3 | 후보 **15 / 30 / 50개** 조건별 선택 소요·선택 개수·재선택률 비교 |
| **구도 만족도** | REQ-FUNC-006 · REQ-NF-018 | 완성 직후 1문항. **촬영 거리 구간별로 분리 계측**해 목표를 거리 조건부로 재정의할지 판정 |

> **표본 크기와 성공 임계는 실측 분산 확보 후 확정한다.** 기준선이 없는 단계에서 미리 정한 실험 설계는 실측 분산이 드러나는 순간 폐기된다.

### 6.4.3 계측 이벤트

공통 속성 4개: `session_id` · `user_id` · `occurred_at` · `schema_version`

| 이벤트 | 트리거 | 고유 속성 |
| --- | --- | --- |
| `upload_started` / `upload_completed` / `upload_resumed` / `upload_failed` / `upload_rejected` | 업로드 각 단계 | `video_id` · `bytes` · `codec` · `retry_count` |
| `subject_anchored` | 대상 지정 완료 | `video_id` |
| `detection_started` / `detection_completed` / `detection_empty` | 탐지 각 단계 | `video_id` · `interval_count` · `elapsed_ms` |
| `selection_opened` | 후보 목록 표시 | `video_id` · `candidate_count` |
| `candidate_selected` / `candidate_excluded` | 후보 선택·제외 | `candidate_id` · `rank` · `confidence_flag` |
| `reselection_started` | 선택을 처음부터 다시 시작 | `record_draft_id` — **ADR-3 검증 지표** |
| `render_started` / `render_succeeded` / `render_failed` | 렌더 각 단계 | `record_draft_id` · `elapsed_ms` · `failure_class` |
| `record_saved` | 기록 저장 완료 | `record_id` · `visibility_scope` |
| `visibility_changed` | 공개 범위 변경 | `record_id` · `from` · `to` |
| `app_opened` / `first_frame_rendered` | 앱 진입 · 첫 프레임 | `elapsed_ms` · `tab` |
| `feed_empty_fallback` | 빈 피드 대체 노출 | `fallback_type` — REQ-FUNC-034 |
| `external_app_switch` | 완성 과정 중 외부 앱 전환 | `stage` — **REQ-FUNC-008 검증. 0건이어야 한다** |
| `visibility_denied` | 공개 범위 접근 거부 | `record_id` · `reason` — REQ-NF-009 감사 로그 |

**운영 규칙** — 세션은 30분 무활동 시 종료 `[PROPOSED]`. **이벤트 누락률이 5%를 초과한 기간의 지표는 공표하지 않는다** `[PROPOSED]`. 모든 이벤트에 `schema_version`을 포함하고 정의 변경 시 증가시킨다.

### 6.4.4 기준선 확보 계획

| 순위 | 대상 | 방법 | 선행 조건 |
| :--: | --- | --- | --- |
| **0** | **가정 A6 — 국내 정량 근거 0건** | 농구 동호회 **100명** 설문. 문항 2개(원본 보유 개수 · 미게시 사유) | 없음 — **MVP 개발보다 먼저** |
| **1a** | REQ-NF-017 오탐률 **지표 정의** | 재식별·탐지 분리 계측 지표 합의 | 없음 — 0순위와 **병렬** |
| **1b** | REQ-NF-016 · 017 **정답셋 구축** | 6.4.2 조건 다양성 요건 충족 | **0순위 결과 확인 후** |
| **2** | O1 · O2 · O3 · O5 · O6 기준선 | Phase 1~2 실측 | Gate A 통과 |
| **3** | S-원가 편당 처리 원가 | Phase 1 처리 물량 집계 | Phase 1 착수 |

> **0순위를 먼저 두는 이유는 소요 시간이 아니라 종류다.** REQ-NF-016은 *"만들 수 있는가"*를 묻고, 가정 A6은 ***"만들 이유가 있는가"***를 묻는다. **가장 싸게 사업을 부정할 수 있는 검증을 먼저 수행한다** — A6이 뒤집히면 Gate A의 성패는 의미가 없다.
>
> **1b를 0순위 뒤에 두는 이유**도 같다. 정답셋 구축은 비용이 큰 작업이라 0순위가 뒤집히면 그 노력이 통째로 낭비된다. 반면 1a(지표 정의)는 합의 문제라 비용이 낮아 병렬로 진행한다.

## 6.5 차별점 근거

> 이 절은 배경 정보이며 **요구사항이 아니다** (REF-05 §9.6.20).

| # | 차별점 | 커버리지 | 모방 난이도 | 대응 요구사항 |
| :--: | --- | :--: | :--: | --- |
| **D1** | 말하지 않고 움직이는 사람을 추적한다 | **6/6** | **높음** | REQ-FUNC-002 · 003 |
| **D2** | 최종 선택권이 사람에게 있다 | 4/6 | 낮음 | REQ-FUNC-005 |
| **D3** | 기록의 주인이 개인이다 | 5/6 | 중간 | REQ-FUNC-009 · 제약 C5 |
| **D4** | 기록이 먼저고 공개가 선택이다 | 3/6 | 낮음 | REQ-FUNC-009 · 010 |

**D1이 실패하면 나머지 셋은 일반 기록 앱이 된다.** 이것이 Gate A를 최우선·단독으로 배치한 근거이며 RISK-01을 치명으로 판정한 이유다.

**D4는 차별점이 아니라 진입 조건이다.** 모방 난이도가 낮고 유사 서비스가 이미 보유하고 있어, 여기에 인물 추적이 더해지면 차별점이 소멸한다. 이것이 소비 루프(REQ-FUNC-011~017)를 본 범위에 포함한 근거다 — **관계망 없이 기록만 남기면 편집기 하나로 남는다.**

**검증 가능한 비교만 기술한다.**

| 비교 항목 | 기존 대안 | 본 제품 | 차이의 성격 |
| --- | --- | --- | --- |
| 추적 대상 | 화자(말하는 사람)·음성 | 넓은 코트에서 작게 잡힌 채 움직이는 사람 | 구조적 차이 |
| 긴 원본 처리 | 촬영 중 짧은 구간 | 40~50분 원본 | 대상 자체가 다름 |
| 기록의 주인 | 클럽·학교·팀 | 개인 | 계약 주체 차이 |
| 전용 장비 | 필요 | 기존 원본 활용 | 진입장벽 차이 |
| 공개 없이 보관 | 없음 | 기록 우선·공개 선택 | 구조적 차이 |
| 작업 시간 · 결과 품질 | 미측정 | 미측정 | **실험 필요** `[TBD]` |

> **경쟁사 대비 배수·퍼센트를 쓰지 않는다.** "탐지율 2배" 같은 표현은 **측정된 적 없는 분모**를 전제한다. 원 주장은 범주적이다 — *"코트에는 말하는 사람이 없다. 이 조건에서 사람을 놓치지 않는 서비스는 조사한 목록에 없다."* **범주적 주장이 정량 주장보다 강하고 반박하기 어려우므로 약한 형태로 번역하지 않는다.**

## 6.6 미해결 사항

| ID | 질문 | 영향 | 담당 | 결정 시한 |
| --- | --- | --- | --- | --- |
| **Q1** | 재식별 오탐률 판정 지표를 무엇으로 할 것인가 | 🔴 RISK-02 대응 불가 · Gate A 설계 | AI 리드 | **Gate A 설계 전** |
| **Q2** | 구도 보정 목표를 촬영 거리 조건부로 재정의할 것인가 | 물리적으로 불가능한 구간에 목표를 거는 위험 | 제품 · AI | Phase 1 |
| **Q3** | 편당 처리 원가 상한을 얼마로 볼 것인가 | 🔴 성장이 곧 적자 · ADR-2 · 3 | 백엔드 · 사업 | **Phase 1 전** |
| **Q4** | 얼굴 정보 처리 방침 (산출물 4종) | 🔴 프로덕션 배포 차단 | 법무 · 제품 | **Phase 2 전** |
| **Q5** | 외부 내보내기를 허용할 것인가 | UC-05 진입 여부 · ADR-5 | 제품 | Phase 3 전 |
| **Q6** | 공개 범위 기본값 (ADR-4) | O5 · 첫 저장 이탈 | 제품 · 디자인 | Gate B |
| **Q7** | 후보 약 30개가 적정한가 (가정 A3) | 사용자 피로 | 제품 | Phase 1 실측 후 |
| **Q8** | 팀 공유 편집을 어떻게 교착에서 꺼낼 것인가 | UC-02 · UC-06이 절반만 충족 | 제품 | `[TBD]` |
| **Q9** | 음원 라이선스 조달 방식 (증빙 3종) | 🔴 음악 라이브러리 배포 차단 | 사업 · 법무 | **Phase 1 전** |
| **Q10** | 미성년자 이용 정책 (산출물 3종) | 🔴 가입 플로우 배포 차단 | 법무 | Phase 3 전 |
| **Q11** | 확장 종목을 무엇으로 할 것인가 | 🔴 O7의 약 6,000명분 | 제품 · 사업 | **Gate A 통과 시점** |
| **Q12** | 국내 기초 설문을 언제 수행할 것인가 (가정 A6) | 🔴 문제 정의의 근거 | 제품 | **Phase 1 착수 전** |
| **Q13** | 카테고리별 조회수 랭킹을 도입할 것인가 | REQ-FUNC-022 도입 여부 자체가 미정 | 제품 | MVP 직후 |

**해소 순서** — 6.4.4의 순위를 따른다. **Q12 → Q1 → Q11** 순이며, 근거는 소요 시간이 아니라 ① 전복 가능성 ② 차단성 ③ 되돌리는 비용이다.

---

*작성자: 제품 아키텍트, 검토자: AI 리드 · 백엔드 리드 · 보안 담당자, 승인자: 제품 리드 (PM)*
