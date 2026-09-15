import { In } from 'typeorm';
import { describe, expect, it } from 'vitest';

import { CategoryEnum, expandCategoryFilterIds } from '@podverse/helpers';

import { getChannelCategoryWhere } from './categoryFilterWhere.js';

describe('getChannelCategoryWhere', () => {
  it('omits the relation when no category is selected', () => {
    expect(getChannelCategoryWhere(null)).toEqual({});
  });

  it('filters a parent with the parent and its children', () => {
    expect(getChannelCategoryWhere(CategoryEnum.Arts)).toEqual({
      channel_categories: {
        category_id: In(expandCategoryFilterIds(CategoryEnum.Arts)),
      },
    });
  });

  it('filters a leaf with only that category', () => {
    expect(getChannelCategoryWhere(CategoryEnum.Books)).toEqual({
      channel_categories: {
        category_id: In([CategoryEnum.Books]),
      },
    });
  });
});
