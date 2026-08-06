import { breakpoints } from '@podverse/design-tokens';
import { describe, expect, it } from 'vitest';

import { resolveColumns, resolveIsTablet } from './resolveColumns';

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

describe('resolveIsTablet', () => {
  it('is false below md and true at md+', () => {
    expect(resolveIsTablet(breakpoints.md - 1)).toBe(false);
    expect(resolveIsTablet(breakpoints.md)).toBe(true);
    expect(resolveIsTablet(breakpoints.lg)).toBe(true);
  });
});
