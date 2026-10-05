import { describe, expect, it, vi } from 'vitest';

import { createImageLoaderInitGate } from './coverThumbnailLoaderGate';

describe('createImageLoaderInitGate', () => {
  it('runs warm once before concurrent product loads, then lets them proceed together', async () => {
    let resolveWarm: (() => void) | undefined;
    const warm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWarm = resolve;
        })
    );
    const gate = createImageLoaderInitGate(warm);
    const started: string[] = [];
    const workA = vi.fn(async () => {
      started.push('a');
      return 'a';
    });
    const workB = vi.fn(async () => {
      started.push('b');
      return 'b';
    });

    const pendingA = gate.afterReady(workA);
    const pendingB = gate.afterReady(workB);

    expect(warm).toHaveBeenCalledTimes(1);
    expect(workA).not.toHaveBeenCalled();
    expect(workB).not.toHaveBeenCalled();

    resolveWarm?.();
    await expect(Promise.all([pendingA, pendingB])).resolves.toEqual(['a', 'b']);
    expect(warm).toHaveBeenCalledTimes(1);
    expect(started).toEqual(['a', 'b']);
  });

  it('opens the gate when warm fails so product loads still run', async () => {
    const warm = vi.fn(async () => {
      throw new Error('warmup');
    });
    const gate = createImageLoaderInitGate(warm);
    const work = vi.fn(async () => 'ok');

    await expect(gate.afterReady(work)).resolves.toBe('ok');
    expect(warm).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('does not warm again after the first ready settle', async () => {
    const warm = vi.fn(async () => undefined);
    const gate = createImageLoaderInitGate(warm);

    await gate.afterReady(async () => 'first');
    await gate.afterReady(async () => 'second');
    await gate.ensureReady();

    expect(warm).toHaveBeenCalledTimes(1);
  });
});
