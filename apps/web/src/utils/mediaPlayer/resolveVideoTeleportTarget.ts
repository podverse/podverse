export type VideoTeleportLocation = 'embedded' | 'full-modal' | 'floating' | null;

/**
 * Decide which DOM node the persistent video host should be appended into for a given
 * `videoLocation`. The host always lands somewhere (falling back to the offscreen holder)
 * so the single `<video>` element stays mounted and keeps playing across transitions.
 */
export function resolveVideoTeleportTarget(
  videoLocation: VideoTeleportLocation,
  floatingTarget: HTMLElement | null,
  modalTarget: HTMLElement | null,
  holder: HTMLElement
): HTMLElement {
  if (videoLocation === 'full-modal' && modalTarget !== null) {
    return modalTarget;
  }
  if (videoLocation === 'floating' && floatingTarget !== null) {
    return floatingTarget;
  }
  return holder;
}
