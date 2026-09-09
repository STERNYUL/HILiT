'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { AppShell } from './AppShell';
import type { ViewportStatus } from './FeedViewport';
import { getFeedMock, type FeedPage, type FeedTab, type MockFeedOptions } from '@/lib/mock/feed';

/**
 * 조회 컨테이너 — CT-007 Mock 과 AppShell 을 잇는 계층
 *
 * 🔴 AppShell 은 순수하게 유지한다. 데이터 조회 책임은 여기에만 둔다.
 *    그래야 셸의 6개 상태를 데이터 없이 단독 검증할 수 있다(PHASE 2).
 *
 * 🔺 지금 데이터원은 CT-007 Mock 이다.
 *    FR-026(getFeed)이 완성되면 이 파일의 import 한 줄만 바뀐다.
 *    호출 시그니처가 같아야 하며, 그것이 CT-007 의 인수 기준이다.
 */

interface FeedContainerProps {
  /** RSC(page.tsx)가 서버에서 조회해 넘긴 첫 화면 */
  initialPage: FeedPage;
  initialTab?: FeedTab;
  /** 데모·테스트용 상태 주입 */
  feedOptions?: MockFeedOptions;
}

export function FeedContainer({
  initialPage,
  initialTab = 'following',
  feedOptions,
}: FeedContainerProps) {
  const [page, setPage] = useState<FeedPage>(initialPage);
  const [status, setStatus] = useState<ViewportStatus | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  // 재시도 시 어느 탭을 다시 부를지 기억한다
  const lastTab = useRef<FeedTab>(initialTab);

  const fetchTab = useCallback(
    (tab: FeedTab) => {
      lastTab.current = tab;
      startTransition(async () => {
        setStatus('loading');
        try {
          const next = await getFeedMock(tab, feedOptions);
          setPage(next);
          // status 를 비우면 AppShell 이 데이터로 ready/empty 를 스스로 판정한다
          setStatus(undefined);
        } catch {
          setStatus('error');
        }
      });
    },
    [feedOptions],
  );

  const handleRetry = useCallback(() => {
    fetchTab(lastTab.current);
  }, [fetchTab]);

  return (
    <AppShell
      page={page}
      status={isPending && status === 'loading' ? 'loading' : status}
      initialTab={initialTab}
      onRequestTab={fetchTab}
      onRetry={handleRetry}
    />
  );
}
