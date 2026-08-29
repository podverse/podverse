import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPref, hydratePrefs, setPref } from './prefsStore';

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

describe('prefsStore', () => {
  beforeEach(() => {
    inMemoryStore.clear();
    vi.mocked(AsyncStorage.getItem).mockClear();
    vi.mocked(AsyncStorage.setItem).mockClear();
  });

  it('parses boolean prefs and rejects non-boolean strings', async () => {
    inMemoryStore.set('aqc.rd', 'true');
    inMemoryStore.set('aqc.rp', 'false');
    inMemoryStore.set('downloads.auto_delete', 'nope');

    await expect(getPref('aqc.rd')).resolves.toBe(true);
    await expect(getPref('aqc.rp')).resolves.toBe(false);
    await expect(getPref('downloads.auto_delete')).resolves.toBeNull();
  });

  it('rejects invalid enum values and returns null', async () => {
    inMemoryStore.set('uit', 'solarized');
    inMemoryStore.set('pmt', 'text');
    inMemoryStore.set('preferred_media_type', 'news');
    inMemoryStore.set('home.subscriptionFilter', 'directory');
    inMemoryStore.set('library.subscriptionFilter', 'directory');

    await expect(getPref('uit')).resolves.toBeNull();
    await expect(getPref('pmt')).resolves.toBeNull();
    await expect(getPref('preferred_media_type')).resolves.toBeNull();
    await expect(getPref('home.subscriptionFilter')).resolves.toBeNull();
    await expect(getPref('library.subscriptionFilter')).resolves.toBeNull();
  });

  it('writes booleans as true/false strings and enums as raw strings', async () => {
    await setPref('aqc.rd', true);
    await setPref('aqc.rp', false);
    await setPref('downloads.auto_delete', false);
    await setPref('preferred_media_type', 'podcasts');
    await setPref('home.subscriptionFilter', 'addByRss');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('aqc.rd', 'true');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('aqc.rp', 'false');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('downloads.auto_delete', 'false');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('preferred_media_type', 'podcasts');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('home.subscriptionFilter', 'addByRss');
  });

  it('hydrates a full snapshot with nulls for unset keys', async () => {
    inMemoryStore.set('aqc.rd', 'true');
    inMemoryStore.set('locale', 'es');

    await expect(hydratePrefs()).resolves.toEqual({
      'aqc.rd': true,
      'aqc.rp': null,
      'auth.forced_logout_at': null,
      'downloads.auto_delete': null,
      'home.subscriptionFilter': null,
      'library.subscriptionFilter': null,
      locale: 'es',
      'membership.expiry_dismissed_for': null,
      pmt: null,
      preferred_media_type: null,
      uit: null,
    });
  });
});
