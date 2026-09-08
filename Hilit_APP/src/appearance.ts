/**
 * appearance — 외형 기반 신원 (Re-ID · 앵커)
 *
 * 출처: HILIT_추적PoC_기술기획서.md §3.10 · §4.6.2 · 부록 A
 * PoC 대응: `mobile/reid/osnet_mobile` · `mobile/reid/identity_memory`
 */

import { TrackState, type BBox, type TrackerTrend } from './types.ts';

/* ══════════════════ 상수 (부록 A) ══════════════════ */

/** 🔺 실험용 초기값. UI 슬라이더로 노출되며 정답이 아니다(§7.1). */
export const REID_THRESHOLD = 0.6;
/** N-Level 우회 기준 */
export const CRITICAL_ID_THRESHOLD = 0.35;
export const REID_INTERVAL_NORMAL = 20;
export const REID_INTERVAL_WARNING = 5;
export const ADAPTIVE_REID = true;
/** 경계값 대응 — `0.608 < 0.60 + 0.10` 이므로 위험으로 잡힌다(§6.4) */
export const REID_RISKY_MARGIN = 0.1;
/** 급락 후 재측정 최소 간격 */
export const REID_MIN_GAP_ON_DROP = 3;
export const OSNET_INPUT_SIZE: readonly [number, number] = [256, 128];
export const REID_CROP_PADDING = 0.08;
export const REID_MIN_CROP_PIXELS = 24;

/* ── 앵커 · Identity Poisoning 방지 (§3.10) ── */

/** 🔴 기본 꺼짐. 가장 위험한 실패 모드를 코드 수준에서 막는다. */
export const AUTO_ANCHOR_UPDATE = false;
export const AUTO_ANCHOR_MIN_TRACKER_CONF = 0.9;
export const AUTO_ANCHOR_MIN_REID = 0.85;
export const AUTO_ANCHOR_STABLE_FRAMES = 40;
/** 🔴 근처에 다른 사람이 없어야 한다 — 겹친 상태에서는 confidence가 높아도 삼지 않는다 */
export const AUTO_ANCHOR_MAX_NEIGHBOR_IOU = 0.05;
export const AUTO_ANCHOR_MAX_COUNT = 5;

/* ══════════════════ 타입 ══════════════════ */

export type Embedding = Float32Array;

/**
 * 🔴 `confirmedByUser` 가 리터럴 `true` 다.
 * 사용자가 확인한 프레임만 앵커가 될 수 있다(§4.7.2 · §4.7.4) —
 * 타입 수준에서 다른 경로를 막는다.
 */
export interface Anchor {
  embedding: Embedding;
  frameIndex: number;
  confirmedByUser: true;
}

export interface ReidResult {
  /** 코사인 유사도 */
  similarity: number;
  /** 🔴 측정값(true) / 재사용값(false). 20프레임마다 재므로 그 사이는 옛 값이다 */
  measured: boolean;
  frameIndex: number;
}

/** §3.10 자동 앵커 승격 판정 입력 */
export interface AnchorCandidateSignals {
  trackerConfidence: number;
  reidSimilarity: number;
  stableFrames: number;
  /** 가장 가까운 타인 박스와의 IoU */
  maxNeighborIou: number;
  currentAnchorCount: number;
}

/** §4.6.2 Adaptive Re-ID 간격 결정 입력 */
export interface ReidIntervalInput {
  state: TrackState;
  trend: TrackerTrend;
  lastReid: number;
  occlusionFrozen: boolean;
}

/* ══════════════════ 모델 경계 (Mock 우선) ══════════════════ */

/**
 * OSNet 임베딩 추출기. 🔴 **호출부는 이 인터페이스만 안다** —
 * 실제 모델로 교체할 때 호출부 코드 변경이 0건이어야 한다(CLAUDE.md Mock 우선).
 */
export interface EmbeddingProvider {
  embed(crop: ImageData): Embedding;
}

let embeddingProvider: EmbeddingProvider | null = null;

export function setEmbeddingProvider(p: EmbeddingProvider): void {
  embeddingProvider = p;
}

export function embed(crop: ImageData): Embedding {
  if (!embeddingProvider) {
    throw new Error('EmbeddingProvider 미설정 — setEmbeddingProvider()를 먼저 호출한다');
  }
  return embeddingProvider.embed(crop);
}

/* ══════════════════ 유사도 ══════════════════ */

export function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) throw new Error('embedding dimension mismatch');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom < 1e-12 ? 0 : dot / denom;
}

/** 앵커가 여러 개면 **최대값**을 쓴다 — 하나라도 강하게 맞으면 본인이다. */
export function similarityToAnchors(e: Embedding, anchors: readonly Anchor[]): number {
  let best = 0;
  for (const a of anchors) {
    const s = cosineSimilarity(e, a.embedding);
    if (s > best) best = s;
  }
  return best;
}

export function similarity(crop: ImageData, anchors: readonly Anchor[]): number {
  return similarityToAnchors(embed(crop), anchors);
}

/**
 * Re-ID 입력 크롭. padding 8% 를 두고, 최소 픽셀 미만이면 null 이다.
 * 🔺 사람이 작으면 Re-ID가 무력하다(§7.2) — 그 경우를 여기서 걸러낸다.
 */
