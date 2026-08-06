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
