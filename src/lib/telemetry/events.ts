/**
 * 계측 이벤트 — SRS v1.8 §6.4.3
 *
 * 🔺 이 파일은 이벤트의 "발행 지점"만 정의한다.
 *    수집 파이프라인은 NF-003 소관이며 여기서는 콘솔·버퍼로만 흘린다.
 */

export type TelemetryEvent =
  /** REQ-FUNC-011 — 첫 조작으로 소리가 켜진 시점 */
  | { name: 'first_unmute'; trigger: 'tap' | 'scroll'; msSinceLoad: number }
  /** REQ-NF-001 — 앱 실행부터 첫 프레임까지. 🔴 페이지 로드(performance.timeOrigin) 기준이다 */
  | { name: 'shell_ready'; msSinceLoad: number }
  | { name: 'feed_opened'; tab: string; itemCount: number }
  /** SC-6.F1 — 빈 피드 대체 노출 */
  | { name: 'feed_empty_fallback'; fallbackType: string }
  /** REQ-NF-001 — 대체 후에도 빈 화면인 경우 (빈 피드 노출률 < 5%) */
  | { name: 'feed_empty_shown'; tab: string };

const buffer: Array<TelemetryEvent & { at: number }> = [];

export function track(event: TelemetryEvent): void {
  buffer.push({ ...event, at: Date.now() });
  if (process.env.NODE_ENV !== 'production') {

    console.info('[telemetry]', event.name, event);
  }
}

/** 테스트 전용 — 발행 여부를 검증한다 */
export function __getBuffer(): ReadonlyArray<TelemetryEvent & { at: number }> {
  return buffer;
}

export function __resetBuffer(): void {
  buffer.length = 0;
}
