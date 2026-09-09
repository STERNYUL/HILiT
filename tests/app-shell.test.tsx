import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '@/components/AppShell';
import { getFeedMock, type FeedPage, type MockFeedOptions } from '@/lib/mock/feed';
import { __getBuffer, __resetBuffer } from '@/lib/telemetry/events';

/**
 * FE-001 앱 셸 — UX-001 산출물 및 템플릿 A-5 상태 검증
 *
 * 검증 상태: 정상 / Loading / Empty / Error / 사용자 입력 / 성공·실패 피드백
 *
 * 🔴 AppShell 은 데이터를 가져오지 않는다. RSC(page.tsx)가 조회해 넘긴다.
 *    따라서 테스트도 RSC와 같은 방식으로 데이터를 준비해 주입한다.
 */

beforeEach(() => {
  __resetBuffer();
});

const eventNames = () => __getBuffer().map((e) => e.name);

/** page.tsx(RSC)가 하는 일을 그대로 흉내 낸다 */
async function loadPage(tab: 'following' | 'recommended' | 'group' = 'following', options: MockFeedOptions = {}): Promise<FeedPage> {
  return getFeedMock(tab, options);
}

const EMPTY_PAGE: FeedPage = { items: [], fallback: 'none', nextCursor: null };

describe('진입 상태 (SC-6.1 · REQ-FUNC-011)', () => {
  it('로그인 화면 없이 팔로잉 탭에서 영상이 재생된다', async () => {
    render(<AppShell page={await loadPage()} />);

    expect(screen.getByTestId('viewport-ready')).toBeInTheDocument();
    expect(screen.queryByText(/로그인/)).not.toBeInTheDocument();
    expect(screen.getByTestId('nav-tab-following')).toHaveAttribute('aria-selected', 'true');
  });

  it('🔴 재생이 음소거로 시작한다 (브라우저 자동재생 정책)', async () => {
    render(<AppShell page={await loadPage()} />);
    const video = screen.getByTestId<HTMLVideoElement>('feed-video');
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.playsInline).toBe(true);
  });

  it('🔴 음소거가 결함이 아니라 상태로 읽힌다 — "소리 켜기"가 행동으로 제시된다', async () => {
    render(<AppShell page={await loadPage()} />);
    const toggle = screen.getByTestId('sound-toggle');
    expect(toggle).toHaveAccessibleName('소리 켜기');
    expect(toggle).toHaveTextContent('소리 켜기');
  });
});

describe('첫 조작으로 소리 활성 (v2.2 §6.5.1)', () => {
  it('탭 조작 시 소리가 켜지고 first_unmute 가 발행된다', async () => {
    const user = userEvent.setup();
    render(<AppShell page={await loadPage()} />);

    await user.click(screen.getByTestId('nav-tab-recommended'));

    expect(screen.getByTestId<HTMLVideoElement>('feed-video').muted).toBe(false);
    const ev = __getBuffer().find((e) => e.name === 'first_unmute');
    expect(ev && 'trigger' in ev ? ev.trigger : null).toBe('tap');
  });

  it('🔴 first_unmute 는 세션당 한 번만 발행된다', async () => {
    const user = userEvent.setup();
    render(<AppShell page={await loadPage()} />);

    await user.click(screen.getByTestId('nav-tab-recommended'));
    await user.click(screen.getByTestId('nav-tab-group'));
    await user.click(screen.getByTestId('nav-tab-following'));

    expect(eventNames().filter((n) => n === 'first_unmute')).toHaveLength(1);
  });

  it('🔴 소리 켜기 버튼의 첫 클릭이 실제로 소리를 켠다', async () => {
    const user = userEvent.setup();
    render(<AppShell page={await loadPage()} />);

    await user.click(screen.getByTestId('sound-toggle'));

    expect(screen.getByTestId<HTMLVideoElement>('feed-video').muted).toBe(false);
    expect(screen.getByTestId('sound-toggle')).toHaveAccessibleName('소리 끄기');
  });

  it('🔴 사용자가 소리를 다시 끄면 그 선택이 유지된다 (자동 재활성 없음)', async () => {
    const user = userEvent.setup();
    render(<AppShell page={await loadPage()} />);

    await user.click(screen.getByTestId('sound-toggle')); // 켜짐
    await user.click(screen.getByTestId('sound-toggle')); // 다시 꺼짐
    await user.click(screen.getByTestId('nav-tab-group')); // 이후 조작

    expect(screen.getByTestId<HTMLVideoElement>('feed-video').muted).toBe(true);
  });
});

