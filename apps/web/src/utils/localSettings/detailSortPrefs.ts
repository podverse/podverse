import type { SortPrefValue } from '@podverse/helpers';
import { pickSortPrefToken } from '@podverse/helpers';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';

/**
 * Resolving a detail page's controls: an explicit URL value, else what this instance remembers,
 * else the page's documented default.
 *
 * The URL wins because arriving with `?sort=` is a deliberate act — a shared link or a bookmark —
 * and answering it with a stored preference would make the link behave differently for the person
 * who was sent it than for the person who sent it.
 */

export const resolveStoredToken = <T extends string>(
  urlValue: T | null | undefined,
  storedValue: string | undefined,
  allowed: readonly T[],
  fallback: T
): T => {
  if (urlValue !== null && urlValue !== undefined) {
    return urlValue;
  }
  return pickSortPrefToken(storedValue, allowed, fallback);
};

/**
 * Range gets its own resolver because "no range" is a real selection rather than an absent one, so
 * it cannot share the fallback shape the other controls use.
 */
export const resolveStoredRange = (
  urlValue: QueryParamsStatsRange | null | undefined,
  storedValue: string | undefined
): QueryParamsStatsRange | null => {
  if (urlValue !== null && urlValue !== undefined) {
    return urlValue;
  }
  if (storedValue === undefined) {
    return null;
  }
  return QUERY_PARAMS_STATS_RANGE_VALUES.find((value) => value === storedValue) ?? null;
};

/** True when the URL named any control, which is what makes the resolved values worth writing back. */
export const hasExplicitControlParams = (
  values: readonly (string | null | undefined)[]
): boolean => {
  return values.some((value) => value !== null && value !== undefined);
};

/**
 * The patch a detail page stores.
 *
 * A null range is dropped rather than stored, so returning to "no range" stops being remembered
 * instead of being remembered as a value — which is also how the field frees its bytes in a cookie
 * that is charged for every one.
 */
export const buildDetailSortPrefPatch = ({
  range,
  sort,
  tab,
}: {
  range?: QueryParamsStatsRange | null;
  sort?: string;
  tab?: string;
}): SortPrefValue => {
  return {
    range: range === null ? undefined : range,
    sort,
    tab,
  };
};
