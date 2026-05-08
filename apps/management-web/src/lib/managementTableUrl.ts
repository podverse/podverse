import type { ReadonlyURLSearchParams } from 'next/navigation';

/** Stable query object for {@link useTableFilterState} `currentQueryParams`. */
export function managementSearchParamsObject(
  searchParams: ReadonlyURLSearchParams
): Record<string, string> {
  return Object.fromEntries(searchParams.entries());
}
