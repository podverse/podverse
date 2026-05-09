import { EVENTS } from '../../../constants/events';

export type MediaPlayerKeyDownState = {
  mpAddByRSS: unknown | null;
  mpChannel: unknown | null;
  mpCurrentTime: number;
  mpDuration: number;
};

/**
 * Shared window keyboard handling for seek keys and Space (play/pause).
 * Pure helper so behavior can be covered by unit tests without mounting the full controller.
 */
export function handleMediaPlayerWindowKeyDown(
  e: Pick<KeyboardEvent, 'code' | 'key' | 'repeat' | 'preventDefault'>,
  target: HTMLElement,
  state: MediaPlayerKeyDownState,
  dispatchSeek: (time: number) => void,
  togglePlayPause: () => void
): void {
  if (target.closest('input, textarea, select, [contenteditable="true"]')) {
    return;
  }

  if (e.key === 'ArrowLeft') {
    if (e.repeat) {
      return;
    }
    const newTime = Math.max(0, state.mpCurrentTime - 10);
    dispatchSeek(newTime);
    e.preventDefault();
    return;
  }

  if (e.key === 'ArrowRight') {
    if (e.repeat) {
      return;
    }
    const newTime = Math.min(state.mpDuration, state.mpCurrentTime + 10);
    dispatchSeek(newTime);
    e.preventDefault();
    return;
  }

  if (e.code === 'Space') {
    if (e.repeat) {
      return;
    }
    if (
      target.closest(
        '[role="menuitem"], [role="menu"], [role="menubar"], [role="listbox"], [role="option"]'
      )
    ) {
      return;
    }
    if (!state.mpChannel && !state.mpAddByRSS) {
      return;
    }
    if (target.closest('button, a[href], [role="button"]')) {
      return;
    }
    togglePlayPause();
    e.preventDefault();
  }
}

export function dispatchMediaPlayerSeek(time: number): void {
  window.dispatchEvent(new CustomEvent(EVENTS.MEDIA_PLAYER.SEEK, { detail: { time } }));
}
