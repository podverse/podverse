import { useCallback, useEffect, useRef, useState } from 'react';

import type { DTOItem } from '@podverse/helpers/dto';
import type { EnclosureSelectedParams } from '@podverse/helpers/item/itemEnclosure';

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
import { downloadStore } from './downloadStore';
import type { DownloadRecord, DownloadStatus } from './downloadTypes';
import { countInProgressDownloads } from './inProgressDownloadCount';

/**
 * Reads for the downloads UI. All of them come out of `downloadStore` in memory, so nothing here
 * touches SQLite while a transfer runs.
 *
 * **Progress is opt-in.** A transfer reports bytes many times a second; a screen that only needs
 * statuses (a badge, a count, a row's busy spinner) passes `includeProgress: false` and never
 * re-renders for a chunk. Ask for progress only where the user went to look at it — the episode
 * detail control and the Downloads screen.
 */

/**
 * Subscribe to the full downloads list. Set and status changes always apply; byte progress only
 * when `includeProgress` is true.
 */
export const useDownloadsList = (
  includeProgress = false
): {
  downloads: readonly DownloadRecord[];
  isLoading: boolean;
  errorKey: string | null;
  reload: () => void;
  pauseAllActive: boolean;
} => {
  const [downloads, setDownloads] = useState<readonly DownloadRecord[]>(() =>
    downloadStore.getAll()
  );
  const [isLoading, setIsLoading] = useState<boolean>(!downloadStore.isHydrated());
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [pauseAllActive, setPauseAllActive] = useState(downloadManager.isPauseAllActive());

  const sync = useCallback(() => {
    // `getAll` returns the same array while nothing has changed, so an unrelated notification
    // does not re-render this list.
    setDownloads(downloadStore.getAll());
    setPauseAllActive(downloadManager.isPauseAllActive());
  }, []);

  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setIsLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let isActive = true;

    const hydration = reloadToken === 0 ? downloadManager.hydrate() : downloadManager.reload();
    hydration
      .then(() => {
        if (isActive) {
          setErrorKey(null);
          sync();
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorKey('errors.generic');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    const unsubscribe = downloadStore.subscribe(sync);
    const unsubscribeProgress = includeProgress ? downloadStore.subscribeToProgress(sync) : null;

    return () => {
      isActive = false;
      unsubscribe();
      unsubscribeProgress?.();
    };
  }, [includeProgress, reloadToken, sync]);

  return { downloads, errorKey, isLoading, pauseAllActive, reload };
};

/** Live count of queued, downloading, and paused jobs. */
export const useInProgressDownloadCount = (): number => {
  const { downloads } = useDownloadsList();
  return countInProgressDownloads(downloads);
};

/**
 * Subscribe to a single item's download record (or `null` when not downloaded).
 *
 * Because records are immutable, the state setter receives the same reference when this item did
 * not change — so a row on a long list ignores every other row's transitions.
 */
export const useItemDownload = (
  itemIdText: string,
  includeProgress = false
): DownloadRecord | null => {
  const [record, setRecord] = useState<DownloadRecord | null>(() => downloadStore.get(itemIdText));

  useEffect(() => {
    const sync = (): void => {
      setRecord(downloadStore.get(itemIdText));
    };

    void downloadManager.hydrate().then(sync).catch(sync);
    sync();

    const unsubscribe = downloadStore.subscribe(sync);
    const unsubscribeProgress = includeProgress ? downloadStore.subscribeToProgress(sync) : null;

    return () => {
      unsubscribe();
      unsubscribeProgress?.();
    };
  }, [includeProgress, itemIdText]);

  return record;
};

export type DownloadAction = {
  /** False for livestream, HLS-only, and enclosure-less items: nothing to offer. */
  isDownloadable: boolean;
  /** `null` before anything has been asked for this item. */
  status: DownloadStatus | null;
  /** Whole percent of the transfer; `null` while the size is unknown or progress was not requested. */
  percentComplete: number | null;
  /** Catalog key for a refused enqueue. */
  noticeKey: string | null;
  /** Stored machine reason when `status` is `failed`; otherwise `null`. */
  errorReason: string | null;
  start: () => void;
  remove: () => void;
};

/**
 * One item's download state and the two things a user can do about it, so every download affordance
 * — the list-row icon and the More menu on podcast and episode screens — answers to the same state
 * machine and the same eligibility rule.
 *
 * Pass `includeProgress` only for a single-item surface. A list row shows a busy spinner and does
 * not need a percentage, and subscribing every visible row to byte progress is what makes a list
 * stutter mid-download.
 */
export const useDownloadAction = (
  item: DTOItem | undefined,
  includeProgress = false,
  options?: { explicitSelectedParams?: EnclosureSelectedParams | null }
): DownloadAction => {
  const record = useItemDownload(item?.id_text ?? '', includeProgress);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const explicitSelectedParams = options?.explicitSelectedParams;

  const start = useCallback(() => {
    if (item === undefined) {
      return;
    }
    setNoticeKey(null);
    void (async () => {
      try {
        const result = await downloadManager.enqueue(item, explicitSelectedParams);
        if (!result.ok) {
          setNoticeKey(
            result.reason === 'offline_mode'
              ? 'settings.offline_mode.unavailable'
              : 'features.download.not_downloadable'
          );
        }
      } catch {
        setNoticeKey('errors.generic');
      }
    })();
  }, [explicitSelectedParams, item]);

  const remove = useCallback(() => {
    if (item === undefined) {
      return;
    }
    setNoticeKey(null);
    void (async () => {
      try {
        await downloadManager.remove(item.id_text);
      } catch {
        setNoticeKey('errors.generic');
      }
    })();
  }, [item]);

  const percentComplete =
    includeProgress && record !== null && record.byteSize !== null && record.byteSize > 0
      ? Math.min(100, Math.round((record.bytesDownloaded / record.byteSize) * 100))
      : null;

  return {
    isDownloadable: item !== undefined && isItemDownloadable(item, explicitSelectedParams).ok,
    errorReason: record?.errorReason ?? null,
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
 *
 * Usage counts only completed downloads, so this reads the status channel and stays still while a
 * transfer runs.
 */
export const useDownloadStorage = (): DownloadStorage => {
  const [usedBytes, setUsedBytes] = useState<number>(0);
  const [quotaBytes, setQuotaBytes] = useState<number>(0);
  const [autoDeleteOnLimitEnabled, setAutoDeleteOnLimitEnabled] = useState(false);
  const [autoDeleteOnDeviceLowEnabled, setAutoDeleteOnDeviceLowEnabled] = useState(false);
  const [autoRemovedCount, setAutoRemovedCount] = useState<number>(0);
  const lastNoticeAtRef = useRef<number>(0);

  const load = useCallback(async () => {
    const [onLimit, onDeviceLow, quota] = await Promise.all([
      readDownloadAutoDeleteOnLimitEnabled(),
      readDownloadAutoDeleteOnDeviceLowEnabled(),
      readDownloadQuotaBytes(),
    ]);
    setUsedBytes(sumCompletedBytes(downloadStore.getAll()));
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
    void downloadManager.hydrate().finally(() => {
      void load();
    });
    const unsubscribe = downloadStore.subscribe(() => {
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
