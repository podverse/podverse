import type { FindOperator } from 'typeorm';
import { In } from 'typeorm';

import { expandCategoryFilterIds } from '@podverse/helpers';

export function getChannelCategoryWhere(category_id: number | null): {
  channel_categories?: { category_id: FindOperator<number> };
} {
  if (!category_id) {
    return {};
  }
  return {
    channel_categories: {
      category_id: In(expandCategoryFilterIds(category_id)),
    },
  };
}
