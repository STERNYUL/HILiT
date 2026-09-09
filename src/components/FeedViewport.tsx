'use client';

import { formatDuration } from '@/lib/format';
import type { FeedItem, FeedFallback } from '@/lib/mock/feed';
import { SoundToggle } from './SoundToggle';

/**
 * 재생 영역 — 정상 / 로딩 / 빈 상태 / 오류 4가지를 모두 갖는다.
 *
 * 🔺 미디어 파일이 아직 없으므로 포스터는 색 플레이스홀더다.
 *    다만 <video> 의 muted·autoPlay·playsInline 속성은 실제로 부여해
 *    REQ-FUNC-011 의 DOM 계약이 지금 검증 가능하게 한다.
 */

export type ViewportStatus = 'loading' | 'ready' | 'empty' | 'error';

interface FeedViewportProps {
  status: ViewportStatus;
  item: FeedItem | null;
  fallback: FeedFallback;
  muted: boolean;
  onToggleSound: () => void;
  onRetry: () => void;
  onGoCreate: () => void;
}

export function FeedViewport({
  status,
  item,
  fallback,
  muted,
  onToggleSound,
  onRetry,
  onGoCreate,
}: FeedViewportProps) {
  if (status === 'loading') {
    return (
      <section
        aria-busy="true"
        aria-label="영상을 불러오는 중"
        data-testid="viewport-loading"
        className="relative flex-1 overflow-hidden bg-shell-surface"
      >
        {/* 🔴 흰 화면은 설계가 아니다 — 1.5초(REQ-NF-001) 안에 무엇이든 보여야 한다 */}
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-shell-surface via-shell-line to-shell-surface" />
        <div className="absolute inset-x-0 bottom-24 space-y-2 px-5">
          <div className="h-4 w-28 animate-pulse rounded bg-shell-line" />
          <div className="h-3 w-40 animate-pulse rounded bg-shell-line" />
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section
        role="alert"
        data-testid="viewport-error"
        className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center"
      >
        <p className="text-sm text-shell-muted">
          영상을 불러오지 못했습니다.
          <br />
          연결을 확인한 뒤 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={onRetry}
          data-testid="viewport-retry"
          className="rounded-full bg-shell-accent px-5 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shell-accent"
        >
          다시 시도
        </button>
      </section>
    );
  }

  if (status === 'empty' || !item) {
    return (
      <section
        data-testid="viewport-empty"
        className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center"
      >
        {/* 🔴 RISK-05 — 공개 기록이 늘지 않으면 여기가 자주 보인다.
            그때도 "볼 것이 없다"로 끝내지 않고 만들러 가는 길을 준다. */}
        <p className="text-sm text-shell-muted">
          아직 볼 수 있는 기록이 없습니다.
          <br />
          찍어둔 영상에서 내 순간을 먼저 만들어 보세요.
        </p>
        <button
          type="button"
          onClick={onGoCreate}
          data-testid="viewport-go-create"
          className="rounded-full bg-shell-accent px-5 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shell-accent"
        >
          내 기록 만들기
        </button>
      </section>
    );
  }

  return (
    <section
      data-testid="viewport-ready"
      className="relative flex-1 overflow-hidden"
      style={{ backgroundColor: item.posterColor }}
    >

      <video
        data-testid="feed-video"
        className="h-full w-full object-cover"
        muted={muted}
        autoPlay
        loop
        playsInline
        aria-label={`${item.ownerDisplayName}의 ${item.sport} 기록`}
      />

      {/* SC-6.F1 — 대체 노출 사실을 감추지 않는다. 감추면 사용자는
          자기가 팔로우한 사람들의 기록이라고 오해한다. */}
      {fallback === 'recommended-for-empty-following' && (
        <p
          data-testid="fallback-notice"
          className="absolute inset-x-0 top-0 bg-black/55 px-4 py-2 text-center text-xs text-shell-text backdrop-blur-sm"
        >
          아직 팔로우한 사람이 없어 추천 기록을 보여드립니다.
        </p>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-4 pt-14">
        <SoundToggle muted={muted} onToggle={onToggleSound} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-5 pb-6 pt-16">
        <p className="text-sm font-semibold">{item.ownerDisplayName}</p>
        <p className="mt-0.5 text-xs text-shell-muted">
          @{item.ownerHandle} · {item.sport} · {formatDuration(item.durationMs)} ·{' '}
          {item.createdAtLabel}
        </p>
      </div>
    </section>
  );
}
