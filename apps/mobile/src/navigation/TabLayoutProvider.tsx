import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { ContentTabId } from '../prefs/tabLayout';
import {
  DEFAULT_VISIBLE_TABS,
  overflowTabs,
  parseVisibleTabs,
  readVisibleTabs,
  writeVisibleTabs,
} from '../prefs/tabLayout';

type TabLayoutContextValue = {
  isReady: boolean;
  overflowTabIds: ContentTabId[];
  setVisibleTabs: (visible: readonly ContentTabId[]) => Promise<void>;
  visibleTabIds: ContentTabId[];
};

const TabLayoutContext = createContext<TabLayoutContextValue | undefined>(undefined);

export function TabLayoutProvider({ children }: PropsWithChildren) {
  const [visibleTabIds, setVisibleTabIdsState] = useState<ContentTabId[]>([
    ...DEFAULT_VISIBLE_TABS,
  ]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void readVisibleTabs().then((stored) => {
      if (!isMounted) {
        return;
      }
      setVisibleTabIdsState(stored);
      setIsReady(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const setVisibleTabs = useCallback(async (visible: readonly ContentTabId[]) => {
    const next = parseVisibleTabs(JSON.stringify(visible));
    setVisibleTabIdsState(next);
    await writeVisibleTabs(next);
  }, []);

  const value = useMemo<TabLayoutContextValue>(
    () => ({
      isReady,
      overflowTabIds: overflowTabs(visibleTabIds),
      setVisibleTabs,
      visibleTabIds,
    }),
    [isReady, setVisibleTabs, visibleTabIds]
  );

  return <TabLayoutContext.Provider value={value}>{children}</TabLayoutContext.Provider>;
}

export function useTabLayout(): TabLayoutContextValue {
  const value = useContext(TabLayoutContext);
  if (value === undefined) {
    throw new Error('useTabLayout must be used within TabLayoutProvider');
  }
  return value;
}
