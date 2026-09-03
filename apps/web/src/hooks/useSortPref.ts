import { useEffect, useRef } from 'react';

import type { SortPrefScope, SortPrefValue } from '@podverse/helpers';
import { buildSortPrefScopeKey } from '@podverse/helpers';

import { touchStoredSortPref, updateStoredSortPref } from '../utils/localSettings/localSettings';

type UseSortPrefOptions = {
  /**
   * Whether the URL carried at least one of the controls this scope stores.
   *
   * An explicit parameter is a deliberate act — a shared link, a bookmark — so it wins over what is
   * stored and is written through, which is what makes the next visit to the clean URL keep what
   * the user just saw.
   */
  hasExplicitUrlParams: boolean;
  /** `null` while the instance is unknown, which suppresses every write until it is. */
  scope: SortPrefScope | null;
  values: SortPrefValue;
};

/**
 * Persist a detail screen's control selections against the instance they belong to.
 *
 * The page keeps owning the state; this only mirrors it into the cookie, so the source of truth
 * stays wherever the controls already are.
 *
 * Arriving on a clean URL refreshes recency rather than writing: a screen the user has never
 * customised must not take a slot in the eviction window away from one they have.
 */
export function useSortPref({ hasExplicitUrlParams, scope, values }: UseSortPrefOptions) {
  const latestRef = useRef({ scope, values });
  latestRef.current = { scope, values };

  const previousScopeKeyRef = useRef<string | null>(null);

  const scopeKey = scope === null ? null : buildSortPrefScopeKey(scope);
  const valuesKey = JSON.stringify(values);

  useEffect(() => {
    const { scope: currentScope, values: currentValues } = latestRef.current;
    if (currentScope === null || scopeKey === null) {
      return;
    }

    const isFirstVisit = previousScopeKeyRef.current !== scopeKey;
    previousScopeKeyRef.current = scopeKey;

    if (isFirstVisit && !hasExplicitUrlParams) {
      touchStoredSortPref(currentScope);
      return;
    }

    updateStoredSortPref(currentScope, currentValues);
  }, [hasExplicitUrlParams, scopeKey, valuesKey]);
}
