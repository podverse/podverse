export type MediaPlayerKeyDownState = {
  hasResource: boolean;
  canJump: boolean;
};

/**
 * Shared window keyboard handling for skip keys and Space (play/pause).
 * Pure helper so behavior can be covered by unit tests without mounting the full controller.
 */
export function handleMediaPlayerWindowKeyDown(
  e: Pick<KeyboardEvent, 'code' | 'key' | 'repeat' | 'preventDefault'>,
  target: HTMLElement,
  state: MediaPlayerKeyDownState,
  jumpBy: (deltaSeconds: number) => void,
  togglePlayPause: () => void
): void {
  if (target.closest('input, textarea, select, [contenteditable], [contenteditable="true"]')) {
    return;
  }

  if (e.key === 'ArrowLeft') {
    if (e.repeat) {
      return;
    }
    if (!state.canJump) {
      return;
    }
    jumpBy(-10);
    e.preventDefault();
    return;
  }

  if (e.key === 'ArrowRight') {
    if (e.repeat) {
      return;
    }
    if (!state.canJump) {
      return;
    }
    jumpBy(10);
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
    if (target.closest('[role="slider"], [role="dialog"]')) {
      return;
    }
    if (!state.hasResource) {
      return;
    }
    if (target.closest('button, a[href], [role="button"]')) {
      return;
    }
    togglePlayPause();
    e.preventDefault();
  }
}
