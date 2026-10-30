import { describe, expect, it } from 'vitest';

import {
  EMPTY_CHANNEL_SECTION_CHROME_FLAGS,
  getCachedChannelSectionFlags,
  hydrateSectionChromeFlagsMemory,
  mergeChannelSectionChromeFlags,
  parseChannelSectionChromeFlags,
  parseItemSectionChromeFlags,
  resetSectionChromeFlagsMemoryForTests,
  sectionChromeCacheKey,
} from './sectionChromeFlags';

describe('sectionChromeCacheKey', () => {
  it('namespaces channel and item ids so they cannot collide', () => {
    expect(sectionChromeCacheKey('channel', 'abc')).toBe('channel:abc');
    expect(sectionChromeCacheKey('item', 'abc')).toBe('item:abc');
  });
});

describe('parseChannelSectionChromeFlags', () => {
  it('treats missing and non-object payloads as no evidence chips', () => {
    expect(parseChannelSectionChromeFlags(null)).toEqual(EMPTY_CHANNEL_SECTION_CHROME_FLAGS);
    expect(parseChannelSectionChromeFlags('yes')).toEqual(EMPTY_CHANNEL_SECTION_CHROME_FLAGS);
  });

  it('reads only explicit true flags', () => {
    expect(
      parseChannelSectionChromeFlags({
        hasOfficialClips: true,
        hasPodroll: 'yes',
      })
    ).toEqual({
      hasBoosts: false,
      hasFunding: false,
      hasOfficialClips: true,
      hasPeople: false,
      hasPodroll: false,
      hasRemoteItems: false,
    });
  });

  it('reads a missing remote-items flag as false and an explicit true as true', () => {
    expect(parseChannelSectionChromeFlags({ hasPodroll: true }).hasRemoteItems).toBe(false);
    expect(parseChannelSectionChromeFlags({ hasRemoteItems: true }).hasRemoteItems).toBe(true);
  });

  it('reads people only when the flag is explicit true', () => {
    expect(parseChannelSectionChromeFlags({ hasPeople: true }).hasPeople).toBe(true);
    expect(parseChannelSectionChromeFlags({ hasPeople: 'yes' }).hasPeople).toBe(false);
  });
});

describe('parseItemSectionChromeFlags', () => {
  it('reads chapters, soundbites, and transcript independently', () => {
    expect(
      parseItemSectionChromeFlags({
        hasChapters: true,
        hasTranscript: true,
      })
    ).toEqual({
      hasChapters: true,
      hasFunding: false,
      hasPeople: false,
      hasSoundbites: false,
      hasTranscript: true,
    });
  });
});

describe('mergeChannelSectionChromeFlags', () => {
  it('keeps unspecified flags and applies the patch', () => {
    expect(
      mergeChannelSectionChromeFlags(
        {
          hasBoosts: false,
          hasFunding: false,
          hasOfficialClips: true,
          hasPeople: false,
          hasPodroll: false,
          hasRemoteItems: false,
        },
        {
          hasPodroll: true,
        }
      )
    ).toEqual({
      hasBoosts: false,
      hasFunding: false,
      hasOfficialClips: true,
      hasPeople: false,
      hasPodroll: true,
      hasRemoteItems: false,
    });
  });
});

describe('section chrome memory', () => {
  it('hydrates channel rows for synchronous first-paint reads', () => {
    resetSectionChromeFlagsMemoryForTests();
    hydrateSectionChromeFlagsMemory([
      {
        cacheKey: 'channel:show-1',
        flagsJson: JSON.stringify({ hasPodroll: true, hasOfficialClips: true }),
      },
    ]);

    expect(getCachedChannelSectionFlags('show-1')).toEqual({
      hasBoosts: false,
      hasFunding: false,
      hasOfficialClips: true,
      hasPeople: false,
      hasPodroll: true,
      hasRemoteItems: false,
    });
    expect(getCachedChannelSectionFlags('missing')).toBeNull();
    resetSectionChromeFlagsMemoryForTests();
  });
});
