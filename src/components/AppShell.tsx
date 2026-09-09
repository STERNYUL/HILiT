'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BottomNav } from './BottomNav';
import { FeedViewport, type ViewportStatus } from './FeedViewport';
import type { FeedPage, FeedTab } from '@/lib/mock/feed';
import { track } from '@/lib/telemetry/events';

/**
 * 앱 셸 — FE-001 / UX-001
 *
 * 🔴 REQ-FUNC-011 · SC-6.1
 *    로그인 화면 없이 팔로잉 탭에서 영상이 재생된다.
 *    재생은 음소거로 시작하고, 첫 조작(탭·스크롤) 시 소리를 켜며 세션 내 유지한다.
 *
 * 🔴 이 컴포넌트는 데이터를 가져오지 않는다.
 *    조회는 RSC(page.tsx)가 하고 여기는 받아서 그린다 — v2.2 §5.1 "조회는 RSC 직접 조회".
 *    그래야 첫 프레임이 서버 렌더로 나와 REQ-NF-001(p95 ≤ 1.5초)에 유리하고,
 *    이펙트 안에서 setState 하는 구조가 생기지 않는다.
 *
 * 🔺 첫 조작의 범위를 "탭 + 스크롤" 둘 다로 잡았다.
 *    Q17(무음 소비 비율)의 실측 대상이므로 trigger 를 계측에 남긴다.
 *    스크롤만으로 켜면 의도치 않은 소리가 나고, 탭만 인정하면 대부분 무음으로 소비한다
 *    — 실측 전에는 어느 쪽도 근거가 없다.
 */

export interface AppShellProps {
  /** RSC가 조회해 넘긴 현재 탭의 피드 */
  page: FeedPage;
  /** 조회 상태. 재조회 중이거나 실패했을 때 RSC/상위가 알려준다 */
  status?: ViewportStatus;
  initialTab?: FeedTab;
  /** 탭 전환 요청 — PHASE 3에서 RSC 재조회에 연결한다 */
  onRequestTab?: (tab: FeedTab) => void;
  /** 재시도 요청 */
  onRetry?: () => void;
}

export function AppShell({
  page,
  status: statusProp,
  initialTab = 'following',
  onRequestTab,
  onRetry,
}: AppShellProps) {
  const [tab, setTab] = useState<FeedTab>(initialTab);

  // 🔴 세션 내 유지 — 매 영상마다 다시 켜게 하지 않는다
  const [muted, setMuted] = useState(true);
  const unmutedOnce = useRef(false);
  const [toast, setToast] = useState<string | null>(null);

  const status: ViewportStatus = statusProp ?? (page.items.length === 0 ? 'empty' : 'ready');
  const item = page.items[0] ?? null;

  // 계측만 수행한다 — 상태를 바꾸지 않으므로 이펙트에 두어도 안전하다
  useEffect(() => {
    if (status === 'ready') {
      // REQ-NF-001 — 앱 실행부터 첫 프레임까지
      track({ name: 'shell_ready', msSinceLoad: Math.round(performance.now()) });
      track({ name: 'feed_opened', tab, itemCount: page.items.length });
      if (page.fallback !== 'none') {
        // SC-6.F1 — 빈 피드 대체 노출
        track({ name: 'feed_empty_fallback', fallbackType: page.fallback });
      }
    } else if (status === 'empty') {
      // REQ-NF-001 — 빈 피드 노출률(< 5%)의 분자
      track({ name: 'feed_empty_shown', tab });
    }
  }, [status, tab, page]);

  /**
   * 첫 조작을 계측한다. 🔴 음소거 상태를 건드리지 않는다.
   * @returns 이번이 첫 조작이었는가
   */
  const markFirstGesture = useCallback((trigger: 'tap' | 'scroll') => {
    if (unmutedOnce.current) return false;
    unmutedOnce.current = true;
    track({ name: 'first_unmute', trigger, msSinceLoad: Math.round(performance.now()) });
    return true;
  }, []);

  /**
   * 🔴 첫 조작 한 번만 소리를 켠다. 이후 사용자가 끄면 그 선택을 존중한다.
   *    명시적 토글(handleToggleSound)과 분리해야 한다 — 한 핸들러에서 둘 다
   *    setMuted 를 호출하면 배치 처리로 첫 클릭이 상쇄된다.
   */
  const activateSoundOnFirstGesture = useCallback(
    (trigger: 'tap' | 'scroll') => {
      if (markFirstGesture(trigger)) setMuted(false);
    },
    [markFirstGesture],
  );

  const handleToggleSound = useCallback(() => {
    // 계측만 한다. 음소거 전환은 아래 setMuted 가 단독으로 책임진다.
    markFirstGesture('tap');
    setMuted((prev) => {
      const next = !prev;
      setToast(next ? '소리를 껐습니다' : '소리를 켰습니다');
      return next;
    });
  }, [markFirstGesture]);

  const handleSelectTab = useCallback(
    (next: FeedTab) => {
      activateSoundOnFirstGesture('tap');
      setTab(next);
      onRequestTab?.(next);
    },
    [activateSoundOnFirstGesture, onRequestTab],
  );

  const handleCreate = useCallback(() => {
    activateSoundOnFirstGesture('tap');
    // 🔺 편집 플로우(UX-002 · FE-002)는 이번 범위 밖이다. 진입 의사만 확인한다.
    setToast('편집 화면은 다음 단계에서 연결됩니다');
  }, [activateSoundOnFirstGesture]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div
      className="relative flex h-dvh flex-col bg-shell-bg"
      onWheel={() => activateSoundOnFirstGesture('scroll')}
      onTouchMove={() => activateSoundOnFirstGesture('scroll')}
      data-testid="app-shell"
    >
      <main id="feed-viewport" role="tabpanel" className="flex flex-1 flex-col overflow-hidden">
        <FeedViewport
          status={status}
          item={item}
          fallback={page.fallback}
          muted={muted}
          onToggleSound={handleToggleSound}
          onRetry={() => onRetry?.()}
          onGoCreate={handleCreate}
        />
      </main>

      {/* 성공·실패 피드백 */}
      {toast && (
        <p
          role="status"
          data-testid="toast"
          className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto w-fit rounded-full bg-black/80 px-4 py-2 text-xs text-shell-text"
        >
          {toast}
        </p>
      )}

      <BottomNav active={tab} onSelect={handleSelectTab} onCreate={handleCreate} />
    </div>
  );
}
