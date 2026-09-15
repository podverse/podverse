import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPref = vi.fn();
const setPref = vi.fn();

vi.mock('./prefsStore', () => {
  return {
    DEFAULT_OFFLINE_MODE: false,
    getPref: (...args: unknown[]) => getPref(...args),
    setPref: (...args: unknown[]) => setPref(...args),
  };
});

describe('isSyncNetworkUsable', () => {
  it('is true only when the network is reachable and Offline Mode is off', async () => {
    const { isSyncNetworkUsable } = await import('./offlineMode');
    expect(isSyncNetworkUsable(true, false)).toBe(true);
    expect(isSyncNetworkUsable(true, true)).toBe(false);
    expect(isSyncNetworkUsable(false, false)).toBe(false);
    expect(isSyncNetworkUsable(false, true)).toBe(false);
  });
});

describe('hydrateOfflineMode / writeOfflineModeEnabled', () => {
  beforeEach(() => {
    vi.resetModules();
    getPref.mockReset();
    setPref.mockReset();
    setPref.mockResolvedValue(undefined);
  });

  it('lets a write during an in-flight hydrate win over the disk seed', async () => {
    const pendingDiskReads: ((value: boolean) => void)[] = [];
    getPref.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          pendingDiskReads.push(resolve);
        })
    );

    const { hydrateOfflineMode, isOfflineModeEnabled, writeOfflineModeEnabled } =
      await import('./offlineMode');

    const hydrate = hydrateOfflineMode();
    await vi.waitFor(() => {
      expect(pendingDiskReads).toHaveLength(1);
    });

    await writeOfflineModeEnabled(false);
    expect(isOfflineModeEnabled()).toBe(false);

    pendingDiskReads[0]?.(true);
    await expect(hydrate).resolves.toBe(false);
    expect(isOfflineModeEnabled()).toBe(false);
  });

  it('returns the live written value on a later hydrate, not the first disk boolean', async () => {
    getPref.mockResolvedValue(true);

    const { hydrateOfflineMode, isOfflineModeEnabled, writeOfflineModeEnabled } =
      await import('./offlineMode');

    await expect(hydrateOfflineMode()).resolves.toBe(true);
    await writeOfflineModeEnabled(false);
    expect(isOfflineModeEnabled()).toBe(false);

    await expect(hydrateOfflineMode()).resolves.toBe(false);
    expect(getPref).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers when Offline Mode is written', async () => {
    getPref.mockResolvedValue(false);
    const { subscribeOfflineMode, writeOfflineModeEnabled } = await import('./offlineMode');

    const listener = vi.fn();
    const unsubscribe = subscribeOfflineMode(listener);
    await writeOfflineModeEnabled(true);
    expect(listener).toHaveBeenCalledWith(true);

    await writeOfflineModeEnabled(false);
    expect(listener).toHaveBeenCalledWith(false);
    unsubscribe();
  });
});
