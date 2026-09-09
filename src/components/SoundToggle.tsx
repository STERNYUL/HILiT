'use client';

/**
 * 음소거 상태 표시 및 소리 활성 진입점 — REQ-FUNC-011 · v2.2 §6.5.1
 *
 * 🔴 설계 의도: 음소거가 "결함"이 아니라 "상태"로 읽혀야 한다.
 *    브라우저 자동재생 정책상 소리를 켜고 시작할 수 없으므로(웹 고유 제약),
 *    무음 재생을 그냥 두면 사용자는 앱이 고장 났다고 판단한다.
 *    따라서 "소리 켜기"를 명확한 행동으로 제시한다.
 */

interface SoundToggleProps {
  muted: boolean;
  onToggle: () => void;
}

export function SoundToggle({ muted, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={muted ? '소리 켜기' : '소리 끄기'}
      data-testid="sound-toggle"
      className={[
        'pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5',
        'text-xs font-medium backdrop-blur-sm transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shell-accent',
        muted
          ? 'bg-shell-accent/90 text-white'
          : 'bg-black/45 text-shell-text hover:bg-black/60',
      ].join(' ')}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
      {/* 🔴 음소거일 때만 문구를 노출한다 — 해야 할 행동이 있을 때만 말을 건다 */}
      {muted && <span>소리 켜기</span>}
    </button>
  );
}
