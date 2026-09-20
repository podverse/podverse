import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  consumeShareSheetPassthroughTap,
  isShareSheetPassthroughWindow,
  presentShareSheet,
  SHARE_PRESENT_DELAY_MS,
} from './shareSheetPassthrough';

describe('shareSheetPassthrough', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.advanceTimersByTime(10_000);
    vi.useRealTimers();
  });

  it('stays active while the sheet is open, including after several seconds', async () => {
    let resolveShare: () => void = () => undefined;
    const share = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveShare = resolve;
        })
    );

    expect(isShareSheetPassthroughWindow()).toBe(false);
    const presented = presentShareSheet(share);
    expect(isShareSheetPassthroughWindow()).toBe(true);
    expect(share).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SHARE_PRESENT_DELAY_MS);
    expect(share).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(isShareSheetPassthroughWindow()).toBe(true);

    resolveShare();
    await presented;
    expect(isShareSheetPassthroughWindow()).toBe(false);
  });

  it('ends as soon as the dismiss tap is swallowed', async () => {
    const share = vi.fn(() => new Promise<void>(() => undefined));
    void presentShareSheet(share);
    expect(isShareSheetPassthroughWindow()).toBe(true);

    consumeShareSheetPassthroughTap();
    expect(isShareSheetPassthroughWindow()).toBe(false);
  });
});
