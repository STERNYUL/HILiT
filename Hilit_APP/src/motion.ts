/**
 * motion — 움직임 · 가림 예측 · 카메라 보정
 *
 * 출처: HILIT_추적PoC_기술기획서.md §3.6 · §3.7 · §4.6.1 · §4.6.10 · 부록 A
 * PoC 대응: `mobile/tracker/occlusion_memory` · `mobile/vision/camera_motion`
 */

import {
  BOX_CHANGE_HIGH,
  BOX_CHANGE_LOW,
  CENTROID_JUMP_RATIO,
  MIN_BOX_AREA_RATIO,
  area,
  center,
  diagonal,
  type BBox,
  type Vec2,
} from './types.ts';

/* ══════════════════ 상수 (부록 A) ══════════════════ */

/** 넘으면 LOST */
export const OCCLUSION_MAX_FRAMES = 30;
export const OCCLUSION_ENTER_CONFIDENCE = 0.35;
/** 이동 평균 창 */
export const VELOCITY_WINDOW = 5;
/** 프레임당 감쇠 — 🔺 불확실성을 감쇠로 표현한다 */
export const PREDICTION_DECAY = 0.92;
/** 🔴 예측 박스 Health 상한. 없으면 예측이 Health를 높게 유지해 재획득이 늦어진다 */
export const PREDICTED_HEALTH_CAP = 0.62;

export const CAMERA_MOTION_COMPENSATION = true;
export const CAMERA_FLOW_MAX_POINTS = 120;
/** 계산량 절감 — 실측 4.4 ms/frame */
export const CAMERA_FLOW_DOWNSCALE = 0.35;

/* ══════════════════ 타입 ══════════════════ */

export interface CameraMotion {
  dx: number;
  dy: number;
  /** 기여한 특징점 수 */
  points: number;
}

export const NO_CAMERA_MOTION: CameraMotion = { dx: 0, dy: 0, points: 0 };

export interface MotionState {
  /** 최근 VELOCITY_WINDOW 프레임 이동 평균 */
  velocity: Vec2;
  recent: Vec2[];
  occludedFrames: number;
  lastBox: BBox | null;
}

export function createMotionState(): MotionState {
  return { velocity: { x: 0, y: 0 }, recent: [], occludedFrames: 0, lastBox: null };
}

/* ══════════════════ 카메라 보정 (§3.7) ══════════════════ */

/**
 * sparse Lucas-Kanade 광류. 🔴 **호출부는 이 인터페이스만 안다** —
 * OpenCV.js든 WASM이든 교체 시 호출부 변경 0건이어야 한다(CLAUDE.md Mock 우선).
 */
export interface OpticalFlowProvider {
  /** 배경 특징점의 프레임 간 이동 벡터들 */
  sparseFlow(prev: ImageData, curr: ImageData, maxPoints: number, downscale: number): Vec2[];
}

let flowProvider: OpticalFlowProvider | null = null;

export function setOpticalFlowProvider(p: OpticalFlowProvider): void {
  flowProvider = p;
}

/**
 * 🔴 평균이 아니라 **중앙값**이다 — 움직이는 사람 위의 특징점이 섞여도 버틴다.
 * 보정하지 않으면 Pan을 *"사람이 갑자기 크게 이동했다"* 로 오판해 서버를 부른다.
 */
