import type { DTOCategory } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import type { MobileAuthRequestContext } from '../../data/repositories';

export type BrowseCategoryOption = {
  mappingKey: string;
  /** Nested children indent under their parent. */
  depth: number;
  /**
   * Top-level ancestor this row belongs to. A parent uses its own key; a child uses the
   * top-level key so expand/collapse can hide a whole branch at once.
   */
  rootMappingKey: string;
  /** Only top-level rows with nested children offer an expand control. */
  hasChildren: boolean;
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
  depth = 0,
  rootMappingKey: string | null = null
): BrowseCategoryOption[] => {
  const rows: BrowseCategoryOption[] = [];

  for (const category of categories) {
    const mappingKey = category.mapping_key;
    const children = category.children;
    const hasNested = children !== undefined && children.length > 0;

    if (mappingKey !== null && mappingKey.length > 0) {
      const root = rootMappingKey ?? mappingKey;
      rows.push({
        depth,
        hasChildren: depth === 0 && hasNested,
        mappingKey,
        rootMappingKey: root,
      });
      if (hasNested) {
        rows.push(...flattenBrowseCategories(children, depth + 1, root));
      }
      continue;
    }

    if (hasNested) {
      rows.push(...flattenBrowseCategories(children, depth, rootMappingKey));
    }
  }

  return rows;
};

export const visibleBrowseCategories = (
  options: readonly BrowseCategoryOption[],
  expandedRoots: ReadonlySet<string>
): BrowseCategoryOption[] => {
  return options.filter(
    (option) => option.depth === 0 || expandedRoots.has(option.rootMappingKey)
  );
};

export const ALL_BROWSE_CATEGORIES = 'all' as const;
