/**
 * association — 후보 연관 · 랭킹 · ID 전환
 *
 * 출처: HILIT_추적PoC_기술기획서.md §3.8 · §4.6.5 · §4.6.6 · §4.6.7 · 부록 A
 * PoC 대응: `mobile/reid/candidate_ranking`
 */

import { area, type BBox } from './types.ts';

/* ══════════════════ 상수 (부록 A) ══════════════════ */

export const DETECTOR_PROB_THRESHOLD = 0.35;
export const DETECTOR_IOU_THRESHOLD = 0.6;
export const DETECTOR_MAX_CANDIDATES = 12;
export const DETECTOR_MIN_GAP_FRAMES = 5;

export const CANDIDATE_MERGE_IOU = 0.55;
/** 🔴 IoU가 놓치는 포함 관계를 잡는다(§6.6) */
export const CANDIDATE_CONTAIN_RATIO = 0.8;
/** 1등·2등 차가 이하면 찍지 않고 Lv4로 넘긴다 */
export const CANDIDATE_AMBIGUOUS_MARGIN = 0.06;

export const REACQUIRE_ACCEPT_SCORE = 0.62;
export const REACQUIRE_MIN_REID = 0.45;

export const SWITCH_CONFIRM_FRAMES = 3;
export const REID_SWITCH_MARGIN = 0.12;

/* ══════════════════ 타입 ══════════════════ */

export interface RankWeights {
  reid: number;
  distance: number;
  size: number;
  jersey: number;
}

/** 🔺 개별 가중치는 기획서에 수치로 명시돼 있지 않다 — 합 1.0 균형 배분을 초기값으로 둔다. */
export const DEFAULT_RANK_WEIGHTS: Readonly<RankWeights> = {
  reid: 0.55,
  distance: 0.2,
  size: 0.15,
  jersey: 0.1,
};

export interface Candidate {
  box: BBox;
  /** 주 신호 */
  reidSimilarity: number;
  /** 예측 위치와의 거리 — 0~1 정규화 (0 = 예측 위치와 일치) */
  distanceToPrediction: number;
  /** 박스 크기의 연속성 — 0~1 */
  sizeContinuity: number;
  /** 유니폼 색 유사도 — 0~1 */
  jerseyColorSimilarity: number;
}

export interface RankedCandidate extends Candidate {
  score: number;
  /** 1부터 */
  rank: number;
}

/**
 * 🔴 *"애매하면 찍지 않는다"* 가 타입에 인코딩돼 있다.
 * `ambiguous` 는 실패가 아니라 **Lv4(사용자 확인) 이관**이다 —
 * `reject` 와 합치면 *"모르면 찍는다"* 로 퇴화한다.
 */
export type AssociationOutcome =
  | { kind: 'accept'; chosen: RankedCandidate }
  | { kind: 'ambiguous'; top: RankedCandidate; runnerUp: RankedCandidate; margin: number }
  | {
      kind: 'reject';
      reason: 'no_candidates' | 'below_min_reid' | 'below_accept_score';
      top?: RankedCandidate;
    };

export interface SwitchState {
  streak: number;
}

export function createSwitchState(): SwitchState {
  return { streak: 0 };
}

/* ══════════════════ 기하 ══════════════════ */

export function intersectionArea(a: BBox, b: BBox): number {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return w * h;
}

export function iou(a: BBox, b: BBox): number {
  const inter = intersectionArea(a, b);
  const union = area(a) + area(b) - inter;
  return union <= 0 ? 0 : inter / union;
}

/**
 * 포함률 — 🔴 IoU 하나로는 부족하다. 크기가 크게 다른 포함 관계에서 IoU가
 * 낮게 나온다(§6.6).
 *
 * ```
 * P1 x=233 w=59 h=85    P3 x=245 w=42 h=63   ← P1 안에 완전 포함
 * IoU    2646/5015           = 0.528  ← 임계 0.55 를 통과해버린다
 * 포함률 2646/min(5015,2646) = 1.00   ← 확실히 걸린다
 * ```
 */
export function containRatio(a: BBox, b: BBox): number {
  const smaller = Math.min(area(a), area(b));
  return smaller <= 0 ? 0 : intersectionArea(a, b) / smaller;
}