export function estimateCameraMotion(prev: ImageData, curr: ImageData): CameraMotion {
  if (!CAMERA_MOTION_COMPENSATION || !flowProvider) return NO_CAMERA_MOTION;
  const v = flowProvider.sparseFlow(prev, curr, CAMERA_FLOW_MAX_POINTS, CAMERA_FLOW_DOWNSCALE);
  if (v.length === 0) return NO_CAMERA_MOTION;
  return { dx: median(v.map((p) => p.x)), dy: median(v.map((p) => p.y)), points: v.length };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** §4.6.1 step 2 — `(box.center − prev.center) − (dx, dy)` */
export function compensate(delta: Vec2, camera: CameraMotion): Vec2 {
  return { x: delta.x - camera.dx, y: delta.y - camera.dy };
}

export function centroidDelta(box: BBox, prevBox: BBox | null, camera = NO_CAMERA_MOTION): Vec2 {
  if (!prevBox) return { x: 0, y: 0 };
  const c = center(box);
  const p = center(prevBox);
  return compensate({ x: c.x - p.x, y: c.y - p.y }, camera);
}

/* ══════════════════ 속도 · 예측 (§3.6) ══════════════════ */

export function updateVelocity(state: MotionState, box: BBox, camera = NO_CAMERA_MOTION): void {
  const d = centroidDelta(box, state.lastBox, camera);
  state.recent.push(d);
  if (state.recent.length > VELOCITY_WINDOW) state.recent.shift();
  const n = state.recent.length;
  state.velocity = {
    x: state.recent.reduce((s, v) => s + v.x, 0) / n,
    y: state.recent.reduce((s, v) => s + v.y, 0) / n,
  };
  state.lastBox = box;
  state.occludedFrames = 0;
}

/**
 * 가려진 동안 예측 위치로 버틴다. 30프레임 초과면 `null`(→ LOST).
 *
 * 🔺 **칼만 필터를 의도적으로 쓰지 않았다.** 칼만은 등속·선형 가정에서 잘
 * 듣는데 농구는 점프하고 급정지하고 방향을 꺾는다. 가정이 깨진 칼만은
 * 자신 있게 틀린 위치를 내놓아 단순 이동 평균보다 나쁘다.
 */
export function predict(state: MotionState): BBox | null {
  if (!state.lastBox) return null;
  if (state.occludedFrames >= OCCLUSION_MAX_FRAMES) return null;

  state.occludedFrames += 1;
  const decay = Math.pow(PREDICTION_DECAY, state.occludedFrames);
  state.velocity = { x: state.velocity.x * PREDICTION_DECAY, y: state.velocity.y * PREDICTION_DECAY };

  const b = state.lastBox;
  const next: BBox = {
    x: b.x + state.velocity.x * decay,
    y: b.y + state.velocity.y * decay,
    w: b.w,
    h: b.h,
  };
  state.lastBox = next;
  return next;
}

export function shouldEnterOcclusion(trackerConfidence: number, state: MotionState): boolean {
  return trackerConfidence < OCCLUSION_ENTER_CONFIDENCE && state.lastBox !== null;
}

/** 예측 박스에는 Health 상한을 씌운다(§4.6.4). */
export function capPredictedHealth(health: number, wasPredicted: boolean): number {
  return wasPredicted ? Math.min(health, PREDICTED_HEALTH_CAP) : health;
}

/* ══════════════════ Health 신호 4종 (§3.2) ══════════════════ */

/** `motion` (0.125) — 중심점 이동량. 프레임 대각선 대비 12% 초과면 0점. */
export function motionScore(delta: Vec2, frameWidth: number, frameHeight: number): number {
  const jump = Math.hypot(delta.x, delta.y) / diagonal(frameWidth, frameHeight);
  return Math.min(1, Math.max(0, 1 - jump / CENTROID_JUMP_RATIO));
}

/** `box` (0.083) — 면적 변화율. 0.5~2.0 배 밖이면 0점. */
export function boxScore(curr: BBox, prev: BBox | null): number {
  if (!prev) return 1;
  const prevArea = area(prev);
  if (prevArea <= 0) return 0;
  const ratio = area(curr) / prevArea;
  if (ratio <= BOX_CHANGE_LOW || ratio >= BOX_CHANGE_HIGH) return 0;
  const slack = ratio < 1 ? (ratio - BOX_CHANGE_LOW) / (1 - BOX_CHANGE_LOW)
                          : (BOX_CHANGE_HIGH - ratio) / (BOX_CHANGE_HIGH - 1);
  return Math.min(1, Math.max(0, slack));
}

/** `visibility` (0.083) — 박스가 화면 안에 있는가 · 너무 작지 않은가. */
export function visibilityScore(box: BBox, frameWidth: number, frameHeight: number): number {
  const frameArea = frameWidth * frameHeight;
  if (frameArea <= 0) return 0;
  if (area(box) / frameArea < MIN_BOX_AREA_RATIO) return 0;

  const vx = Math.max(0, Math.min(box.x + box.w, frameWidth) - Math.max(box.x, 0));
  const vy = Math.max(0, Math.min(box.y + box.h, frameHeight) - Math.max(box.y, 0));
  const visible = vx * vy;
  const total = area(box);
  return total <= 0 ? 0 : Math.min(1, visible / total);
}

/** `occlusion` (0.100) — 가림 지속. 30프레임에서 0점으로 수렴. */
export function occlusionScore(occludedFrames: number): number {
  if (occludedFrames <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - occludedFrames / OCCLUSION_MAX_FRAMES));
}

/* ══════════════════ 궤적 보간 (§4.6.10) ══════════════════ */

/**
 * 분석은 20fps, 출력은 원본 fps다. 사이 프레임을 선형 보간한다.
 *
 * 🔺 **곡선 보간을 쓰지 않는다.** 20fps 간격(50ms)에서 사람의 이동은 선형에
 * 가깝고, 곡선은 오버슈트를 만들어 박스가 대상을 앞질러 간다.
 */
export function interpolate(a: BBox, b: BBox, ratio: number): BBox {
  const t = Math.min(1, Math.max(0, ratio));
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    w: a.w + (b.w - a.w) * t,
    h: a.h + (b.h - a.h) * t,
  };
}

/** 분석 프레임 궤적을 출력 타임스탬프열로 복원한다. */
export function resampleTrack(
  keyframes: readonly { t: number; box: BBox }[],
  outputTimestamps: readonly number[],
): BBox[] {
  if (keyframes.length === 0) return [];
  const out: BBox[] = [];
  let i = 0;
  for (const t of outputTimestamps) {
    while (i < keyframes.length - 2 && keyframes[i + 1]!.t < t) i += 1;
    const a = keyframes[i]!;
    const b = keyframes[Math.min(i + 1, keyframes.length - 1)]!;
    const span = b.t - a.t;
    out.push(span <= 0 ? a.box : interpolate(a.box, b.box, (t - a.t) / span));
  }
  return out;
}
