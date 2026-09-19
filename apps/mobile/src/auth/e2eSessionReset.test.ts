import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shouldResetLeakedE2eSession } from './e2eSessionReset';

const inMemoryStore = new Map<string, string>();
const isE2e = vi.fn(() => true);

vi.mock('@react-native-async-storage/async-storage', () => {
  return {
    default: {
      getItem: vi.fn(async (key: string) => inMemoryStore.get(key) ?? null),
      removeItem: vi.fn(async (key: string) => {
        inMemoryStore.delete(key);
      }),
      setItem: vi.fn(async (key: string, value: string) => {
        inMemoryStore.set(key, value);
      }),
    },
  };
});

vi.mock('../config', () => ({
  getMobileConfig: () => ({ isE2e: isE2e() }),
}));

describe('shouldResetLeakedE2eSession', () => {
  beforeEach(() => {
    inMemoryStore.clear();
    isE2e.mockReturnValue(true);
    vi.stubGlobal('__DEV__', true);
  });

  it('resets on the first boot after storage was cleared, where a surviving session is a leak', async () => {
    await expect(shouldResetLeakedE2eSession()).resolves.toBe(true);
  });

  it('keeps the session across a relaunch that left storage intact', async () => {
    await shouldResetLeakedE2eSession();

    await expect(shouldResetLeakedE2eSession()).resolves.toBe(false);
    await expect(shouldResetLeakedE2eSession()).resolves.toBe(false);
  });

  it('resets again once storage is cleared for the next flow', async () => {
    await shouldResetLeakedE2eSession();
    inMemoryStore.clear();

    await expect(shouldResetLeakedE2eSession()).resolves.toBe(true);
  });

  it('never resets outside an E2E build', async () => {
    isE2e.mockReturnValue(false);

    await expect(shouldResetLeakedE2eSession()).resolves.toBe(false);
  });

  it('never resets in a release build, even with the E2E flag set', async () => {
    vi.stubGlobal('__DEV__', false);

    await expect(shouldResetLeakedE2eSession()).resolves.toBe(false);
  });
});
