export type ChipRowRevealInput = {
  chipX: number;
  chipWidth: number;
  scrollX: number;
  viewportWidth: number;
  contentWidth: number;
  /** Space kept between a revealed chip and the edge it scrolled in from. */
  edgeInset: number;
};

/**
 * Horizontal offset that brings a chip fully into a measured, scrolled row, or `null` when it is
 * already fully visible. The offset stays inside the content, so a chip near either end lands at
 * that end rather than leaving blank space.
 */
export function getChipRevealOffset({
  chipX,
  chipWidth,
  scrollX,
  viewportWidth,
  contentWidth,
  edgeInset,
}: ChipRowRevealInput): number | null {
  const chipRight = chipX + chipWidth;
  let target: number;
  if (chipX < scrollX) {
    target = chipX - edgeInset;
  } else if (chipRight > scrollX + viewportWidth) {
    target = chipRight + edgeInset - viewportWidth;
  } else {
    return null;
  }
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  const clamped = Math.min(Math.max(target, 0), maxOffset);
  return clamped === scrollX ? null : clamped;
}
