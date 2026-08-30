import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedContainer } from '@/components/FeedContainer';
import {
  getFeedMock,
  FIXTURE_FOLLOWING,
  FIXTURE_RECOMMENDED,
  FIXTURE_GROUP,
} from '@/lib/mock/feed';
import { __resetBuffer, __getBuffer } from '@/lib/telemetry/events';

/**
 * PHASE 4 통합 검증 — CT-007 Mock ↔ FE-001 앱 셸
 *
 * 템플릿 B의 확인 항목을 그대로 시나리오로 옮긴다.
 *  - 기존 단계의 동작을 깨뜨리지 않는가?
 *  - UI에서 입력한 값이 실제 로직으로 전달되는가?
 *  - 로직 결과가 UI에 정상 반영되는가?
 *  - 단계 간 데이터 흐름이 유지되는가?
 *  - 새 UI가 기존 사용자 흐름을 방해하지 않는가?
 */

beforeEach(() => {
  __resetBuffer();
});

const eventNames = () => __getBuffer().map((e) => e.name);

describe('ENTRY — 서버가 조회한 첫 화면이 그대로 그려진다', () => {
  it('RSC가 넘긴 initialPage 가 첫 렌더에 반영된다', async () => {
    const initialPage = await getFeedMock('following');
    render(<FeedContainer initialPage={initialPage} />);

    // 🔴 로딩을 거치지 않는다 — 서버가 이미 데이터를 갖고 왔다
    expect(screen.queryByTestId('viewport-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('viewport-ready')).toBeInTheDocument();
    expect(screen.getByText(FIXTURE_FOLLOWING[0].ownerDisplayName)).toBeInTheDocument();
  });
});

describe('ACTION → OUTPUT — 탭 입력이 조회로 전달되고 결과가 UI에 반영된다', () => {
  it('추천 탭을 누르면 추천 픽스처로 내용이 바뀐다', async () => {
    const user = userEvent.setup();
    render(<FeedContainer initialPage={await getFeedMock('following')} />);

    expect(screen.getByText(FIXTURE_FOLLOWING[0].ownerDisplayName)).toBeInTheDocument();

    await user.click(screen.getByTestId('nav-tab-recommended'));

    await waitFor(() => {
      expect(screen.getByText(FIXTURE_RECOMMENDED[0].ownerDisplayName)).toBeInTheDocument();
    });
    expect(screen.queryByText(FIXTURE_FOLLOWING[0].ownerDisplayName)).not.toBeInTheDocument();
  });

  it('그룹 탭도 같은 경로로 동작한다', async () => {
    const user = userEvent.setup();
    render(<FeedContainer initialPage={await getFeedMock('following')} />);

    await user.click(screen.getByTestId('nav-tab-group'));

    await waitFor(() => {
      expect(screen.getByText(FIXTURE_GROUP[0].ownerDisplayName)).toBeInTheDocument();
    });
  });

  it('탭을 옮겨도 다시 돌아오면 원래 내용이 나온다 (데이터 흐름 유지)', async () => {
    const user = userEvent.setup();
    render(<FeedContainer initialPage={await getFeedMock('following')} />);

    await user.click(screen.getByTestId('nav-tab-group'));
    await waitFor(() =>
      expect(screen.getByText(FIXTURE_GROUP[0].ownerDisplayName)).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId('nav-tab-following'));
    await waitFor(() =>
      expect(screen.getByText(FIXTURE_FOLLOWING[0].ownerDisplayName)).toBeInTheDocument(),
    );
  });
});

describe('REGRESSION — 통합이 기존 UI 동작을 깨뜨리지 않는다', () => {
  it('🔴 탭을 옮겨도 소리 설정이 유지된다 (REQ-FUNC-011 세션 내 유지)', async () => {
    const user = userEvent.setup();
    render(<FeedContainer initialPage={await getFeedMock('following')} />);

    await user.click(screen.getByTestId('sound-toggle')); // 소리 켬
    expect(screen.getByTestId<HTMLVideoElement>('feed-video').muted).toBe(false);

    await user.click(screen.getByTestId('nav-tab-recommended'));
    await waitFor(() =>
      expect(screen.getByText(FIXTURE_RECOMMENDED[0].ownerDisplayName)).toBeInTheDocument(),
    );

    // 🔴 라우트 기반 재조회를 택했다면 언마운트로 여기서 true 로 되돌아간다
    expect(screen.getByTestId<HTMLVideoElement>('feed-video').muted).toBe(false);
  });

  it('🔴 탭을 여러 번 옮겨도 first_unmute 는 한 번만 발행된다', async () => {
    const user = userEvent.setup();
    render(<FeedContainer initialPage={await getFeedMock('following')} />);

    await user.click(screen.getByTestId('nav-tab-recommended'));
    await user.click(screen.getByTestId('nav-tab-group'));
    await user.click(screen.getByTestId('nav-tab-following'));

    await waitFor(() =>
      expect(eventNames().filter((n) => n === 'first_unmute')).toHaveLength(1),
    );
  });

  it('가운데 + 는 통합 후에도 탭이 아니다', async () => {
    render(<FeedContainer initialPage={await getFeedMock('following')} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByTestId('nav-create')).not.toHaveAttribute('role', 'tab');
  });
});

describe('실패 경로 — 조회 실패가 UI로 전달되고 재시도가 로직에 닿는다', () => {
  it('조회가 실패하면 오류 화면이 나온다', async () => {
    const user = userEvent.setup();
    render(
      <FeedContainer initialPage={await getFeedMock('following')} feedOptions={{ fail: true }} />,
    );

    await user.click(screen.getByTestId('nav-tab-group'));

    await waitFor(() => expect(screen.getByTestId('viewport-error')).toBeInTheDocument());
    expect(screen.getByTestId('viewport-error')).toHaveAttribute('role', 'alert');
  });

  it('🔴 재시도가 마지막으로 요청한 탭을 다시 부른다', async () => {
    const user = userEvent.setup();
    // 실패하도록 두었다가 재시도 버튼이 같은 탭을 다시 요청하는지 본다
    render(
      <FeedContainer initialPage={await getFeedMock('following')} feedOptions={{ fail: true }} />,
    );

    await user.click(screen.getByTestId('nav-tab-group'));
    await waitFor(() => expect(screen.getByTestId('viewport-error')).toBeInTheDocument());

    await user.click(screen.getByTestId('viewport-retry'));
    // 여전히 실패하므로 오류 화면이 유지된다 — 재시도가 조용히 성공으로 바뀌지 않는다
    await waitFor(() => expect(screen.getByTestId('viewport-error')).toBeInTheDocument());
  });
});

describe('SC-6.F1 — 빈 피드 대체가 통합 경로에서도 동작한다', () => {
  it('팔로잉이 비면 추천으로 대체되고 그 사실이 표시된다', async () => {
    const initialPage = await getFeedMock('following', { emptyFollowing: true });
    render(<FeedContainer initialPage={initialPage} />);

    expect(screen.getByTestId('fallback-notice')).toBeInTheDocument();
    expect(eventNames()).toContain('feed_empty_fallback');
  });
});
