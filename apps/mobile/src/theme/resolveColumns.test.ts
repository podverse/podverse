import { describe, expect, it } from 'vitest';

import { breakpoints } from '@podverse/design-tokens';

import {
  resolveColumns,
  resolveFeedListColumns,
  resolveGridCellWidth,
  resolveGridColumns,
  resolveIsTablet,
} from './resolveColumns';

describe('resolveColumns', () => {
  it('returns 1 column below the md breakpoint (phone)', () => {
    expect(resolveColumns(breakpoints.md - 1)).toBe(1);
    expect(resolveColumns(0)).toBe(1);
    expect(resolveColumns(375)).toBe(1);
  });

  it('returns 2 columns from md up to (but not including) lg', () => {
    expect(resolveColumns(breakpoints.md)).toBe(2);
    expect(resolveColumns(breakpoints.lg - 1)).toBe(2);
  });

  it('returns 3 columns at lg and above', () => {
    expect(resolveColumns(breakpoints.lg)).toBe(3);
    expect(resolveColumns(1200)).toBe(3);
  });

  it('honors an explicit breakpoints override', () => {
    expect(resolveColumns(500, { sm: 0, md: 400, lg: 800 })).toBe(2);
    expect(resolveColumns(800, { sm: 0, md: 400, lg: 800 })).toBe(3);
  });
});

describe('resolveGridColumns', () => {
  it('fits three artwork tiles per line on a phone, where a row list fits one', () => {
    expect(resolveGridColumns(375)).toBe(3);
    expect(resolveGridColumns(breakpoints.md - 1)).toBe(3);
    expect(resolveColumns(375)).toBe(1);
  });

  it('uses five columns on tablet widths (md and up)', () => {
    expect(resolveGridColumns(breakpoints.md)).toBe(5);
    expect(resolveGridColumns(breakpoints.lg)).toBe(5);
    expect(resolveGridColumns(1200)).toBe(5);
  });

  it('honors an explicit breakpoints override', () => {
    expect(resolveGridColumns(399, { sm: 0, md: 400, lg: 800 })).toBe(3);
    expect(resolveGridColumns(400, { sm: 0, md: 400, lg: 800 })).toBe(5);
  });
});

describe('resolveGridCellWidth', () => {
  it('splits content width across columns minus inter-column gaps', () => {
    // 300 wide, 3 columns, 12 gap → (300 - 24) / 3 = 92
    expect(resolveGridCellWidth({ columns: 3, contentWidth: 300, gap: 12 })).toBe(92);
  });

  it('keeps a one-column layout at the full content width', () => {
    expect(resolveGridCellWidth({ columns: 1, contentWidth: 300, gap: 12 })).toBe(300);
  });

  it('does not return a negative width when gaps exceed content width', () => {
    expect(resolveGridCellWidth({ columns: 3, contentWidth: 10, gap: 20 })).toBe(0);
  });
});

describe('resolveFeedListColumns', () => {
  const layout = { gap: 12, horizontalInset: 24 };

  it('gives a single phone column of rows no fixed cell width', () => {
    expect(resolveFeedListColumns({ ...layout, isGridView: false, width: 402 })).toEqual({
      cellWidth: 0,
      columns: 1,
    });
  });

  it('sizes rows once a tablet list fits more than one column', () => {
    // 849 wide (window minus the tab rail): 2 rows, (849 - 48 - 12) / 2 = 394.5
    expect(resolveFeedListColumns({ ...layout, isGridView: false, width: 849 })).toEqual({
      cellWidth: 394.5,
      columns: 2,
    });
  });

  it('counts columns from the list width, not the wider window', () => {
    expect(resolveFeedListColumns({ ...layout, isGridView: false, width: 849 }).columns).toBe(2);
    expect(resolveColumns(1032)).toBe(3);
  });

  it('sizes artwork tiles on a phone grid', () => {
    // 402 wide, 3 tiles: (402 - 48 - 24) / 3 = 110
    expect(resolveFeedListColumns({ ...layout, isGridView: true, width: 402 })).toEqual({
      cellWidth: 110,
      columns: 3,
    });
  });
});

describe('resolveIsTablet', () => {
  it('is false below md and true at md+', () => {
    expect(resolveIsTablet(breakpoints.md - 1)).toBe(false);
    expect(resolveIsTablet(breakpoints.md)).toBe(true);
    expect(resolveIsTablet(breakpoints.lg)).toBe(true);
  });
});
