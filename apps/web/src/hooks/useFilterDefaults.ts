import { useEffect, useRef } from 'react';

import type {
  FilterDefaultsForPage,
  FilterDefaultsPage,
} from '../utils/localSettings/localSettings';
import { updateFilterDefaults } from '../utils/localSettings/localSettings';

/**
 * Hook to automatically update filter defaults in cookie when filter params change.
 * Only updates when non-page params change (type, sort, range, category, medium, liveItemType).
 */
export function useFilterDefaults<P extends FilterDefaultsPage, T extends object>(
  page: P,
  filterParams: T
) {
  const previousFilterParamsRef = useRef<T | null>(null);

  useEffect(() => {
    const prev = previousFilterParamsRef.current as Record<string, unknown> | null;
    const current = filterParams as Record<string, unknown>;

    // Skip on first render
    if (!prev) {
      previousFilterParamsRef.current = filterParams;
      return;
    }

    // Only update cookie if non-page params changed
    // Page changes should not be persisted as default filter preference
    const paramsToCheck = ['type', 'sort', 'range', 'category', 'medium', 'liveItemType'];
    const didFiltersChange = paramsToCheck.some((param) => prev[param] !== current[param]);

    if (didFiltersChange) {
      // Extract only the filter params, exclude page number
      const filterDefaults: Record<string, unknown> = {};
      paramsToCheck.forEach((param) => {
        if (current[param] !== undefined) {
          filterDefaults[param] = current[param];
        }
      });

      updateFilterDefaults(page, filterDefaults as unknown as FilterDefaultsForPage<P>);
    }

    previousFilterParamsRef.current = filterParams;
  }, [page, filterParams]);
}
