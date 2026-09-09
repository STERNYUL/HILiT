'use client';

import type { FeedTab } from '@/lib/mock/feed';

/**
 * 하단 고정 내비 — REQ-FUNC-011 · v2.2 §6
 *
 * 🔴 탭은 팔로잉·추천·그룹 3종이고, 가운데 `+` 는 탭이 아니다.
 *    세 탭은 "보는 곳"이고 `+` 는 "만드는 곳"이므로 위계가 달라야 한다.
 *    같은 모양으로 나열하면 그 차이가 사라진다(UX-001 항목 6).
 */

const TABS: ReadonlyArray<{ id: FeedTab; label: string }> = [
  { id: 'following', label: '팔로잉' },
  { id: 'recommended', label: '추천' },
  { id: 'group', label: '그룹' },
];

interface BottomNavProps {
  active: FeedTab;
  onSelect: (tab: FeedTab) => void;
  onCreate: () => void;
}

export function BottomNav({ active, onSelect, onCreate }: BottomNavProps) {
  return (
    <nav
      aria-label="주요 화면"
      data-testid="bottom-nav"
      className="relative z-10 shrink-0 border-t border-shell-line bg-shell-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div role="tablist" aria-label="피드 종류" className="grid grid-cols-4 items-center">
        <TabButton tab={TABS[0]} active={active} onSelect={onSelect} />
        <TabButton tab={TABS[1]} active={active} onSelect={onSelect} />

        {/* 🔴 탭이 아니므로 role="tab" 을 주지 않는다. 모양과 시맨틱 양쪽에서 구분한다. */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onCreate}
            aria-label="편집·업로드 시작"
            data-testid="nav-create"
            className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-shell-accent text-2xl leading-none text-white shadow-lg shadow-black/40 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shell-accent active:scale-95"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>

        <TabButton tab={TABS[2]} active={active} onSelect={onSelect} />
      </div>
    </nav>
  );
}

function TabButton({
  tab,
  active,
  onSelect,
}: {
  tab: { id: FeedTab; label: string };
  active: FeedTab;
  onSelect: (tab: FeedTab) => void;
}) {
  const isActive = active === tab.id;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls="feed-viewport"
      data-testid={`nav-tab-${tab.id}`}
      onClick={() => onSelect(tab.id)}
      className={[
        'flex flex-col items-center gap-1 py-3 text-xs transition-colors',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-shell-accent',
        isActive ? 'text-shell-text' : 'text-shell-muted',
      ].join(' ')}
    >
      <span>{tab.label}</span>
      {/* 활성 표시는 색만으로 구분하지 않는다 — 색각 이상에서도 읽혀야 한다 */}
      <span
        aria-hidden="true"
        className={[
          'h-0.5 w-5 rounded-full transition-colors',
          isActive ? 'bg-shell-accent' : 'bg-transparent',
        ].join(' ')}
      />
    </button>
  );
}
