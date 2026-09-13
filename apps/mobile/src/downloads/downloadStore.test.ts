import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDownloadStore,
  DOWNLOAD_PROGRESS_NOTIFY_MS,
  DOWNLOAD_STATUS_NOTIFY_MS,
} from './downloadStore';
import type { DownloadRecord, DownloadStatus } from './downloadTypes';

const record = (
  itemIdText: string,
  status: DownloadStatus = 'queued',
  updatedAt = 1_000
): DownloadRecord => ({
  artworkUrl: null,
  byteSize: null,
  bytesDownloaded: 0,
  channelIdText: null,
  channelTitle: null,
  createdAt: updatedAt,
  dismissedFromList: false,
  enclosureMime: 'audio/mpeg',
  enclosureUri: `https://example.com/${itemIdText}.mp3`,
  enclosureUrlHash: itemIdText,
  errorReason: null,
  fileExtension: 'mp3',
  filePath: null,
  itemIdText,
  mediaType: 'audio',
  status,
  title: itemIdText,
  updatedAt,
});

describe('downloadStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('paints a status change immediately and collapses a burst into one trailing pass', () => {
    const store = createDownloadStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.put(record('a'));
    expect(listener).toHaveBeenCalledTimes(1);

    // Three more changes inside the window: the tap that started them already painted, and the rest
    // arrive as a single follow-up rather than three renders.
    store.put(record('b'));
    store.put(record('c'));
    store.applyChange('a', { status: 'downloading' });
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(DOWNLOAD_STATUS_NOTIFY_MS);
    expect(listener).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(DOWNLOAD_STATUS_NOTIFY_MS);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps byte progress off the status channel and throttles its own', () => {
    const store = createDownloadStore();
    store.hydrate([record('a')]);

    const statusListener = vi.fn();
    const progressListener = vi.fn();
    store.subscribe(statusListener);
    store.subscribeToProgress(progressListener);

    store.applyProgress('a', { byteSize: 900, bytesDownloaded: 100 });
    store.applyProgress('a', { byteSize: 900, bytesDownloaded: 200 });
    store.applyProgress('a', { byteSize: 900, bytesDownloaded: 300 });

    expect(statusListener).not.toHaveBeenCalled();
    expect(progressListener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DOWNLOAD_PROGRESS_NOTIFY_MS);
    expect(progressListener).toHaveBeenCalledTimes(1);
    expect(statusListener).not.toHaveBeenCalled();
    expect(store.get('a')?.bytesDownloaded).toBe(300);
  });

  it('leaves other records untouched so an unrelated row can skip its re-render', () => {
    const store = createDownloadStore();
    store.hydrate([record('a'), record('b')]);
    const untouched = store.get('b');
    const changing = store.get('a');

    store.applyChange('a', { status: 'complete' });
    store.applyProgress('a', { byteSize: 900, bytesDownloaded: 450 });

    expect(store.get('b')).toBe(untouched);
    expect(store.get('a')).not.toBe(changing);
    expect(store.get('a')?.bytesDownloaded).toBe(450);
  });

  it('ignores a progress report that repeats the bytes it already holds', () => {
    const store = createDownloadStore();
    store.hydrate([record('a')]);
    const listener = vi.fn();
    store.subscribeToProgress(listener);

    store.applyProgress('a', { byteSize: 900, bytesDownloaded: 0 });
    vi.advanceTimersByTime(DOWNLOAD_PROGRESS_NOTIFY_MS);
    expect(listener).toHaveBeenCalledTimes(1);

    store.applyProgress('a', { byteSize: 900, bytesDownloaded: 0 });
    vi.advanceTimersByTime(DOWNLOAD_PROGRESS_NOTIFY_MS);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('holds in-flight list order steady while bytes move', () => {
    const store = createDownloadStore();
    store.hydrate([record('newer', 'downloading', 2_000), record('older', 'downloading', 1_000)]);

    store.applyProgress('older', { byteSize: 900, bytesDownloaded: 800 });

    expect(store.getAll().map((row) => row.itemIdText)).toEqual(['newer', 'older']);
  });

  it('reports one change for a batch of them', () => {
    const store = createDownloadStore();
    store.hydrate([record('a'), record('b'), record('c')]);
    vi.advanceTimersByTime(DOWNLOAD_STATUS_NOTIFY_MS);

    const listener = vi.fn();
    store.subscribe(listener);

    store.batch(() => {
      store.applyChange('a', { status: 'paused' });
      store.applyChange('b', { status: 'paused' });
      store.applyChange('c', { status: 'paused' });
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getAll().every((row) => row.status === 'paused')).toBe(true);
  });
});
