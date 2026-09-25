import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrate = vi.fn(() => Promise.resolve());
const enqueue = vi.fn();

vi.mock('./downloadManager', () => {
  return {
    downloadManager: {
      enqueue: (...args: unknown[]) => enqueue(...args),
      getAutoDeleteNotice: () => null,
      hydrate: () => hydrate(),
      isPauseAllActive: () => false,
      remove: vi.fn(),
    },
  };
});

vi.mock('../prefs/downloadPrefs', () => {
  return {
    isDownloadQuotaUnlimited: () => true,
    readDownloadAutoDeleteOnDeviceLowEnabled: async () => false,
    readDownloadAutoDeleteOnLimitEnabled: async () => false,
    readDownloadQuotaBytes: async () => 0,
    writeDownloadAutoDeleteOnLimitEnabled: async () => undefined,
  };
});

import { downloadStore } from './downloadStore';
import {
  bindItemDownload,
  isDownloadActionDownloadable,
  startDownloadAction,
} from './useDownloads';

describe('bindItemDownload', () => {
  beforeEach(() => {
    hydrate.mockClear();
    enqueue.mockClear();
  });

  it('does not hydrate or subscribe when the item id is empty', () => {
    const setRecord = vi.fn();
    const subscribe = vi.spyOn(downloadStore, 'subscribe');

    const cleanup = bindItemDownload('', false, setRecord);

    expect(setRecord).toHaveBeenCalledWith(null);
    expect(hydrate).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    expect(cleanup).toBeUndefined();
    subscribe.mockRestore();
  });

  it('hydrates, subscribes, and unsubscribes for a non-empty item id', () => {
    const setRecord = vi.fn();
    const unsubscribe = vi.fn();
    const subscribe = vi.spyOn(downloadStore, 'subscribe').mockReturnValue(unsubscribe);

    const cleanup = bindItemDownload('abc', false, setRecord);

    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(cleanup).toEqual(expect.any(Function));
    cleanup?.();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    subscribe.mockRestore();
  });
});

describe('useDownloadAction helpers', () => {
  beforeEach(() => {
    enqueue.mockClear();
  });

  it('reports not downloadable when there is no item', () => {
    expect(isDownloadActionDownloadable(undefined)).toBe(false);
  });

  it('does not enqueue when start is called with no item', () => {
    const setNoticeKey = vi.fn();
    startDownloadAction(undefined, undefined, setNoticeKey);
    expect(enqueue).not.toHaveBeenCalled();
    expect(setNoticeKey).not.toHaveBeenCalled();
  });
});
