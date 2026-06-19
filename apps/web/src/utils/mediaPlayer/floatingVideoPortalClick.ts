/**
 * Returns whether a click on the floating video portal should toggle play/pause.
 * Chrome controls (close, PiP, etc.) use `data-floating-video-chrome`.
 */
export function shouldFloatingVideoPortalClickTogglePlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (target.closest('[data-floating-video-chrome]')) {
    return false;
  }
  if (target.closest('button, a, input, select, textarea, label')) {
    return false;
  }
  return true;
}
