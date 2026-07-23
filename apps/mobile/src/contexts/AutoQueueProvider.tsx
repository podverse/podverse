import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { AutoQueueConfig, AutoQueueResourcesMap } from '../lib/autoQueue/autoQueue';
import { createDefaultAutoQueueConfig } from '../lib/autoQueue/autoQueue';
import {
  readAutoQueuePrefs,
  writeAutoQueueRandomPref,
  writeAutoQueueRepeatPref,
} from '../prefs/autoQueuePrefs';

/**
 * Auto-queue store — mirrors web `apps/web/src/contexts/AutoQueue.tsx`. Owns the resources map,
 * config, and active row. Shuffle/repeat prefs persist to device storage (`aqc.rd` / `aqc.rp`) with
 * web cookie-key parity. Kept separate from the manual queue store (`QueuesProvider`).
 */
type AutoQueueContextType = {
  autoQueueResources: AutoQueueResourcesMap;
  setAutoQueueResources: (val: AutoQueueResourcesMap) => void;
  autoQueueConfig: AutoQueueConfig;
  setAutoQueueConfig: (val: AutoQueueConfig) => void;
  autoQueueActiveRow: number;
  setAutoQueueActiveRow: (val: number) => void;
};

const AutoQueueContext = createContext<AutoQueueContextType | undefined>(undefined);

export function AutoQueueProvider({ children }: PropsWithChildren) {
  const [autoQueueResources, setAutoQueueResources] = useState<AutoQueueResourcesMap>({});
  const [autoQueueConfig, setAutoQueueConfig] = useState<AutoQueueConfig>(() =>
    createDefaultAutoQueueConfig()
  );
  const [autoQueueActiveRow, setAutoQueueActiveRow] = useState<number>(0);

  // Persist only after the initial hydrate so the default (false/false) never clobbers stored prefs.
  const hasHydratedPrefsRef = useRef(false);

  useEffect(() => {
    void (async () => {
      const prefs = await readAutoQueuePrefs();
      setAutoQueueConfig((prev) => ({ ...prev, random: prefs.random, repeat: prefs.repeat }));
      hasHydratedPrefsRef.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!hasHydratedPrefsRef.current) {
      return;
    }
    void writeAutoQueueRandomPref(autoQueueConfig.random);
  }, [autoQueueConfig.random]);

  useEffect(() => {
    if (!hasHydratedPrefsRef.current) {
      return;
    }
    void writeAutoQueueRepeatPref(autoQueueConfig.repeat);
  }, [autoQueueConfig.repeat]);

  const value = useMemo<AutoQueueContextType>(
    () => ({
      autoQueueActiveRow,
      autoQueueConfig,
      autoQueueResources,
      setAutoQueueActiveRow,
      setAutoQueueConfig,
      setAutoQueueResources,
    }),
    [autoQueueActiveRow, autoQueueConfig, autoQueueResources]
  );

  return <AutoQueueContext.Provider value={value}>{children}</AutoQueueContext.Provider>;
}

export function useAutoQueue(): AutoQueueContextType {
  const context = useContext(AutoQueueContext);
  if (context === undefined) {
    throw new Error('useAutoQueue must be used within an AutoQueueProvider');
  }
  return context;
}
