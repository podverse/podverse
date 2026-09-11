import type { DTOCategory } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import type { MobileAuthRequestContext } from '../../data/repositories';

export type BrowseCategoryOption = {
  mappingKey: string;
  /** Nested children are prefixed so parent/child stay distinguishable in a flat list. */
  depth: number;
};

export const fetchBrowseCategories = async (
  authDeps: MobileAuthRequestContext
): Promise<BrowseCategoryOption[]> => {
  const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
    api.reqCategoryGetAll()
  );
  if (!Array.isArray(response.data)) {
    return [];
  }
  return flattenBrowseCategories(response.data);
};

export const flattenBrowseCategories = (
  categories: readonly DTOCategory[],
  depth = 0
): BrowseCategoryOption[] => {
  const rows: BrowseCategoryOption[] = [];

  for (const category of categories) {
    if (category.mapping_key !== null && category.mapping_key.length > 0) {
      rows.push({ depth, mappingKey: category.mapping_key });
    }
    if (category.children !== undefined && category.children.length > 0) {
      rows.push(...flattenBrowseCategories(category.children, depth + 1));
    }
  }

  return rows;
};

export const ALL_BROWSE_CATEGORIES = 'all' as const;
