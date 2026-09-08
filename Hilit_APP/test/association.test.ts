/**
 * association 회귀 — 기획서에 **검증된 수치**가 있는 것만 단언한다.
 * 출처: HILIT_추적PoC_기술기획서.md §4.6.5 · §4.6.6 · §4.6.7 · §6.6
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CANDIDATE_AMBIGUOUS_MARGIN,
  CANDIDATE_CONTAIN_RATIO,
  CANDIDATE_MERGE_IOU,
  REACQUIRE_MIN_REID,
  associate,
  ambiguityScore,
  containRatio,
  createSwitchState,
  iou,
  mergeDuplicates,
  rank,
  shouldSwitch,
  type Candidate,
} from '../src/association.ts';
import type { BBox } from '../src/types.ts';

/* §6.6 — 기획서가 실제 값으로 제시한 사례.
 * P1 x=233 w=59 h=85 · P3 x=245 w=42 h=63 (P1 안에 완전 포함)
 * 🔺 y 좌표는 기획서에 없어 포함 관계가 성립하도록 골랐다. 면적·비율은 기획서 값이다. */
const P1: BBox = { x: 233, y: 100, w: 59, h: 85 }; // area 5015
const P3: BBox = { x: 245, y: 110, w: 42, h: 63 }; // area 2646

describe('§6.6 후보 중복 병합 — IoU 하나로는 부족하다', () => {
  it('기획서의 IoU 0.528 을 재현한다', () => {
    assert.equal(Number(iou(P1, P3).toFixed(3)), 0.528);
  });

  it('🔴 그 IoU 는 병합 임계 0.55 를 통과해버린다', () => {
    assert.ok(iou(P1, P3) < CANDIDATE_MERGE_IOU, 'IoU 만으로는 중복을 못 잡는다');
  });

  it('포함률은 1.00 이라 확실히 걸린다', () => {
    assert.equal(containRatio(P1, P3), 1);
    assert.ok(containRatio(P1, P3) >= CANDIDATE_CONTAIN_RATIO);
  });

  it('mergeDuplicates 가 작은 쪽을 버려 1건만 남긴다', () => {
    const merged = mergeDuplicates([P1, P3]);
    assert.equal(merged.length, 1);
    assert.deepEqual(merged[0], P1, '큰 쪽이 남아야 한다');
  });

  it('겹치지 않는 박스는 병합하지 않는다', () => {
    const far: BBox = { x: 900, y: 900, w: 50, h: 50 };
    assert.equal(mergeDuplicates([P1, far]).length, 2);
  });
});

const base: Omit<Candidate, 'reidSimilarity'> = {
  box: P1,
  distanceToPrediction: 0,
  sizeContinuity: 1,
  jerseyColorSimilarity: 1,
};

const weak: Candidate = {
  box: { x: 900, y: 900, w: 40, h: 40 },
  reidSimilarity: 0.1,
  distanceToPrediction: 1,
  sizeContinuity: 0,
  jerseyColorSimilarity: 0,
};

describe('§4.6.6 후보 수락 — 조건이 AND 다', () => {
  it('🔴 종합 점수가 높아도 Re-ID 가 0.45 미만이면 거부한다', () => {
    const top: Candidate = { ...base, reidSimilarity: 0.44 };
    const outcome = associate([top, weak]);

    assert.equal(outcome.kind, 'reject');
    if (outcome.kind !== 'reject') return;
    assert.equal(outcome.reason, 'below_min_reid');
    assert.ok(outcome.top!.score >= 0.62, '종합 점수 자체는 수락선을 넘었다');
    assert.ok(top.reidSimilarity < REACQUIRE_MIN_REID);
  });

  it('둘 다 넘으면 수락한다', () => {
    const outcome = associate([{ ...base, reidSimilarity: 0.8 }, weak]);
    assert.equal(outcome.kind, 'accept');
  });

  it('후보가 없으면 no_candidates 다', () => {
    const outcome = associate([]);
    assert.equal(outcome.kind, 'reject');
    if (outcome.kind === 'reject') assert.equal(outcome.reason, 'no_candidates');
  });
});

describe('§3.8 애매하면 찍지 않는다', () => {
  it('🔴 1등·2등 차가 0.06 미만이면 accept 가 아니라 ambiguous 다', () => {
    const outcome = associate([
      { ...base, reidSimilarity: 0.9 },
      { ...base, reidSimilarity: 0.87 },
    ]);

    assert.equal(outcome.kind, 'ambiguous', 'reject 로 뭉뚱그리면 "모르면 찍는다"가 된다');
    if (outcome.kind !== 'ambiguous') return;
    assert.ok(outcome.margin < CANDIDATE_AMBIGUOUS_MARGIN);
  });

  it('차가 벌어지면 애매하지 않다', () => {
    const outcome = associate([{ ...base, reidSimilarity: 0.9 }, weak]);
    assert.equal(outcome.kind, 'accept');
  });

  it('ambiguityScore 는 1.0 이 "애매하지 않음"이다', () => {
    assert.equal(ambiguityScore(rank([{ ...base, reidSimilarity: 0.9 }])), 1);

    const tied = rank([
      { ...base, reidSimilarity: 0.9 },
      { ...base, reidSimilarity: 0.9 },
    ]);
    assert.equal(ambiguityScore(tied), 0);
  });
});

describe('§4.6.7 ID Switch Hysteresis', () => {
  it('🔴 마진 0.12 를 넘어도 3프레임 연속이라야 전환한다', () => {
    const s = createSwitchState();
    assert.equal(shouldSwitch(s, 0.8, 0.6), false, '1프레임');
    assert.equal(shouldSwitch(s, 0.8, 0.6), false, '2프레임');
    assert.equal(shouldSwitch(s, 0.8, 0.6), true, '3프레임 — 여기서 전환');
  });

  it('마진 미달 프레임이 끼면 연속이 끊긴다', () => {
    const s = createSwitchState();
    shouldSwitch(s, 0.8, 0.6);
    shouldSwitch(s, 0.8, 0.6);
    assert.equal(shouldSwitch(s, 0.65, 0.6), false, '마진 0.05 — 리셋');
    assert.equal(shouldSwitch(s, 0.8, 0.6), false, '다시 1프레임부터');
  });
});
