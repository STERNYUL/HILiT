/**
 * types 회귀 — Health 가중치 정규화표와 비대칭 EMA.
 * 출처: HILIT_추적PoC_기술기획서.md §3.2 · §3.2.1 · §4.5.4 · §4.6.3
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  HEALTH_WEIGHTS_RAW,
  RECOVERY_REASON_BYPASSES_N_LEVEL,
  RecoveryLevel,
  RecoveryReason,
  TRACKER_BASELINE_ALPHA_DOWN,
  TRACKER_BASELINE_ALPHA_UP,
  TRACKER_DROP_RATIO,
  TRACKER_TREND_WARMUP,
  createTrackerTrend,
  normalizeWeights,
  updateTrackerTrend,
} from '../src/types.ts';

const r3 = (v: number) => Number(v.toFixed(3));

describe('§3.2 Health 7신호 가중치', () => {
  it('원시 가중치 합이 1.20 이다', () => {
    const sum = Object.values(HEALTH_WEIGHTS_RAW).reduce((a, b) => a + b, 0);
    assert.equal(r3(sum), 1.2);
  });

  it('정규화 결과가 기획서 표와 일치한다', () => {
    const w = normalizeWeights();
    assert.equal(r3(w.reid), 0.333);
    assert.equal(r3(w.tracker), 0.208);
    assert.equal(r3(w.motion), 0.125);
    assert.equal(r3(w.box), 0.083);
    assert.equal(r3(w.visibility), 0.083);
    assert.equal(r3(w.occlusion), 0.1);
    assert.equal(r3(w.ambiguity), 0.067);
  });

  it('정규화 후 합은 1 이다', () => {
    const w = normalizeWeights();
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-12);
  });
});

/** §3.2.1 · §4.6.3 — 기획서가 제시한 실제 급락 사례 */
const BASELINE_CONF = 0.917;
const DROPPED_CONF = 0.757;
const SUSTAIN_FRAMES = 10;

/** 대칭 EMA 대조군 — 기획서의 *"대칭으로 두면 작동하지 않는다"* 를 검증하기 위한 것 */
function symmetricDropAfter(frames: number): number {
  let baseline = BASELINE_CONF;
  for (let i = 0; i < frames; i += 1) {
    baseline = TRACKER_BASELINE_ALPHA_UP * DROPPED_CONF + (1 - TRACKER_BASELINE_ALPHA_UP) * baseline;
  }
  return Math.max(0, 1 - DROPPED_CONF / baseline);
}

describe('§4.6.3 비대칭 EMA — 0.917 → 0.757', () => {
  it('α_up 0.15 · α_down 0.01 로 15배 차이다', () => {
    assert.equal(TRACKER_BASELINE_ALPHA_UP / TRACKER_BASELINE_ALPHA_DOWN, 15);
  });

  it('🔴 비대칭이면 급락을 계속 잡고 있는다', () => {
    const t = createTrackerTrend();
    for (let i = 0; i < TRACKER_TREND_WARMUP; i += 1) updateTrackerTrend(t, BASELINE_CONF);
    for (let i = 0; i < SUSTAIN_FRAMES; i += 1) updateTrackerTrend(t, DROPPED_CONF);

    assert.ok(t.drop >= TRACKER_DROP_RATIO, `drop ${r3(t.drop)} 이 12% 이상`);
    assert.equal(t.dropped, true);
  });

  it('🔴 대칭이면 하락이 기준선에 흡수돼 감지하지 못한다', () => {
    const drop = symmetricDropAfter(SUSTAIN_FRAMES);
    assert.ok(drop < TRACKER_DROP_RATIO, `대칭 drop ${r3(drop)} 이 12% 미만으로 수렴`);
  });

  it('warmup 이전에는 판정하지 않는다', () => {
    const t = createTrackerTrend();
    updateTrackerTrend(t, BASELINE_CONF);
    updateTrackerTrend(t, 0.1);
    assert.equal(t.dropped, false, '추적 시작 직후의 흔들림은 판정에서 뺀다');
  });

  it('0.757 은 절대값으로는 여전히 높다 — 그래서 절대 임계로는 못 잡는다', () => {
    assert.ok(DROPPED_CONF > 0.55, '문제는 값이 아니라 떨어졌다는 사실이다');
  });
});

describe('§4.5.2 · §4.5.4 열거형', () => {
  it('RecoveryLevel 은 숫자 순서가 곧 비용 순서다', () => {
    assert.ok(RecoveryLevel.MOTION_PREDICTION < RecoveryLevel.MOBILE_REACQUIRE);
    assert.ok(RecoveryLevel.MOBILE_REACQUIRE < RecoveryLevel.SERVER_CUTIE);
    assert.ok(RecoveryLevel.SERVER_CUTIE < RecoveryLevel.USER_CONFIRM);
  });

  it('🔺 N-Level 우회가 7건 · 정상 경로가 1건이다', () => {
    const entries = Object.values(RECOVERY_REASON_BYPASSES_N_LEVEL);
    assert.equal(entries.filter(Boolean).length, 7);
    assert.equal(entries.filter((v) => !v).length, 1);
    assert.equal(RECOVERY_REASON_BYPASSES_N_LEVEL[RecoveryReason.LOST_RATIO], false);
  });
});
