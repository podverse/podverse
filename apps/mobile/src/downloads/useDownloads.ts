import { useCallback, useEffect, useRef, useState } from 'react';

import type { DTOItem } from '@podverse/helpers/dto';

import { downloadsRepository } from '../data/repositories';
import {
  isDownloadQuotaUnlimited,
  readDownloadAutoDeleteOnDeviceLowEnabled,
  readDownloadAutoDeleteOnLimitEnabled,
  readDownloadQuotaBytes,
  writeDownloadAutoDeleteOnLimitEnabled,
} from '../prefs/downloadPrefs';
import { isItemDownloadable } from './downloadEligibility';
import { downloadManager } from './downloadManager';
import { sumCompletedBytes } from './downloadQuota';
import type { DownloadRecord, DownloadStatus } from './downloadTypes';
import { countInProgressDownloads } from './inProgressDownloadCount';

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
  pauseAllActive: boolean;
} => {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [pauseAllActive, setPauseAllActive] = useState(downloadManager.isPauseAllActive());

  const load = useCallback(async () => {
    try {
      const rows = await downloadsRepository.list();
      setDownloads(rows);
      setPauseAllActive(downloadManager.isPauseAllActive());
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

  return { downloads, errorKey, isLoading, pauseAllActive, reload };
};

/** Live count of queued, downloading, and paused jobs. */
export const useInProgressDownloadCount = (): number => {
  const { downloads } = useDownloadsList();
  return countInProgressDownloads(downloads);
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

export type DownloadAction = {
  /** False for livestream, HLS-only, and enclosure-less items: nothing to offer. */
  isDownloadable: boolean;
  /** `null` before anything has been asked for this item. */
  status: DownloadStatus | null;
  /** Whole percent of the transfer, or `null` while the total size is unknown. */
  percentComplete: number | null;
  /** Catalog key for a refused enqueue. */
  noticeKey: string | null;
  start: () => void;
  remove: () => void;
};

/**
 * One item's download state and the two things a user can do about it, so every download affordance
 * — the labeled control on episode detail and the icon on a list row — answers to the same state
 * machine and the same eligibility rule.
 */
export const useDownloadAction = (item: DTOItem): DownloadAction => {
  const record = useItemDownload(item.id_text);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);

  const start = useCallback(() => {
    setNoticeKey(null);
    void (async () => {
      const result = await downloadManager.enqueue(item);
      if (!result.ok) {
        setNoticeKey('features.download.not_downloadable');
      }
    })();
  }, [item]);

  const remove = useCallback(() => {
    void downloadManager.remove(item.id_text);
  }, [item.id_text]);

  const percentComplete =
    record !== null && record.byteSize !== null && record.byteSize > 0
      ? Math.min(100, Math.round((record.bytesDownloaded / record.byteSize) * 100))
      : null;

  return {
    isDownloadable: isItemDownloadable(item).ok,
    noticeKey,
    percentComplete,
    remove,
    start,
    status: record?.status ?? null,
  };
};

export type DownloadStorage = {
  /** Total on-disk bytes of completed downloads. */
  usedBytes: number;
  /** Storage cap; `0` means unlimited. */
  quotaBytes: number;
  autoDeleteOnLimitEnabled: boolean;
  autoDeleteOnDeviceLowEnabled: boolean;
  /** @deprecated Prefer autoDeleteOnLimitEnabled. */
  autoDeleteEnabled: boolean;
  setAutoDeleteEnabled: (enabled: boolean) => Promise<void>;
  /** Number of downloads auto-removed in the most recent over-quota cleanup (0 when none pending). */
  autoRemovedCount: number;
  clearAutoRemovedNotice: () => void;
  reload: () => Promise<void>;
};

/**
 * Manage-storage state for Settings → Downloads: usage total, the user quota, auto-free toggles,
 * and a one-shot "removed N to free space" notice.
 */
export const useDownloadStorage = (): DownloadStorage => {
  const [usedBytes, setUsedBytes] = useState<number>(0);
  const [quotaBytes, setQuotaBytes] = useState<number>(0);
  const [autoDeleteOnLimitEnabled, setAutoDeleteOnLimitEnabled] = useState(false);
  const [autoDeleteOnDeviceLowEnabled, setAutoDeleteOnDeviceLowEnabled] = useState(false);
  const [autoRemovedCount, setAutoRemovedCount] = useState<number>(0);
  const lastNoticeAtRef = useRef<number>(0);

  const load = useCallback(async () => {
    const [completed, onLimit, onDeviceLow, quota] = await Promise.all([
      downloadsRepository.listByStatus('complete'),
      readDownloadAutoDeleteOnLimitEnabled(),
      readDownloadAutoDeleteOnDeviceLowEnabled(),
      readDownloadQuotaBytes(),
    ]);
    setUsedBytes(sumCompletedBytes(completed));
    setAutoDeleteOnLimitEnabled(onLimit);
    setAutoDeleteOnDeviceLowEnabled(onDeviceLow);
    setQuotaBytes(quota);
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
    await writeDownloadAutoDeleteOnLimitEnabled(enabled);
    setAutoDeleteOnLimitEnabled(enabled);
  }, []);

  const clearAutoRemovedNotice = useCallback(() => {
    setAutoRemovedCount(0);
  }, []);

  return {
    autoDeleteEnabled: autoDeleteOnLimitEnabled,
    autoDeleteOnDeviceLowEnabled,
    autoDeleteOnLimitEnabled,
    autoRemovedCount,
    clearAutoRemovedNotice,
    quotaBytes: isDownloadQuotaUnlimited(quotaBytes) ? 0 : quotaBytes,
    reload: load,
    setAutoDeleteEnabled,
    usedBytes,
  };
};
