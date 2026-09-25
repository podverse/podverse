import { describe, expect, it } from 'vitest';

import { createInFlightGuard } from './createInFlightGuard';

describe('createInFlightGuard', () => {
  it('rejects a second call with the same key while the first is in flight', async () => {
    const guard = createInFlightGuard();
    let release!: () => void;
    const firstWork = new Promise<string>((resolve) => {
      release = () => {
        resolve('first');
      };
    });

    const first = guard.run('k', async () => firstWork);
    const second = await guard.run('k', async () => 'second');
    expect(second).toBe(false);

    release();
    await expect(first).resolves.toBe('first');

    const third = await guard.run('k', async () => 'third');
    expect(third).toBe('third');
  });

  it('releases the key when the work throws', async () => {
    const guard = createInFlightGuard();
    await expect(
      guard.run('k', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const next = await guard.run('k', async () => 'ok');
    expect(next).toBe('ok');
  });

  it('allows different keys to run concurrently', async () => {
    const guard = createInFlightGuard();
    let releaseA!: () => void;
    const workA = new Promise<string>((resolve) => {
      releaseA = () => {
        resolve('a');
      };
    });

    const a = guard.run('a', async () => workA);
    const b = await guard.run('b', async () => 'b');
    expect(b).toBe('b');
    releaseA();
    await expect(a).resolves.toBe('a');
  });
});
