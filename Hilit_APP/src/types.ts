/**
 * 공유 자료구조 — `shared/schemas.py`(525줄) 전사
 *
 * 출처: HILIT_추적PoC_기술기획서.md §4.5 · §3.2 · 부록 A
 * 🔴 좌표는 전부 **프록시 좌표계**다(§4.8). 원본 변환은 응답 직전에만 한다.
 */

/* ══════════════════ 기하 ══════════════════ */

/** 🔴 프록시 좌표계(720p / 20fps). 계산·저장 모두 이 좌표계다(§4.8). */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export function center(b: BBox): Vec2 {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

export function area(b: BBox): number {
  return Math.max(0, b.w) * Math.max(0, b.h);
}

export function diagonal(width: number, height: number): number {
  return Math.hypot(width, height);
}

/* ══════════════════ 상태 (§4.5.1) ══════════════════ */

export const TrackState = {
  /** 정상 */
  OK: 'TRACKING_OK',
  /** bad 비율 0.30 초과 → Re-ID 간격 20→5. 🔴 서버를 부르지 않는다 */
  WARNING: 'TRACKING_WARNING',
  /** 가림. 모션 예측으로 버틴다 (최대 30프레임) */
  OCCLUDED: 'OCCLUDED',
  /** Lv2 재획득 시도 중 */
  REACQUIRING: 'REACQUIRING_MOBILE',
  /** N-Level 임계 초과 */
  LOST: 'TRACKING_LOST',
  /** Lv3 서버 클립 처리 중 */
  RECOVERY: 'SERVER_RECOVERY',
  /** Lv4 사용자 확인 대기 */
  ASK_USER: 'USER_CONFIRMATION',
  FINISHED: 'FINISHED',
} as const;

export type TrackState = (typeof TrackState)[keyof typeof TrackState];

/* ══════════════════ 복구 단계 (§4.5.2) ══════════════════ */

/** 🔴 숫자 순서가 곧 **시도 순서이자 비용 순서**다. */
export const RecoveryLevel = {
  /** 모바일 · 비용 0 */
  MOTION_PREDICTION: 1,
  /** 모바일 · 비용 0 */
  MOBILE_REACQUIRE: 2,
  /** 서버 · GPU 초당 과금 */
  SERVER_CUTIE: 3,
  /** 사용자 시간 */
  USER_CONFIRM: 4,
} as const;

export type RecoveryLevel = (typeof RecoveryLevel)[keyof typeof RecoveryLevel];

/* ══════════════════ 실패 원인 (§4.5.3) ══════════════════ */

/**
 * 🔴 이 분류가 *"threshold를 내려서 넘기지 않는다"* 를 강제한다.
 * 실패하면 원인을 분류해 기록해야 한다.
 */
export const FailureCause = {
  OCCLUSION: 'occlusion',
  FAST_MOTION: 'fast_motion',
  CAMERA_MOTION: 'camera_motion',
  REID_FAILURE: 'reid_failure',
  TARGET_EXIT: 'target_exit',
  SIMILAR_APPEARANCE: 'similar_appearance',
  DETECTOR_FAILURE: 'detector_failure',
  UNKNOWN: 'unknown',
} as const;

export type FailureCause = (typeof FailureCause)[keyof typeof FailureCause];

/* ══════════════════ 서버 호출 사유 (§4.5.4) ══════════════════ */

export const RecoveryReason = {
  LOST_RATIO: 'lost_ratio',
  CRITICAL_REID: 'critical_reid',
  TARGET_LOST: 'target_lost',
  ID_SWITCH_SUSPECTED: 'id_switch_suspected',
  LONG_UNDETECTED: 'long_undetected',
  LONG_OCCLUSION: 'long_occlusion',
  MOBILE_REACQUIRE_FAILED: 'mobile_reacquire_failed',
  AMBIGUOUS_CANDIDATES: 'ambiguous_candidates',
} as const;

export type RecoveryReason = (typeof RecoveryReason)[keyof typeof RecoveryReason];

/**
 * N-Level 우회 여부.
 * 🔺 **우회가 7건, 정상 경로가 1건**이다 — §5.2에서 N-Level 효과를
 * 측정하지 못한 구조적 이유다. 어려운 장면에서는 우회가 먼저 걸린다.
 */
export const RECOVERY_REASON_BYPASSES_N_LEVEL: Readonly<Record<RecoveryReason, boolean>> = {
  [RecoveryReason.LOST_RATIO]: false,
  [RecoveryReason.CRITICAL_REID]: true,
  [RecoveryReason.TARGET_LOST]: true,
  [RecoveryReason.ID_SWITCH_SUSPECTED]: true,
  [RecoveryReason.LONG_UNDETECTED]: true,
  [RecoveryReason.LONG_OCCLUSION]: true,
  [RecoveryReason.MOBILE_REACQUIRE_FAILED]: true,
  [RecoveryReason.AMBIGUOUS_CANDIDATES]: true,
};

/* ══════════════════ 판정 입출력 (§4.5.5 · §4.5.6) ══════════════════ */

export interface FrameSignals {
  frameIndex: number;
  timestamp: number;
  box: BBox | null;
  /** NanoTrack getTrackingScore() */
  trackerConfidence: number;
  /** OSNet. null = 이 프레임은 재지 않았다 */
  reidSimilarity: number | null;
  /** 🔴 측정값인지 재사용값인지. 이 플래그 부재가 §6.4의 9프레임 지연 원인이었다 */
  reidMeasured: boolean;
  prevBox: BBox | null;
  frameWidth: number;
  frameHeight: number;
}

/** 🔴 7신호를 개별로 전부 보관한다. 합산값만 남기면 판정 근거를 재구성할 수 없다. */
export interface FrameHealth {
  frameIndex: number;
  timestamp: number;
  /** 7신호 가중 합산. 🔺 **확률이 아니다**(§7.5) */
  health: number;
  reidScore: number;
  trackerScore: number;
  motionScore: number;
  boxScore: number;
  visibilityScore: number;
  occlusionScore: number;
  /** 1.0 = 애매하지 않음 */
  ambiguityScore: number;
  isBad: boolean;
  state: TrackState;
  /** "reid_veto" · "tracker_dropped" 등. 거부권 발동 흔적 */
  notes: string[];
}

/* ══════════════════ Health 가중치 (§3.2 · 부록 A) ══════════════════ */

export interface HealthWeights {
  reid: number;
  tracker: number;
  motion: number;
  box: number;
  visibility: number;
  occlusion: number;
  ambiguity: number;
}

/** 🔺 합이 **1.20**이라 정규화해서 쓴다. */
export const HEALTH_WEIGHTS_RAW: Readonly<HealthWeights> = {
  reid: 0.4,
  tracker: 0.25,
  motion: 0.15,
  box: 0.1,
  visibility: 0.1,
  occlusion: 0.12,
  ambiguity: 0.08,
};

export function normalizeWeights(w: HealthWeights = HEALTH_WEIGHTS_RAW): HealthWeights {
  const sum = w.reid + w.tracker + w.motion + w.box + w.visibility + w.occlusion + w.ambiguity;
  if (sum <= 0) throw new Error('health weights must sum to a positive value');
  return {
    reid: w.reid / sum,
    tracker: w.tracker / sum,
    motion: w.motion / sum,
    box: w.box / sum,
    visibility: w.visibility / sum,
    occlusion: w.occlusion / sum,
    ambiguity: w.ambiguity / sum,
  };
}

/** bad frame 기준 */
export const BAD_FRAME_HEALTH = 0.55;

/* ══════════════════ tracker 추세 (§3.2.1 · §4.6.3) ══════════════════ */

export const TRACKER_DROP_RATIO = 0.12;
export const TRACKER_TREND_WARMUP = 8;
export const TRACKER_BASELINE_ALPHA_UP = 0.15;
/** 🔴 비대칭이 핵심. 대칭이면 하락이 기준선에 흡수돼 아무것도 감지하지 못한다. */
export const TRACKER_BASELINE_ALPHA_DOWN = 0.01;

export interface TrackerTrend {
  baseline: number | null;
  drop: number;
  dropped: boolean;
  n: number;
}

export function createTrackerTrend(): TrackerTrend {
  return { baseline: null, drop: 0, dropped: false, n: 0 };
}

/**
 * §4.6.3 — 비대칭 EMA 기준선.
 * 🔴 절대값이 아니라 **기준선 대비 하락률**을 본다. `0.917 → 0.757` 은
 * 여전히 높은 값이지만 문제는 값이 아니라 떨어졌다는 사실이다.
 */
export function updateTrackerTrend(t: TrackerTrend, confidence: number): TrackerTrend {
  t.n += 1;
  if (t.baseline === null) {
    t.baseline = confidence;
    return t;
  }
  const alpha =
    confidence >= t.baseline ? TRACKER_BASELINE_ALPHA_UP : TRACKER_BASELINE_ALPHA_DOWN;
  t.baseline = alpha * confidence + (1 - alpha) * t.baseline;
  t.drop = Math.max(0, 1 - confidence / Math.max(t.baseline, 1e-6));
  t.dropped = t.n >= TRACKER_TREND_WARMUP && t.drop >= TRACKER_DROP_RATIO;
  return t;
}

/* ══════════════════ 신호별 이상 판정 임계 (부록 A) ══════════════════ */

export const BOX_CHANGE_LOW = 0.5;
export const BOX_CHANGE_HIGH = 2.0;
export const CENTROID_JUMP_RATIO = 0.12;
export const MIN_BOX_AREA_RATIO = 0.0005;
