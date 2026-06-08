import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { testKeyvaldbConnection } from './keyvaldb.js';
import { waitForKeyvalPingReady } from './waitForKeyvalPingReady.js';

vi.mock('./keyvaldb.js', () => ({
  testKeyvaldbConnection: vi.fn(),
}));

describe('waitForKeyvalPingReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls testKeyvaldbConnection(false) when keyval becomes ready during retry loop', async () => {
    vi.useFakeTimers();
    const testConnectionMock = vi.mocked(testKeyvaldbConnection);
    testConnectionMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

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

    const testConnectionMock = vi.mocked(testKeyvaldbConnection);
    testConnectionMock.mockResolvedValueOnce(false);

    const ready = await waitForKeyvalPingReady();

    expect(ready).toBe(false);
    expect(testConnectionMock).toHaveBeenCalledTimes(1);
    expect(testConnectionMock).toHaveBeenCalledWith(true);
  });
});
