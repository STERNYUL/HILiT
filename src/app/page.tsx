import { AppShell } from '@/components/AppShell';
import { getFeedMock } from '@/lib/mock/feed';

/**
 * 진입 화면 — SC-6.1
 *
 * 🔴 로그인 화면을 앞에 두지 않는다. 로그인은 필요해질 때 요청한다.
 * 🔴 조회는 여기(RSC)에서 한다 — v2.2 §5.1. 첫 프레임이 서버 렌더로 나온다.
 * 🔺 현재 데이터원은 CT-007 Mock이다. FR-026(getFeed) 완성 시 import 만 바꾼다.
 */
export default async function Home() {
  const page = await getFeedMock('following');
  return <AppShell page={page} />;
}