/* ══════════════════ 후보 중복 병합 (§4.6.5) ══════════════════ */

/** IoU **또는** 포함률 중 하나만 걸려도 작은 쪽을 버린다. */
export function mergeDuplicates(boxes: readonly BBox[]): BBox[] {
  const kept: BBox[] = [];
  const sorted = [...boxes].sort((a, b) => area(b) - area(a)); // 큰 것부터
  for (const box of sorted) {
    const dup = kept.some(
      (k) => iou(k, box) >= CANDIDATE_MERGE_IOU || containRatio(k, box) >= CANDIDATE_CONTAIN_RATIO,
    );
    if (!dup) kept.push(box);
  }
  return kept.slice(0, DETECTOR_MAX_CANDIDATES);
}

/* ══════════════════ 랭킹 (§4.6.6) ══════════════════ */

export function scoreCandidate(c: Candidate, w: RankWeights = DEFAULT_RANK_WEIGHTS): number {
  return (
    w.reid * c.reidSimilarity +
    w.distance * (1 - clamp01(c.distanceToPrediction)) +
    w.size * clamp01(c.sizeContinuity) +
    w.jersey * clamp01(c.jerseyColorSimilarity)
  );
}

export function rank(
  candidates: readonly Candidate[],
  w: RankWeights = DEFAULT_RANK_WEIGHTS,
): RankedCandidate[] {
  return candidates
    .map((c) => ({ ...c, score: scoreCandidate(c, w), rank: 0 }))
    .sort((a, b) => b.score - a.score)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

/**
 * 재획득 후보 확정.
 *
 * 🔴 수락 조건이 **AND** 다 — 종합 점수가 높아도 Re-ID가 `0.45` 미만이면
 * 거부한다. 다른 근거로 Re-ID를 상쇄하지 못하게 한 것이며, §3.2의
 * `reid_veto` 와 같은 원칙이다.
 *
 * 🔴 1등·2등 차가 `0.06` 미만이면 **찍지 않고** `ambiguous` 로 반환한다.
 */
export function associate(
  candidates: readonly Candidate[],
  w: RankWeights = DEFAULT_RANK_WEIGHTS,
): AssociationOutcome {
  if (candidates.length === 0) return { kind: 'reject', reason: 'no_candidates' };

  const ranked = rank(candidates, w);
  const top = ranked[0]!;

  const runnerUp = ranked[1];
  if (runnerUp) {
    const margin = top.score - runnerUp.score;
    if (margin < CANDIDATE_AMBIGUOUS_MARGIN) {
      return { kind: 'ambiguous', top, runnerUp, margin };
    }
  }

  if (top.reidSimilarity < REACQUIRE_MIN_REID) {
    return { kind: 'reject', reason: 'below_min_reid', top };
  }
  if (top.score < REACQUIRE_ACCEPT_SCORE) {
    return { kind: 'reject', reason: 'below_accept_score', top };
  }
  return { kind: 'accept', chosen: top };
}

/* ══════════════════ ID Switch Hysteresis (§4.6.7) ══════════════════ */

/**
 * 🔴 한 프레임 신호로 대상을 갈아타지 않는다.
 * 3프레임 연속 + 마진 0.12 를 **동시에** 요구한다.
 */
export function shouldSwitch(
  state: SwitchState,
  candidateReid: number,
  currentReid: number,
): boolean {
  if (candidateReid > currentReid + REID_SWITCH_MARGIN) state.streak += 1;
  else state.streak = 0;
  return state.streak >= SWITCH_CONFIRM_FRAMES;
}

/* ══════════════════ Health 신호 — ambiguity ══════════════════ */

/**
 * 7신호 중 `ambiguity` (정규화 가중치 0.067). **1.0 = 애매하지 않음.**
 * 1등·2등 차가 마진 이상이면 1.0, 동점이면 0.0 이다.
 */
export function ambiguityScore(ranked: readonly RankedCandidate[]): number {
  if (ranked.length < 2) return 1;
  const margin = ranked[0]!.score - ranked[1]!.score;
  return Math.min(1, Math.max(0, margin / CANDIDATE_AMBIGUOUS_MARGIN));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
