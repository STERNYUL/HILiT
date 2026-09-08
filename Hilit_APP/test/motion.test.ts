/**
 * motion 회귀 — 가림 30프레임 상한 · 중앙값 카메라 보정 · 선형 보간.
 * 출처: HILIT_추적PoC_기술기획서.md §3.6 · §3.7 · §4.6.1 · §4.6.10
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  NO_CAMERA_MOTION,
  OCCLUSION_MAX_FRAMES,
  PREDICTED_HEALTH_CAP,
  boxScore,
  capPredictedHealth,
  centroidDelta,
  compensate,
  createMotionState,
  estimateCameraMotion,
  interpolate,
  motionScore,
  occlusionScore,
  predict,
  resampleTrack,
  setOpticalFlowProvider,
  updateVelocity,
  visibilityScore,
} from '../src/motion.ts';
import { CENTROID_JUMP_RATIO, diagonal, type BBox, type Vec2 } from '../src/types.ts';

const box = (x: number, y: number, w = 40, h = 80): BBox => ({ x, y, w, h });
/** 광류 Provider 는 프레임 내용을 보지 않으므로 더미로 충분하다 */
const FRAME = {} as unknown as ImageData;

describe('§3.6 가림 예측 — 30프레임 상한', () => {
  it('마지막 박스가 없으면 예측하지 않는다', () => {
    assert.equal(predict(createMotionState()), null);
  });

  it('🔴 30프레임까지 버티고 31번째에 포기한다(→ LOST)', () => {
    const s = createMotionState();
    updateVelocity(s, box(100, 100));
    updateVelocity(s, box(110, 100));

    for (let i = 1; i <= OCCLUSION_MAX_FRAMES; i += 1) {
      assert.notEqual(predict(s), null, `${i}번째 예측은 살아 있어야 한다`);
    }
    assert.equal(predict(s), null, '31번째에서 포기한다');
  });

  it('감쇠 0.92 로 이동량이 줄어든다 — 불확실성을 감쇠로 표현한다', () => {
    const s = createMotionState();
    updateVelocity(s, box(100, 100));
    updateVelocity(s, box(120, 100)); // vx 평균 10

    const first = predict(s)!;
    const beforeX = first.x;
    const second = predict(s)!;
    const step1 = beforeX - 100;
    const step2 = second.x - beforeX;

    assert.ok(step1 > 0 && step2 > 0);
    assert.ok(step2 < step1, '두 번째 걸음이 더 작아야 한다');
  });

  it('occlusionScore 는 0프레임에서 1, 30프레임에서 0 이다', () => {
    assert.equal(occlusionScore(0), 1);
    assert.equal(occlusionScore(15), 0.5);
    assert.equal(occlusionScore(OCCLUSION_MAX_FRAMES), 0);
  });

  it('🔴 예측 박스에는 Health 상한 0.62 가 걸린다', () => {
    assert.equal(capPredictedHealth(0.95, true), PREDICTED_HEALTH_CAP);
    assert.equal(capPredictedHealth(0.95, false), 0.95);
    assert.equal(capPredictedHealth(0.4, true), 0.4, '상한이지 하한이 아니다');
  });
});

describe('§3.7 카메라 보정 — 평균이 아니라 중앙값', () => {
  it('🔴 움직이는 사람 위의 특징점이 섞여도 버틴다', () => {
    const flow: Vec2[] = [
      { x: 1, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0 },
      { x: 50, y: 0 }, // 대상 위의 특징점 — 이상치
    ];
    setOpticalFlowProvider({ sparseFlow: () => flow });

    const cam = estimateCameraMotion(FRAME, FRAME);
    assert.equal(cam.dx, 1, '중앙값 1 (평균이면 10.8 이 된다)');
    assert.equal(cam.points, 5);
  });

  it('특징점이 없으면 보정하지 않는다', () => {
    setOpticalFlowProvider({ sparseFlow: () => [] });
    assert.deepEqual(estimateCameraMotion(FRAME, FRAME), NO_CAMERA_MOTION);
  });

  it('§4.6.1 — Pan 과 같은 방향의 이동은 상쇄된다', () => {
    const cam = { dx: 10, dy: 0, points: 100 };
    assert.deepEqual(compensate({ x: 10, y: 0 }, cam), { x: 0, y: 0 });
  });

  it('보정을 거치면 Pan 중의 정지 대상이 "이동 없음"으로 읽힌다', () => {
    const cam = { dx: 12, dy: 0, points: 100 };
    const delta = centroidDelta(box(112, 100), box(100, 100), cam);
    assert.equal(delta.x, 0, '보정이 없으면 12px 급이동으로 오판했을 상황');
  });
});

describe('§3.2 motion / box / visibility 신호', () => {
  it('이동이 없으면 만점, 대각선 12% 를 넘으면 0점이다', () => {
    assert.equal(motionScore({ x: 0, y: 0 }, 1280, 720), 1);

    const jump = diagonal(1280, 720) * CENTROID_JUMP_RATIO;
    assert.ok(motionScore({ x: jump, y: 0 }, 1280, 720) < 1e-12, '임계에서 0점으로 수렴');
    assert.equal(motionScore({ x: jump * 2, y: 0 }, 1280, 720), 0, '임계를 넘으면 0점');
  });

  it('면적이 그대로면 만점, 0.5배·2.0배에서 0점이다', () => {
    const b = box(0, 0, 40, 80);
    assert.equal(boxScore(b, b), 1);
    assert.equal(boxScore(b, null), 1, '직전 박스가 없으면 판정하지 않는다');
    assert.equal(boxScore(box(0, 0, 40, 160), b), 0, '2.0배');
    assert.equal(boxScore(box(0, 0, 40, 40), b), 0, '0.5배');
  });

  it('화면 밖으로 절반 나가면 0.5 다', () => {
    assert.equal(visibilityScore(box(0, 0, 40, 80), 1280, 720), 1);
    assert.equal(visibilityScore(box(-20, 0, 40, 80), 1280, 720), 0.5);
  });

  it('너무 작은 박스는 소실로 본다', () => {
    assert.equal(visibilityScore(box(10, 10, 2, 2), 1280, 720), 0);
  });
});

describe('§4.6.10 궤적 보간 — 선형', () => {
  it('중간 지점은 정확히 절반이다', () => {
    const mid = interpolate(box(0, 0, 40, 80), box(100, 200, 60, 100), 0.5);
    assert.deepEqual(mid, { x: 50, y: 100, w: 50, h: 90 });
  });

  it('비율은 0~1 로 잘린다 — 🔺 오버슈트를 만들지 않는다', () => {
    const a = box(0, 0);
    const b = box(100, 0);
    assert.deepEqual(interpolate(a, b, 2), b, '앞질러 가지 않는다');
    assert.deepEqual(interpolate(a, b, -1), a);
  });

  it('20fps 궤적을 출력 타임스탬프열로 복원한다', () => {
    const keyframes = [
      { t: 0, box: box(0, 0) },
      { t: 0.05, box: box(10, 0) },
    ];
    const out = resampleTrack(keyframes, [0, 0.025, 0.05]);
    assert.equal(out.length, 3);
    assert.equal(out[0]!.x, 0);
    assert.equal(out[1]!.x, 5);
    assert.equal(out[2]!.x, 10);
  });

  it('키프레임이 없으면 빈 배열이다', () => {
    assert.deepEqual(resampleTrack([], [0, 1]), []);
  });
});
