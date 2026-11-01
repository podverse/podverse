import { describe, expect, it } from 'vitest';

import { categoryChipPressAction, CategoryEnum, expandCategoryFilterIds } from './category.js';

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

describe('categoryChipPressAction', () => {
  it('clears a chosen category while the picker is closed', () => {
    expect(categoryChipPressAction({ category: 'technology', isListOpen: false })).toBe('clear');
  });

  it('opens the picker when no category is chosen', () => {
    expect(categoryChipPressAction({ category: null, isListOpen: false })).toBe('open');
    expect(categoryChipPressAction({ category: '', isListOpen: false })).toBe('open');
  });

  it('closes the picker while it is open', () => {
    expect(categoryChipPressAction({ category: null, isListOpen: true })).toBe('close');
    expect(categoryChipPressAction({ category: 'technology', isListOpen: true })).toBe('close');
  });
});
