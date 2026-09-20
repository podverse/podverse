import type { QueryParamsMedium, SortPrefScope } from '@podverse/helpers';

import type { ViewSelectedOption } from '../components/ViewSelector/ViewSelector';

export const LIST_VIEW_MODE_SCOPE_PODCASTS: SortPrefScope = { kind: 'list', name: 'podcasts' };
export const LIST_VIEW_MODE_SCOPE_ARTISTS: SortPrefScope = { kind: 'list', name: 'artists' };
export const LIST_VIEW_MODE_SCOPE_ALBUMS: SortPrefScope = { kind: 'list', name: 'albums' };

export function isListViewMode(value: string | undefined): value is ViewSelectedOption {
  return value === 'grid' || value === 'rows';
}

/**
 * Scoped `viewMode` wins. Otherwise the cookie's global `vs`. Otherwise rows.
 */
export function resolveListViewMode(
  storedViewMode: string | undefined,
  globalViewSelected: ViewSelectedOption | undefined
): ViewSelectedOption {
  if (isListViewMode(storedViewMode)) {
    return storedViewMode;
  }
  if (isListViewMode(globalViewSelected)) {
    return globalViewSelected;
  }
  return 'rows';
}

export function homeListViewModeScope(medium: QueryParamsMedium): SortPrefScope {
  if (medium === 'av') {
    return { kind: 'list', name: 'home-podcasts' };
  }
  if (medium === 'publisher-music') {
    return { kind: 'list', name: 'home-artists' };
  }
  if (medium === 'music') {
    return { kind: 'list', name: 'home-albums' };
  }
  return { kind: 'list', name: 'home-all' };
}