export function cropForReid(frame: ImageData, box: BBox): ImageData | null {
  const padX = box.w * REID_CROP_PADDING;
  const padY = box.h * REID_CROP_PADDING;
  const w = Math.round(box.w + padX * 2);
  const h = Math.round(box.h + padY * 2);
  if (w < REID_MIN_CROP_PIXELS || h < REID_MIN_CROP_PIXELS) return null;

  const x = Math.max(0, Math.round(box.x - padX));
  const y = Math.max(0, Math.round(box.y - padY));
  const cw = Math.min(w, frame.width - x);
  const ch = Math.min(h, frame.height - y);
  if (cw <= 0 || ch <= 0) return null;

  const out = new ImageData(cw, ch);
  for (let row = 0; row < ch; row += 1) {
    const src = ((y + row) * frame.width + x) * 4;
    out.data.set(frame.data.subarray(src, src + cw * 4), row * cw * 4);
  }
  return out;
}

/* ══════════════════ Adaptive Re-ID 간격 (§4.6.2) ══════════════════ */

/**
 * 🔴 두 번째 조건(`lastReid < REID_THRESHOLD + REID_RISKY_MARGIN`)이 §6.4에서
 * 추가됐다. 이게 없으면 `0.608` 이 임계 `0.60` 을 넘었다는 이유로 안전으로
 * 분류돼 감지가 19프레임 늦는다.
 */
export function reidInterval(input: ReidIntervalInput): number {
  if (!ADAPTIVE_REID) return REID_INTERVAL_NORMAL;

  const risky =
    input.state === TrackState.WARNING ||
    input.state === TrackState.OCCLUDED ||
    input.state === TrackState.REACQUIRING ||
    input.lastReid < REID_THRESHOLD + REID_RISKY_MARGIN ||
    input.occlusionFrozen ||
    input.trend.dropped;

  if (input.trend.dropped) return REID_MIN_GAP_ON_DROP;
  return risky ? REID_INTERVAL_WARNING : REID_INTERVAL_NORMAL;
}

/** 이번 프레임에 Re-ID를 잴 것인가. */
export function shouldMeasureReid(framesSinceReid: number, input: ReidIntervalInput): boolean {
  return framesSinceReid >= reidInterval(input) || input.trend.dropped;
}

/* ══════════════════ 신원 거부권 · 앵커 승격 ══════════════════ */

/**
 * 🔴 `reid_veto` (§3.2) — 신원 증거는 가중 합산에 묻히지 않는다.
 * 기준 미만이면 *"조금 의심스럽다"* 가 아니라 *"다른 사람일 수 있다"* 다.
 */
export function reidVeto(reidSimilarity: number | null, threshold = REID_THRESHOLD): boolean {
  return reidSimilarity !== null && reidSimilarity < threshold;
}

/** N-Level을 우회할 만큼 신원이 붕괴했는가. */
export function isCriticalReid(reidSimilarity: number | null): boolean {
  return reidSimilarity !== null && reidSimilarity < CRITICAL_ID_THRESHOLD;
}

/**
 * §3.10 — 자동 앵커 승격. 🔴 5조건 **AND** 이며 기본 스위치가 꺼져 있어
 * 통상 항상 `false` 다.
 */
export function canPromoteToAnchor(s: AnchorCandidateSignals): boolean {
  if (!AUTO_ANCHOR_UPDATE) return false;
  return (
    s.trackerConfidence >= AUTO_ANCHOR_MIN_TRACKER_CONF &&
    s.reidSimilarity >= AUTO_ANCHOR_MIN_REID &&
    s.stableFrames >= AUTO_ANCHOR_STABLE_FRAMES &&
    s.maxNeighborIou <= AUTO_ANCHOR_MAX_NEIGHBOR_IOU &&
    s.currentAnchorCount < AUTO_ANCHOR_MAX_COUNT
  );
}

/** 사용자 확인 프레임을 앵커로 만든다 — 🔴 앵커가 생기는 유일한 정규 경로. */
export function anchorFromUserConfirmation(embedding: Embedding, frameIndex: number): Anchor {
  return { embedding, frameIndex, confirmedByUser: true };
}

/* ══════════════════ Health 신호 — reid ══════════════════ */

/** 7신호 중 `reid` (정규화 가중치 0.333). */
export function reidScore(reidSimilarity: number | null): number {
  if (reidSimilarity === null) return 1;
  return Math.min(1, Math.max(0, reidSimilarity));
}

/* ══════════════════ 유니폼 색 ══════════════════ */

export const USE_JERSEY_COLOR = true;

/** 후보 랭킹의 보조 신호(§3.8). association 에서 가중 합산에 들어간다. */
export function jerseyColorSimilarity(a: ImageData, b: ImageData): number {
  const ha = hueHistogram(a);
  const hb = hueHistogram(b);
  let inter = 0;
  for (let i = 0; i < ha.length; i += 1) inter += Math.min(ha[i]!, hb[i]!);
  return inter;
}

const HUE_BINS = 16;

function hueHistogram(img: ImageData): Float64Array {
  const hist = new Float64Array(HUE_BINS);
  let total = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i]! / 255;
    const g = img.data[i + 1]! / 255;
    const b = img.data[i + 2]! / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d < 0.08) continue; // 무채색은 유니폼 색 근거가 되지 못한다
    let h: number;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    const bin = Math.min(HUE_BINS - 1, Math.max(0, Math.floor(((h + 6) % 6) * (HUE_BINS / 6))));
    hist[bin] = (hist[bin] ?? 0) + 1;
    total += 1;
  }
  if (total > 0) for (let i = 0; i < HUE_BINS; i += 1) hist[i] = (hist[i] ?? 0) / total;
  return hist;
}
