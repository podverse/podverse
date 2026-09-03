import { useEffect, useRef } from 'react';

import type { FilterDefaults, FilterDefaultsPage } from '../utils/localSettings/localSettings';
import {
  getFilterDefaultsForPage,
  getParsedLocalSettings,
  updateFilterDefaults,
} from '../utils/localSettings/localSettings';

/**
 * The controls a global list remembers. Page number is absent on purpose: where someone had got to
 * in a list is not a preference, and restoring it would open the list somewhere they did not choose.
 */
const PERSISTED_PARAMS = ['type', 'sort', 'range', 'category', 'medium', 'liveItemType'] as const;

const toRecord = (value: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value));

const differsFrom = (
  picked: Record<string, unknown>,
  other: Record<string, unknown> | undefined
): boolean => {
  if (other === undefined) {
    return true;
  }
  return PERSISTED_PARAMS.some((param) => picked[param] !== other[param]);
};

/**
 * Mirror a global list's filter and sort selections into the `local-settings` cookie.
 *
 * The first run compares against what is stored rather than skipping, which is how an explicit
 * `?sort=` in the URL wins and is remembered for the next clean-URL visit. When the URL carried
 * nothing the resolved values came from the cookie to begin with, so the comparison finds no
 * difference and nothing is written.
 */
export function useFilterDefaults<P extends FilterDefaultsPage>(
  page: P,
  filterParams: FilterDefaults[P] & { page?: number }
) {
  const hasComparedStoredRef = useRef(false);
  const previousPickedRef = useRef<Record<string, unknown> | undefined>(undefined);

  useEffect(() => {
    if (filterParams === undefined) {
      return;
    }

    // Copy-then-delete rather than a rest destructure: the compiler will not reduce
    // `Omit<FilterDefaults[P] & { page?: number }, 'page'>` back to `FilterDefaults[P]` while P is
    // still a type parameter, while an intersection stays assignable to the shape it extends.
    const persisted = { ...filterParams };
    delete persisted.page;

    const picked = toRecord(persisted);
    const comparison = hasComparedStoredRef.current
      ? previousPickedRef.current
      : (() => {
          const stored = getFilterDefaultsForPage(getParsedLocalSettings(), page);
          return stored === undefined ? undefined : toRecord(stored);
        })();

    hasComparedStoredRef.current = true;
    previousPickedRef.current = picked;

    if (differsFrom(picked, comparison)) {
      updateFilterDefaults(page, persisted);
    }
  }, [page, filterParams]);
}
