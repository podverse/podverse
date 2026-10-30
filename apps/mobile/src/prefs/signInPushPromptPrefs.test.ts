import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hasShownSignInPushPrompt, markSignInPushPromptShown } from './signInPushPromptPrefs';

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

describe('signInPushPromptPrefs', () => {
  beforeEach(() => {
    inMemoryStore.clear();
    vi.mocked(AsyncStorage.getItem).mockClear();
  });

  it('reads false for an account that has not been shown the dialog', async () => {
    await expect(hasShownSignInPushPrompt('abc123')).resolves.toBe(false);
  });

  it('remembers the dialog for that account under the shared storage key', async () => {
    await markSignInPushPromptShown('abc123');

    await expect(hasShownSignInPushPrompt('abc123')).resolves.toBe(true);
    expect(inMemoryStore.get('notifications.sign_in_push_prompt_shown:abc123')).toBe('1');
    await expect(hasShownSignInPushPrompt('def456')).resolves.toBe(false);
  });

  it('reads false when the store rejects the read', async () => {
    vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('unavailable'));

    await expect(hasShownSignInPushPrompt('abc123')).resolves.toBe(false);
  });
});
