import { useCallback, useEffect, useState } from 'react';

import type { SortPrefScope } from '@podverse/helpers';
import { buildSortPrefScopeKey } from '@podverse/helpers';

import type { ViewSelectedOption } from '../components/ViewSelector/ViewSelector';
import { useLocalSettings } from '../contexts/LocalSettings';
import {
  getParsedLocalSettings,
  getStoredSortPref,
  updateStoredSortPref,
} from '../utils/localSettings/localSettings';
import { isListViewMode, resolveListViewMode } from './listViewMode';

type ListViewModeListener = () => void;

const listViewModeListeners = new Set<ListViewModeListener>();

const subscribeListViewMode = (listener: ListViewModeListener): (() => void) => {
  listViewModeListeners.add(listener);
  return () => {
    listViewModeListeners.delete(listener);
  };
};

const notifyListViewMode = (): void => {
  for (const listener of listViewModeListeners) {
    listener();
  }
};

const readScopedViewMode = (scope: SortPrefScope): ViewSelectedOption | null => {
  const stored = getStoredSortPref(getParsedLocalSettings(), scope);
  return isListViewMode(stored?.viewMode) ? stored.viewMode : null;
};

/**
 * List vs grid for one channel list (`podcasts`, `artists`, Home medium chips, …).
 *
 * Writes only that scope's `viewMode`. Pages that omit a scope keep the global `vs`.
 */
export function useListViewMode(scope: SortPrefScope | null): {
  setViewSelected: (view: ViewSelectedOption) => void;
  viewSelected: ViewSelectedOption;
} {
  const { setViewSelected: setGlobalViewSelected, viewSelected: globalViewSelected } =
    useLocalSettings();
  const scopeKey = scope === null ? null : buildSortPrefScopeKey(scope);

  const [scopedView, setScopedView] = useState<ViewSelectedOption | null>(() => {
    return scope === null ? null : readScopedViewMode(scope);
  });

  useEffect(() => {
    if (scope === null) {
      setScopedView(null);
      return;
    }

    const read = () => {
      setScopedView(readScopedViewMode(scope));
    };

    read();
    return subscribeListViewMode(read);
  }, [scope, scopeKey]);

  const setScopedViewSelected = useCallback(
    (view: ViewSelectedOption) => {
      if (scope === null) {
        setGlobalViewSelected(view);
        return;
      }

      setScopedView(view);
      updateStoredSortPref(scope, { viewMode: view });
      notifyListViewMode();
    },
    [scope, setGlobalViewSelected]
  );

  if (scope === null) {
    return {
      setViewSelected: setGlobalViewSelected,
      viewSelected: globalViewSelected,
    };
  }

  return {
    setViewSelected: setScopedViewSelected,
    viewSelected: resolveListViewMode(scopedView ?? undefined, globalViewSelected),
  };
}
