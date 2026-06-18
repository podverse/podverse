import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('waitForKeyvalPingReady', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    try {
      const keyvaldbModule = await import('./keyvaldb.js');
      if (keyvaldbModule.keyvaldb.status === 'ready' || keyvaldbModule.keyvaldb.status === 'connecting') {
        await keyvaldbModule.keyvaldb.quit();
      }
    } catch {
      // module may have been reset before teardown
    }
  });

  it('calls testKeyvaldbConnection(false) when keyval becomes ready during retry loop', async () => {
    vi.useFakeTimers();
    const keyvaldbModule = await import('./keyvaldb.js');
    const testConnectionMock = vi
      .spyOn(keyvaldbModule, 'testKeyvaldbConnection')
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const { waitForKeyvalPingReady } = await import('./waitForKeyvalPingReady.js');

    const promise = waitForKeyvalPingReady();
    await vi.advanceTimersByTimeAsync(2000);
    const ready = await promise;

    expect(ready).toBe(true);
    expect(testConnectionMock).toHaveBeenNthCalledWith(1, false);
    expect(testConnectionMock).toHaveBeenNthCalledWith(2, false);
  });

  it('calls testKeyvaldbConnection(true) once at deadline expiry for final status-check logging', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now');
    dateNowSpy.mockReturnValueOnce(0);
    dateNowSpy.mockReturnValueOnce(120_001);

    const keyvaldbModule = await import('./keyvaldb.js');
    const testConnectionMock = vi
      .spyOn(keyvaldbModule, 'testKeyvaldbConnection')
      .mockResolvedValueOnce(false);

    const { waitForKeyvalPingReady } = await import('./waitForKeyvalPingReady.js');

    const ready = await waitForKeyvalPingReady();

    expect(ready).toBe(false);
    expect(testConnectionMock).toHaveBeenCalledTimes(1);
    expect(testConnectionMock).toHaveBeenCalledWith(true);
  });
});
