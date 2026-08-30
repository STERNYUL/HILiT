/**
 * CT-007 Mock 픽스처 — 피드 계층
 *
 * 🔴 이 파일은 프로덕션 번들에 포함되지 않는다.
 *    `NEXT_PUBLIC_DATA_SOURCE=mock` 일 때만 사용된다.
 *
 * 🔺 Mock 값은 실측치가 아니다. 형태 검증용이며 지표 판정에 쓰지 않는다.
 */

export type FeedTab = 'following' | 'recommended' | 'group';

/** SC-6.F1 — 팔로잉 0명일 때 추천으로 대체됐음을 화면이 알 수 있어야 한다 */
export type FeedFallback = 'none' | 'recommended-for-empty-following';

export interface FeedItem {
  id: string;
  ownerHandle: string;
  ownerDisplayName: string;
  sport: string;
  durationMs: number;
  posterColor: string; // 실제 썸네일 대신 플레이스홀더
  createdAtLabel: string;
}

export interface FeedPage {
  items: FeedItem[];
  fallback: FeedFallback;
  nextCursor: string | null;
}

const item = (
  id: string,
  handle: string,
  name: string,
  sport: string,
  durationMs: number,
  posterColor: string,
  createdAtLabel: string,
): FeedItem => ({
  id,
  ownerHandle: handle,
  ownerDisplayName: name,
  sport,
  durationMs,
  posterColor,
  createdAtLabel,
});

/** F1 — 팔로잉 탭 정상 (전체공개 기록만) */
export const FIXTURE_FOLLOWING: FeedItem[] = [
  item('f1', 'jinwoo_bb', '진우', '농구', 15_000, '#2E4A62', '2일 전'),
  item('f2', 'court_sunny', '선희', '농구', 14_200, '#5A3A52', '3일 전'),
  item('f3', 'wed_hoops', '민재', '농구', 15_000, '#3F5140', '5일 전'),
];

/** F2 — 추천 탭 (인기 기준) */
export const FIXTURE_RECOMMENDED: FeedItem[] = [
  item('r1', 'anon_guard', '태호', '농구', 15_000, '#6A4A2E', '1일 전'),
  item('r2', 'ssg_center', '유나', '농구', 13_800, '#2E5A5A', '4일 전'),
];

/** F3 — 그룹 탭 (소속 그룹의 그룹 공개 기록) */
export const FIXTURE_GROUP: FeedItem[] = [
  item('g1', 'wed_hoops', '민재', '농구', 15_000, '#4A3A6A', '어제'),
];

export interface MockFeedOptions {
  /** F4 — 팔로잉 0명 상태를 강제해 SC-6.F1 을 재현한다 */
  emptyFollowing?: boolean;
  /** F5 — 추천할 공개 기록조차 없는 초기 상태 (REQ-NF-001 빈 피드 노출률) */
  emptyAll?: boolean;
  /** F6 — 조회 실패 */
  fail?: boolean;
  /** 지연 시뮬레이션 (ms) — 로딩 상태 확인용 */
  delayMs?: number;
}

export class FeedFetchError extends Error {
  constructor() {
    super('피드를 불러오지 못했습니다.');
    this.name = 'FeedFetchError';
  }
}

/**
 * 🔴 실제 조회(FR-026 getFeed)와 시그니처가 같아야 한다.
 *    교체 시 호출부 코드 변경이 0건이어야 한다.
 */
export async function getFeedMock(
  tab: FeedTab,
  options: MockFeedOptions = {},
): Promise<FeedPage> {
  const { emptyFollowing = false, emptyAll = false, fail = false, delayMs = 0 } = options;

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (fail) {
    throw new FeedFetchError();
  }
  if (emptyAll) {
    return { items: [], fallback: 'none', nextCursor: null };
  }

  if (tab === 'following') {
    // SC-6.F1 — 팔로잉이 비면 빈 화면이 아니라 추천을 내보낸다
    if (emptyFollowing) {
      return {
        items: FIXTURE_RECOMMENDED,
        fallback: 'recommended-for-empty-following',
        nextCursor: null,
      };
    }
    return { items: FIXTURE_FOLLOWING, fallback: 'none', nextCursor: null };
  }
  if (tab === 'recommended') {
    return { items: FIXTURE_RECOMMENDED, fallback: 'none', nextCursor: null };
  }
  return { items: FIXTURE_GROUP, fallback: 'none', nextCursor: null };
}
