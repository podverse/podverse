import { describe, expect, it } from 'vitest';

import {
  buildCatalogConfigFromEnv,
  parseCatalogPodcastIndexIdAllowlist,
  validateCatalogDisabledFlag,
  validateCatalogEnv,
  validateCatalogPodcastIndexIdAllowlist,
} from './catalogConfig.js';

const openCatalog = {
  musicEnabled: true,
  addByRSSEnabled: true,
  podcastIndexIdAllowlist: null,
};

describe('parseCatalogPodcastIndexIdAllowlist', () => {
  it('returns null when the value is missing or blank', () => {
    expect(parseCatalogPodcastIndexIdAllowlist(undefined)).toBeNull();
    expect(parseCatalogPodcastIndexIdAllowlist('')).toBeNull();
    expect(parseCatalogPodcastIndexIdAllowlist('  ')).toBeNull();
  });

  it('parses comma-separated ids and keeps the first copy of each', () => {
    expect(parseCatalogPodcastIndexIdAllowlist('920666,41504')).toEqual([920666, 41504]);
    expect(parseCatalogPodcastIndexIdAllowlist(' 920666 , 41504 ')).toEqual([920666, 41504]);
    expect(parseCatalogPodcastIndexIdAllowlist('1,1,2')).toEqual([1, 2]);
  });

  it('drops tokens that are not positive safe integers', () => {
    expect(parseCatalogPodcastIndexIdAllowlist('abc')).toEqual([]);
    expect(parseCatalogPodcastIndexIdAllowlist('5,abc,0,-3,07,6')).toEqual([5, 6]);
    expect(parseCatalogPodcastIndexIdAllowlist('9007199254740991,9007199254740993')).toEqual([
      9007199254740991,
    ]);
  });

  it('keeps a long list without a cap', () => {
    const ids = Array.from({ length: 2000 }, (_, index) => index + 1);
    expect(parseCatalogPodcastIndexIdAllowlist(ids.join(','))).toEqual(ids);
  });
});

describe('buildCatalogConfigFromEnv', () => {
  it('keeps music and Add by RSS on when the keys are unset', () => {
    expect(buildCatalogConfigFromEnv({}, '')).toEqual(openCatalog);
    expect(buildCatalogConfigFromEnv({}, 'NEXT_PUBLIC_')).toEqual(openCatalog);
  });

  it('turns a feature off only when its flag is the string true', () => {
    expect(
      buildCatalogConfigFromEnv(
        {
          CATALOG_MUSIC_DISABLED: 'true',
          CATALOG_ADD_BY_RSS_DISABLED: 'true',
        },
        ''
      )
    ).toEqual({
      musicEnabled: false,
      addByRSSEnabled: false,
      podcastIndexIdAllowlist: null,
    });
    expect(
      buildCatalogConfigFromEnv(
        {
          CATALOG_MUSIC_DISABLED: 'false',
          CATALOG_ADD_BY_RSS_DISABLED: 'false',
        },
        ''
      )
    ).toEqual(openCatalog);
    expect(
      buildCatalogConfigFromEnv({ CATALOG_PODCAST_INDEX_ID_ALLOWLIST: '920666,41504' }, '')
        .podcastIndexIdAllowlist
    ).toEqual([920666, 41504]);
  });

  it('reads only the keys for the given prefix', () => {
    expect(
      buildCatalogConfigFromEnv({ NEXT_PUBLIC_CATALOG_MUSIC_DISABLED: 'true' }, '').musicEnabled
    ).toBe(true);
    expect(
      buildCatalogConfigFromEnv({ CATALOG_MUSIC_DISABLED: 'true' }, 'NEXT_PUBLIC_').musicEnabled
    ).toBe(true);
  });

  it('accepts a fixed runtime-config map', () => {
    const env: { NEXT_PUBLIC_CATALOG_MUSIC_DISABLED: string | undefined } = {
      NEXT_PUBLIC_CATALOG_MUSIC_DISABLED: 'true',
    };
    expect(buildCatalogConfigFromEnv(env, 'NEXT_PUBLIC_').musicEnabled).toBe(false);
  });
});

describe('validateCatalogDisabledFlag', () => {
  const key = 'CATALOG_MUSIC_DISABLED';

  it('accepts blank, true, and false', () => {
    expect(validateCatalogDisabledFlag({}, key)).toEqual({
      name: key,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Blank (on)',
      category: 'Catalog',
    });
    expect(validateCatalogDisabledFlag({ [key]: '   ' }, key).isValid).toBe(true);
    expect(validateCatalogDisabledFlag({ [key]: 'true' }, key)).toEqual({
      name: key,
      isSet: true,
      isValid: true,
      isRequired: false,
      message: 'Set to true (off)',
      category: 'Catalog',
    });
    expect(validateCatalogDisabledFlag({ [key]: 'false' }, key)).toEqual({
      name: key,
      isSet: true,
      isValid: true,
      isRequired: false,
      message: 'Set to false (on)',
      category: 'Catalog',
    });
  });

  it('rejects other spellings', () => {
    for (const value of ['yes', 'TRUE']) {
      expect(validateCatalogDisabledFlag({ [key]: value }, key)).toEqual({
        name: key,
        isSet: true,
        isValid: false,
        isRequired: true,
        message: `Invalid value: "${value}" - must be "true" or "false"`,
        category: 'Catalog',
      });
    }
  });
});

describe('validateCatalogPodcastIndexIdAllowlist', () => {
  const key = 'CATALOG_PODCAST_INDEX_ID_ALLOWLIST';

  it('accepts blank and a list of ids', () => {
    expect(validateCatalogPodcastIndexIdAllowlist({}, key)).toEqual({
      name: key,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Blank (no allowlist)',
      category: 'Catalog',
    });
    expect(validateCatalogPodcastIndexIdAllowlist({ [key]: '920666,41504' }, key)).toEqual({
      name: key,
      isSet: true,
      isValid: true,
      isRequired: false,
      message: '2 Podcast Index id(s)',
      category: 'Catalog',
    });
    expect(validateCatalogPodcastIndexIdAllowlist({ [key]: '1,1' }, key).message).toBe(
      '1 Podcast Index id(s)'
    );
  });

  it('rejects a bad token and a list that parses to nothing', () => {
    expect(validateCatalogPodcastIndexIdAllowlist({ [key]: '920666,abc' }, key)).toEqual({
      name: key,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: 'Invalid Podcast Index id(s): abc - use comma-separated positive integers',
      category: 'Catalog',
    });
    expect(validateCatalogPodcastIndexIdAllowlist({ [key]: ',' }, key)).toEqual({
      name: key,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: 'Empty after parsing - use comma-separated positive integers',
      category: 'Catalog',
    });
  });
});

describe('validateCatalogEnv', () => {
  it('returns the music flag, the Add by RSS flag, and the allowlist', () => {
    expect(validateCatalogEnv({}, '').map((result) => result.name)).toEqual([
      'CATALOG_MUSIC_DISABLED',
      'CATALOG_ADD_BY_RSS_DISABLED',
      'CATALOG_PODCAST_INDEX_ID_ALLOWLIST',
    ]);
    expect(validateCatalogEnv({}, 'NEXT_PUBLIC_').map((result) => result.name)).toEqual([
      'NEXT_PUBLIC_CATALOG_MUSIC_DISABLED',
      'NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED',
      'NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST',
    ]);
  });
});