describe('탭 전환 (REQ-FUNC-011)', () => {
  it('3탭이 있고 활성 표시가 aria-selected 로 드러난다', async () => {
    const user = userEvent.setup();
    render(<AppShell page={await loadPage()} />);

    expect(screen.getAllByRole('tab')).toHaveLength(3);

    await user.click(screen.getByTestId('nav-tab-group'));
    expect(screen.getByTestId('nav-tab-group')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('nav-tab-following')).toHaveAttribute('aria-selected', 'false');
  });

  it('🔴 가운데 + 는 탭이 아니다 — role="tab" 을 갖지 않는다', async () => {
    render(<AppShell page={await loadPage()} />);

    const create = screen.getByTestId('nav-create');
    expect(create).not.toHaveAttribute('role', 'tab');
    expect(create).toHaveAccessibleName('편집·업로드 시작');
    expect(screen.getAllByRole('tab')).not.toContain(create);
  });

  it('탭 전환이 상위에 조회 요청으로 전달된다 (PHASE 3 연결 지점)', async () => {
    const user = userEvent.setup();
    const requested: string[] = [];
    render(<AppShell page={await loadPage()} onRequestTab={(t) => requested.push(t)} />);

    await user.click(screen.getByTestId('nav-tab-group'));
    expect(requested).toEqual(['group']);
  });
});

describe('Loading 상태 (REQ-NF-001)', () => {
  it('🔴 흰 화면이 아니라 스켈레톤이 보인다', async () => {
    render(<AppShell page={await loadPage()} status="loading" />);
    expect(screen.getByTestId('viewport-loading')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Empty 상태 (SC-6.F1 · RISK-05)', () => {
  it('🔴 팔로잉 0명이면 빈 화면이 아니라 추천이 나온다', async () => {
    render(<AppShell page={await loadPage('following', { emptyFollowing: true })} />);

    expect(screen.getByTestId('viewport-ready')).toBeInTheDocument();
    expect(screen.getByTestId('fallback-notice')).toBeInTheDocument();
    expect(eventNames()).toContain('feed_empty_fallback');
  });

  it('🔴 대체 노출 사실을 감추지 않는다', async () => {
    render(<AppShell page={await loadPage('following', { emptyFollowing: true })} />);
    expect(screen.getByTestId('fallback-notice')).toHaveTextContent('팔로우한 사람이 없어');
  });

  it('추천할 기록조차 없으면 빈 상태와 만들기 경로가 나온다', () => {
    render(<AppShell page={EMPTY_PAGE} />);

    expect(screen.getByTestId('viewport-empty')).toBeInTheDocument();
    expect(screen.getByTestId('viewport-go-create')).toBeInTheDocument();
    expect(eventNames()).toContain('feed_empty_shown');
  });
});

describe('Error 상태', () => {
  it('오류 시 alert 과 재시도 경로가 제공된다', () => {
    render(<AppShell page={EMPTY_PAGE} status="error" />);

    const error = screen.getByTestId('viewport-error');
    expect(error).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('viewport-retry')).toBeInTheDocument();
  });

  it('재시도가 상위에 전달된다', async () => {
    const user = userEvent.setup();
    let retried = 0;
    render(<AppShell page={EMPTY_PAGE} status="error" onRetry={() => (retried += 1)} />);

    await user.click(screen.getByTestId('viewport-retry'));
    expect(retried).toBe(1);
  });
});

describe('성공·실패 피드백', () => {
  it('소리 전환 시 상태 메시지가 노출된다', async () => {
    const user = userEvent.setup();
    render(<AppShell page={await loadPage()} />);

    await user.click(screen.getByTestId('sound-toggle'));
    const toast = await screen.findByTestId('toast');
    expect(toast).toHaveAttribute('role', 'status');
    expect(toast).toHaveTextContent('소리를 켰습니다');
  });

  it('+ 진입 시 다음 단계 안내가 노출된다', async () => {
    const user = userEvent.setup();
    render(<AppShell page={await loadPage()} />);

    await user.click(screen.getByTestId('nav-create'));
    expect(await screen.findByTestId('toast')).toHaveTextContent('편집 화면');
  });
});

describe('계측 (REQ-NF-001)', () => {
  it('shell_ready 와 feed_opened 가 발행된다', async () => {
    render(<AppShell page={await loadPage()} />);

    expect(eventNames()).toContain('shell_ready');
    expect(eventNames()).toContain('feed_opened');
  });

  it('🔴 shell_ready 는 페이지 로드 기준으로 측정된다 (마운트 기준 아님)', async () => {
    render(<AppShell page={await loadPage()} />);

    const ev = __getBuffer().find((e) => e.name === 'shell_ready');
    expect(ev && 'msSinceLoad' in ev).toBe(true);
  });
});
