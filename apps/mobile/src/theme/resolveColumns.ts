import type { Breakpoints } from '@podverse/design-tokens';
import { breakpoints as defaultBreakpoints } from '@podverse/design-tokens';

/**
 * Pure column count for tablet/phone grids. Kept free of React Native so node Vitest can cover it.
 */
export function resolveColumns(
  width: number,
  breakpoints: Breakpoints = defaultBreakpoints
): number {
  if (width >= breakpoints.lg) {
    return 3;
  }
  if (width >= breakpoints.md) {
    return 2;
  }
  return 1;
}

export function resolveIsTablet(
  width: number,
  breakpoints: Breakpoints = defaultBreakpoints
): boolean {
  return width >= breakpoints.md;
}

/**
 * Column count for a grid of bare artwork tiles.
 *
 * Deliberately not `resolveColumns`, which counts how many **rows** fit side by side. A row carries
 * artwork, a title, a metadata line, and its action buttons, so a phone fits exactly one; a tile is
 * a square of artwork and a phone fits several. Reusing the row count would put a single tile per
 * line on every phone, which is a list with the titles removed rather than a grid.
 *
 * Scales on the same breakpoints so the two stay in step as the window changes.
 */
export function resolveGridColumns(
  width: number,
  breakpoints: Breakpoints = defaultBreakpoints
): number {
  if (width >= breakpoints.lg) {
    return 5;
  }
  if (width >= breakpoints.md) {
    return 4;
  }
  return 3;
}
