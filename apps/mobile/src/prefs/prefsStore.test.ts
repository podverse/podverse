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

    await expect(getPref('uit')).resolves.toBeNull();
    await expect(getPref('pmt')).resolves.toBeNull();
    await expect(getPref('preferred_media_type')).resolves.toBeNull();
    inMemoryStore.set('preferred_media_type', 'livestreams');
    await expect(getPref('preferred_media_type')).resolves.toBe('livestreams');
  });

  it('writes booleans as true/false strings and enums as raw strings', async () => {
    await setPref('aqc.rd', true);
    await setPref('aqc.rp', false);
    await setPref('downloads.auto_delete', false);
    await setPref('preferred_media_type', 'podcasts');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('aqc.rd', 'true');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('aqc.rp', 'false');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('downloads.auto_delete', 'false');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('preferred_media_type', 'podcasts');
  });

  it('hydrates a full snapshot with nulls for unset keys', async () => {
    inMemoryStore.set('aqc.rd', 'true');
    inMemoryStore.set('locale', 'es');

    await expect(hydratePrefs()).resolves.toEqual({
      'aqc.rd': true,
      'aqc.rp': null,
      'auth.forced_logout_at': null,
      'auth.forced_logout_notice': null,
      'downloads.auto_delete': null,
      locale: 'es',
      'membership.expiry_dismissed_for': null,
      'playback.handoff_dismissed_state': null,
      'boost.sender_name': null,
      'offline.mode': null,
      pmt: null,
      preferred_media_type: null,
      uit: null,
    });
  });

  it('remembers a boost sender name, including a cleared empty string', async () => {
    await setPref('boost.sender_name', 'Ada');
    await expect(getPref('boost.sender_name')).resolves.toBe('Ada');

    await setPref('boost.sender_name', '');
    await expect(getPref('boost.sender_name')).resolves.toBe('');
  });

  it('reads and writes playback handoff dismissal state as a raw string', async () => {
    inMemoryStore.set('playback.handoff_dismissed_state', 'episode-1::123');
    await expect(getPref('playback.handoff_dismissed_state')).resolves.toBe('episode-1::123');

    await setPref('playback.handoff_dismissed_state', 'episode-2::456');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'playback.handoff_dismissed_state',
      'episode-2::456'
    );
  });

  it('round-trips a forced-logout notice and rejects an unknown string', async () => {
    await setPref('auth.forced_logout_notice', 'signed_out_elsewhere');

    await expect(getPref('auth.forced_logout_notice')).resolves.toBe('signed_out_elsewhere');
    await expect(hydratePrefs()).resolves.toMatchObject({
      'auth.forced_logout_notice': 'signed_out_elsewhere',
    });

    inMemoryStore.set('auth.forced_logout_notice', 'not-a-notice');
    await expect(getPref('auth.forced_logout_notice')).resolves.toBeNull();
  });

  it('parses offline.mode as a boolean pref', async () => {
    inMemoryStore.set('offline.mode', 'true');
    await expect(getPref('offline.mode')).resolves.toBe(true);
    await setPref('offline.mode', false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('offline.mode', 'false');
  });
});
