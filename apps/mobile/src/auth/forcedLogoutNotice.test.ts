import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionEndReason } from './forcedLogoutNotice';
import {
  clearForcedLogoutNotice,
  hasPendingForcedLogoutNotice,
  markForcedLogout,
  shouldNotifyForcedLogout,
} from './forcedLogoutNotice';

const inMemoryStore = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => {
  return {
    default: {
      getItem: vi.fn(async (key: string) => {
        return inMemoryStore.has(key) ? (inMemoryStore.get(key) ?? null) : null;
      }),
      removeItem: vi.fn(async (key: string) => {
        inMemoryStore.delete(key);
      }),
      setItem: vi.fn(async (key: string, value: string) => {
        inMemoryStore.set(key, value);
      }),
    },
  };
});

describe('forcedLogoutNotice', () => {
  beforeEach(() => {
    inMemoryStore.clear();
    vi.mocked(AsyncStorage.getItem).mockClear();
    vi.mocked(AsyncStorage.removeItem).mockClear();
    vi.mocked(AsyncStorage.setItem).mockClear();
  });

  it('notifies only when the server ended the session', () => {
    // The whole point of the reason: signing yourself out must stay silent, and a fixture reset
    // must not look like a real sign-out.
    const allReasons: SessionEndReason[] = ['user_logout', 'session_expired', 'reset'];

    expect(allReasons.filter(shouldNotifyForcedLogout)).toEqual(['session_expired']);
  });

  it('has nothing pending until a forced logout is recorded', async () => {
    await expect(hasPendingForcedLogoutNotice()).resolves.toBe(false);
  });

  it('reports a pending notice after the session is ended by the server', async () => {
    await markForcedLogout(new Date('2026-08-28T12:00:00.000Z'));

    expect(inMemoryStore.get('auth.forced_logout_at')).toBe('2026-08-28T12:00:00.000Z');
    await expect(hasPendingForcedLogoutNotice()).resolves.toBe(true);
  });

  it('survives being read repeatedly, so a relaunch still shows it', async () => {
    await markForcedLogout();

    await expect(hasPendingForcedLogoutNotice()).resolves.toBe(true);
    await expect(hasPendingForcedLogoutNotice()).resolves.toBe(true);
  });

  it('stops reporting once the notice is consumed', async () => {
    await markForcedLogout();
    await clearForcedLogoutNotice();

    await expect(hasPendingForcedLogoutNotice()).resolves.toBe(false);
  });
});
