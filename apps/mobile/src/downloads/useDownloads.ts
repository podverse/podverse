import { useCallback, useEffect, useRef, useState } from 'react';

import { downloadsRepository } from '../data/repositories';
import {
  readDownloadAutoDeleteEnabled,
  writeDownloadAutoDeleteEnabled,
} from '../prefs/downloadPrefs';
import { downloadManager } from './downloadManager';
import { DEFAULT_DOWNLOAD_QUOTA_BYTES, sumCompletedBytes } from './downloadQuota';
import type { DownloadRecord } from './downloadTypes';

/**
 * Subscribe to the full downloads list (source of truth: `downloadsRepository`). Re-reads on every
 * `downloadManager` change so progress/status updates render live. Used by the Library Downloads
 * screen.
 */
export const useDownloadsList = (): {
  downloads: DownloadRecord[];
  isLoading: boolean;
  errorKey: string | null;
  reload: () => void;
} => {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await downloadsRepository.list();
      setDownloads(rows);
      setErrorKey(null);
    } catch {
      setErrorKey('errors.generic');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    void load();
    const unsubscribe = downloadManager.subscribe(() => {
      void load();
    });
    return unsubscribe;
  }, [load]);

  return { downloads, isLoading, errorKey, reload };
};

/**
 * Subscribe to a single item's download record (or `null` when not downloaded). Drives the episode
 * detail Download control.
 */
export const useItemDownload = (itemIdText: string): DownloadRecord | null => {
  const [record, setRecord] = useState<DownloadRecord | null>(null);

  useEffect(() => {
    let isActive = true;
    const load = async (): Promise<void> => {
      const next = await downloadsRepository.getByItemIdText(itemIdText);
      if (isActive) {
        setRecord(next);
      }
    };

    void load();
    const unsubscribe = downloadManager.subscribe(() => {
      void load();
    });
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [itemIdText]);

  return record;
};

export type DownloadStorage = {
  /** Total on-disk bytes of completed downloads. */
  usedBytes: number;
  /** Storage cap (fixed default for the v1 sketch). */
  quotaBytes: number;
  autoDeleteEnabled: boolean;
  setAutoDeleteEnabled: (enabled: boolean) => Promise<void>;
  /** Number of downloads auto-removed in the most recent over-quota cleanup (0 when none pending). */
  autoRemovedCount: number;
  clearAutoRemovedNotice: () => void;
};

/**
 * Manage-storage state for the Downloads screen (13.7–13.8): usage total, the fixed quota, the
 * auto-delete toggle, and a one-shot "removed N to free space" notice. Re-reads on every
 * `downloadManager` change so usage and the banner stay live.
 */
export const useDownloadStorage = (): DownloadStorage => {
  const [usedBytes, setUsedBytes] = useState<number>(0);
  const [autoDeleteEnabled, setAutoDeleteEnabledState] = useState<boolean>(false);
  const [autoRemovedCount, setAutoRemovedCount] = useState<number>(0);
  const lastNoticeAtRef = useRef<number>(0);

  const load = useCallback(async () => {
    const [completed, enabled] = await Promise.all([
      downloadsRepository.listByStatus('complete'),
      readDownloadAutoDeleteEnabled(),
    ]);
    setUsedBytes(sumCompletedBytes(completed));
    setAutoDeleteEnabledState(enabled);
    const notice = downloadManager.getAutoDeleteNotice();
    if (notice !== null && notice.at > lastNoticeAtRef.current) {
      lastNoticeAtRef.current = notice.at;
      setAutoRemovedCount(notice.count);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = downloadManager.subscribe(() => {
      void load();
    });
    return unsubscribe;
  }, [load]);

  const setAutoDeleteEnabled = useCallback(async (enabled: boolean) => {
    await writeDownloadAutoDeleteEnabled(enabled);
    setAutoDeleteEnabledState(enabled);
  }, []);

  const clearAutoRemovedNotice = useCallback(() => {
    setAutoRemovedCount(0);
  }, []);

  return {
    autoDeleteEnabled,
    autoRemovedCount,
    clearAutoRemovedNotice,
    quotaBytes: DEFAULT_DOWNLOAD_QUOTA_BYTES,
    setAutoDeleteEnabled,
    usedBytes,
  };
};
