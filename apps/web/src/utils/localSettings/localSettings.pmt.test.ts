import { beforeEach, describe, expect, it } from 'vitest';

import { getParsedLocalSettings, setPreferredMediaType } from './localSettings.js';

function clearLocalSettingsCookie(): void {
  document.cookie = 'local-settings=; path=/; max-age=0';
}

describe('local-settings preferred media type (pmt)', () => {
  beforeEach(() => {
    clearLocalSettingsCookie();
  });

  it('defaults pmt to "video" when no cookie is present', () => {
    expect(getParsedLocalSettings().pmt).toBe('video');
  });

  it('persists and reads a valid pmt value', () => {
    setPreferredMediaType('audio');
    expect(getParsedLocalSettings().pmt).toBe('audio');

    setPreferredMediaType('video');
    expect(getParsedLocalSettings().pmt).toBe('video');
  });

  it('inherits the default pmt for cookies that predate the field', () => {
    const legacy = {
      uit: 'light',
      vs: 'grid',
      seda: false,
      aqc: { rp: false, rd: false },
    };
    document.cookie = `local-settings=${encodeURIComponent(JSON.stringify(legacy))}; path=/`;

    expect(getParsedLocalSettings().pmt).toBe('video');
  });

  it('falls back to defaults when pmt is an invalid value', () => {
    const invalid = {
      uit: 'light',
      vs: 'grid',
      seda: false,
      aqc: { rp: false, rd: false },
      pmt: 'bogus',
    };
    document.cookie = `local-settings=${encodeURIComponent(JSON.stringify(invalid))}; path=/`;

    expect(getParsedLocalSettings().pmt).toBe('video');
  });
});
