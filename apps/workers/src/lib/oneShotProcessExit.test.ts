import { describe, expect, it, vi } from 'vitest';

import { finalizeOneShotWorkerProcess } from './oneShotProcessExit.js';

describe('finalizeOneShotWorkerProcess', () => {
  it('exits with 1 when a one-shot command failed', () => {
    const exitFn = vi.fn<(code: number) => never>();

    finalizeOneShotWorkerProcess('statsUpdateAggregated', 1, exitFn);

    expect(exitFn).toHaveBeenCalledTimes(1);
    expect(exitFn).toHaveBeenCalledWith(1);
  });

  it('exits with 0 when a one-shot command succeeded', () => {
    const exitFn = vi.fn<(code: number) => never>();

    finalizeOneShotWorkerProcess('statsUpdateAggregated', 0, exitFn);

    expect(exitFn).toHaveBeenCalledWith(0);
  });

  it('does not exit for long-running Deployment commands', () => {
    const exitFn = vi.fn<(code: number) => never>();

    finalizeOneShotWorkerProcess('mqRSSRunParser', 1, exitFn);

    expect(exitFn).not.toHaveBeenCalled();
  });

  it('preserves non-zero exit code instead of overwriting with 0', () => {
    const exitFn = vi.fn<(code: number) => never>();
    const exitCodeAfterFailure = 1;

    finalizeOneShotWorkerProcess(
      'mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex',
      exitCodeAfterFailure,
      exitFn
    );

    expect(exitFn).toHaveBeenCalledWith(1);
    expect(exitFn).not.toHaveBeenCalledWith(0);
  });
});
