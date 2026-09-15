import { describe, expect, it } from 'vitest';

import { CategoryEnum, expandCategoryFilterIds } from './category.js';

describe('expandCategoryFilterIds', () => {
  it('includes the parent and every Arts child', () => {
    expect(expandCategoryFilterIds(CategoryEnum.Arts)).toEqual([
      CategoryEnum.Arts,
      CategoryEnum.Books,
      CategoryEnum.Design,
      CategoryEnum.FashionAndBeauty,
      CategoryEnum.Food,
      CategoryEnum.PerformingArts,
      CategoryEnum.VisualArts,
    ]);
  });

  it('returns only the selected leaf', () => {
    expect(expandCategoryFilterIds(CategoryEnum.Books)).toEqual([CategoryEnum.Books]);
  });

  it('returns only a parent that has no children', () => {
    expect(expandCategoryFilterIds(CategoryEnum.Government)).toEqual([CategoryEnum.Government]);
  });

  it('returns an unknown id as a single-value filter', () => {
    expect(expandCategoryFilterIds(999)).toEqual([999]);
  });
});
