import { describe, expect, it } from 'vitest';

import {
  getFiniteNumberProperty,
  getNonEmptyTrimmedStringProperty,
  isObjectLike,
  isPlainObject,
  toNonEmptyTrimmedString,
} from './guards.js';

describe('guards', () => {
  it('distinguishes object-like and plain-object values', () => {
    expect(isObjectLike({ value: true })).toBe(true);
    expect(isObjectLike([])).toBe(true);
    expect(isObjectLike(null)).toBe(false);
    expect(isPlainObject({ value: true })).toBe(true);
    expect(isPlainObject([])).toBe(false);
  });

  it('normalizes non-empty strings and string properties', () => {
    expect(toNonEmptyTrimmedString(' value ')).toBe('value');
    expect(toNonEmptyTrimmedString('   ')).toBeNull();
    expect(getNonEmptyTrimmedStringProperty({ message: ' Problem ' }, 'message')).toBe('Problem');
    expect(getNonEmptyTrimmedStringProperty(null, 'message')).toBeNull();
  });

  it('reads finite numeric properties', () => {
    expect(getFiniteNumberProperty({ count: 3 }, 'count')).toBe(3);
    expect(getFiniteNumberProperty({ count: Number.NaN }, 'count')).toBeNull();
    expect(getFiniteNumberProperty({ count: Number.POSITIVE_INFINITY }, 'count')).toBeNull();
    expect(getFiniteNumberProperty({ count: '3' }, 'count')).toBeNull();
  });
});
