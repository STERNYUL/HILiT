import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HILiT',
  description: '찍어둔 긴 영상에서 내 순간만 골라 기록으로 남깁니다.',
};

export const viewport: Viewport = {
  themeColor: '#0b0d10',
  // 숏폼 소비 화면 — 확대로 레이아웃이 깨지지 않게 한다
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
