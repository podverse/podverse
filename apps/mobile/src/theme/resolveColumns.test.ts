import { describe, expect, it } from 'vitest';

import { breakpoints } from '@podverse/design-tokens';

import { resolveColumns, resolveGridColumns, resolveIsTablet } from './resolveColumns';

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
  it('fits several artwork tiles per line on a phone, where a row list fits one', () => {
    expect(resolveGridColumns(375)).toBe(3);
    expect(resolveGridColumns(breakpoints.md - 1)).toBe(3);
    expect(resolveColumns(375)).toBe(1);
  });

  it('widens with the same breakpoints the row count uses', () => {
    expect(resolveGridColumns(breakpoints.md)).toBe(4);
    expect(resolveGridColumns(breakpoints.lg - 1)).toBe(4);
    expect(resolveGridColumns(breakpoints.lg)).toBe(5);
    expect(resolveGridColumns(1200)).toBe(5);
  });

  it('honors an explicit breakpoints override', () => {
    expect(resolveGridColumns(500, { sm: 0, md: 400, lg: 800 })).toBe(4);
    expect(resolveGridColumns(800, { sm: 0, md: 400, lg: 800 })).toBe(5);
  });
});

describe('resolveIsTablet', () => {
  it('is false below md and true at md+', () => {
    expect(resolveIsTablet(breakpoints.md - 1)).toBe(false);
    expect(resolveIsTablet(breakpoints.md)).toBe(true);
    expect(resolveIsTablet(breakpoints.lg)).toBe(true);
  });
});
