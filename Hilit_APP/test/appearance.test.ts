/**
 * appearance 회귀 — §6.4 경계값 사례와 Identity Poisoning 방지.
 * 출처: HILIT_추적PoC_기술기획서.md §3.10 · §4.6.2 · §6.4
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTO_ANCHOR_UPDATE,
  CRITICAL_ID_THRESHOLD,
  REID_INTERVAL_NORMAL,
  REID_INTERVAL_WARNING,
  REID_MIN_GAP_ON_DROP,
  REID_RISKY_MARGIN,
  REID_THRESHOLD,
  anchorFromUserConfirmation,
  canPromoteToAnchor,
  cosineSimilarity,
  isCriticalReid,
  reidInterval,
  reidVeto,
  similarityToAnchors,
  type AnchorCandidateSignals,
  type ReidIntervalInput,
} from '../src/appearance.ts';
import { TrackState, createTrackerTrend, updateTrackerTrend } from '../src/types.ts';

const safeInput = (lastReid: number): ReidIntervalInput => ({
  state: TrackState.OK,
  trend: createTrackerTrend(),
  lastReid,
  occlusionFrozen: false,
});

/** §6.4 — 기획서가 제시한 실제 값 */
const BOUNDARY_REID = 0.608;

describe('§6.4 Adaptive Re-ID 경계값 — 감지가 9프레임 늦었던 사례', () => {
  it('0.608 은 임계 0.60 을 넘는다 — 첫 조건만으로는 안전으로 분류된다', () => {
    assert.ok(BOUNDARY_REID > REID_THRESHOLD);
  });

  it('🔴 여유 0.10 을 두면 0.608 < 0.70 이라 위험으로 잡힌다', () => {
    assert.ok(BOUNDARY_REID < REID_THRESHOLD + REID_RISKY_MARGIN);
    assert.equal(reidInterval(safeInput(BOUNDARY_REID)), REID_INTERVAL_WARNING);
  });

  it('충분히 높으면 정상 간격 20 이다', () => {
    assert.equal(reidInterval(safeInput(0.95)), REID_INTERVAL_NORMAL);
  });

  it('위험 상태 3종은 lastReid 와 무관하게 간격을 좁힌다', () => {
    for (const state of [TrackState.WARNING, TrackState.OCCLUDED, TrackState.REACQUIRING]) {
      assert.equal(
        reidInterval({ ...safeInput(0.95), state }),
        REID_INTERVAL_WARNING,
        `${state} 에서 간격이 좁혀져야 한다`,
      );
    }
  });

  it('tracker 급락 시에는 최소 간격 3 으로 더 좁힌다', () => {
    const trend = createTrackerTrend();
    for (let i = 0; i < 8; i += 1) updateTrackerTrend(trend, 0.917);
    for (let i = 0; i < 10; i += 1) updateTrackerTrend(trend, 0.757);
    assert.equal(trend.dropped, true);

    assert.equal(reidInterval({ ...safeInput(0.95), trend }), REID_MIN_GAP_ON_DROP);
  });
});

describe('§3.2 reid_veto — 신원 증거는 합산에 묻히지 않는다', () => {
  it('임계 미만이면 거부권이 선다', () => {
    assert.equal(reidVeto(0.59), true);
    assert.equal(reidVeto(0.61), false);
  });

  it('재지 않은 프레임(null)에는 거부권이 서지 않는다', () => {
    assert.equal(reidVeto(null), false);
  });

  it('0.35 미만은 N-Level 을 우회할 만큼 붕괴한 것이다', () => {
    assert.equal(isCriticalReid(0.34), true);
    assert.equal(isCriticalReid(0.36), false);
    assert.ok(CRITICAL_ID_THRESHOLD < REID_THRESHOLD);
  });
});

const goodSignals: AnchorCandidateSignals = {
  trackerConfidence: 0.95,
  reidSimilarity: 0.9,
  stableFrames: 50,
  maxNeighborIou: 0.0,
  currentAnchorCount: 1,
};

describe('§3.10 Identity Poisoning 방지', () => {
  it('🔴 자동 앵커 갱신은 기본으로 꺼져 있다', () => {
    assert.equal(AUTO_ANCHOR_UPDATE, false);
  });

  it('조건을 전부 만족해도 스위치가 꺼져 있으면 승격하지 않는다', () => {
    assert.equal(canPromoteToAnchor(goodSignals), false);
  });

  it('🔴 근처에 다른 사람이 있으면(IoU 0.05 초과) 조건 자체가 깨진다', () => {
    const crowded = { ...goodSignals, maxNeighborIou: 0.2 };
    assert.equal(canPromoteToAnchor(crowded), false);
  });

  it('사용자 확인 프레임만 앵커가 된다', () => {
    const a = anchorFromUserConfirmation(new Float32Array([1, 0, 0]), 142);
    assert.equal(a.confirmedByUser, true);
    assert.equal(a.frameIndex, 142);
  });
});

describe('코사인 유사도', () => {
  it('같은 벡터는 1 이다', () => {
    const v = new Float32Array([0.6, 0.8]);
    assert.ok(Math.abs(cosineSimilarity(v, v) - 1) < 1e-6);
  });

  it('직교 벡터는 0 이다', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    assert.ok(Math.abs(cosineSimilarity(a, b)) < 1e-6);
  });

  it('앵커가 여럿이면 최대값을 쓴다', () => {
    const probe = new Float32Array([1, 0]);
    const anchors = [
      anchorFromUserConfirmation(new Float32Array([0, 1]), 1),
      anchorFromUserConfirmation(new Float32Array([1, 0]), 2),
    ];
    assert.ok(Math.abs(similarityToAnchors(probe, anchors) - 1) < 1e-6);
  });

  it('차원이 다르면 던진다', () => {
    assert.throws(() => cosineSimilarity(new Float32Array([1]), new Float32Array([1, 2])));
  });
});
