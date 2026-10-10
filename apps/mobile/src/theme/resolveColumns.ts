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
 * Phone: 3. Tablet (`md` and up): 5. Same breakpoints as `resolveColumns` so the two stay in step.
 */
export function resolveGridColumns(
  width: number,
  breakpoints: Breakpoints = defaultBreakpoints
): number {
  if (width >= breakpoints.md) {
    return 5;
  }
  return 3;
}

/**
 * Fixed tile width for a FlatList `numColumns` grid.
 *
 * Do not put `flex: 1` on grid cells. With fewer items than columns in a row (common with one
 * subscription), flex grows that cell to the full row width and the grid reads as a single-column
 * list. A measured width keeps every tile at one column slot whether the row is full or not.
 */
export function resolveGridCellWidth(options: {
  columns: number;
  contentWidth: number;
  gap: number;
}): number {
  const { columns, contentWidth, gap } = options;
  if (columns <= 1) {
    return Math.max(0, contentWidth);
  }
  const totalGap = gap * (columns - 1);
  return Math.max(0, (contentWidth - totalGap) / columns);
}

/**
 * Columns and cell width for a feed list that shows rows or artwork tiles.
 *
 * `width` is the list's own width. On a tablet the left tab rail takes part of the window, so a
 * window-based count overfills the list and its cells overflow. Once there is more than one column,
 * rows get the same fixed cell width tiles do — a multi-column FlatList gives unsized cells no width
 * of their own. A single column of rows fills the list without one, so `cellWidth` is 0 there.
 */
export function resolveFeedListColumns(options: {
  breakpoints?: Breakpoints;
  gap: number;
  horizontalInset: number;
  isGridView: boolean;
  width: number;
}): { cellWidth: number; columns: number } {
  const { breakpoints = defaultBreakpoints, gap, horizontalInset, isGridView, width } = options;
  const columns = isGridView
    ? resolveGridColumns(width, breakpoints)
    : resolveColumns(width, breakpoints);
  const cellWidth =
    columns > 1
      ? resolveGridCellWidth({ columns, contentWidth: width - 2 * horizontalInset, gap })
      : 0;
  return { cellWidth, columns };
}
