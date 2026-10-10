import { beforeEach, describe, expect, it } from 'vitest';

import type { SidebarAccordionState } from './localSettings.js';
import { getParsedLocalSettings } from './localSettings.js';

function clearLocalSettingsCookie(): void {
  document.cookie = 'local-settings=; path=/; max-age=0';
}

function writeLocalSettings(value: Record<string, unknown>): void {
  document.cookie = `local-settings=${encodeURIComponent(JSON.stringify(value))}; path=/`;
}

const baseSettings = {
  uit: 'light',
  vs: 'grid',
  seda: false,
  aqc: { rp: false, rd: false },
};

const allClosed: SidebarAccordionState = {
  podcasts: false,
  music: false,
  addByRSS: false,
  library: false,
};

const allOpen: SidebarAccordionState = {
  podcasts: true,
  music: true,
  addByRSS: true,
  library: true,
};

describe('local-settings sidebar accordion (sba)', () => {
  beforeEach(() => {
    clearLocalSettingsCookie();
  });

  it('starts every section open when no cookie is present', () => {
    expect(getParsedLocalSettings().sba).toEqual(allOpen);
  });

  it('starts every section open when the cookie has no accordion', () => {
    writeLocalSettings(baseSettings);

    expect(getParsedLocalSettings().sba).toEqual(allOpen);
  });

  it('keeps every section closed when the cookie saved that choice', () => {
    writeLocalSettings({ ...baseSettings, sba: allClosed });

    expect(getParsedLocalSettings().sba).toEqual(allClosed);
  });

  it('keeps one saved close and leaves the other sections open', () => {
    writeLocalSettings({
      ...baseSettings,
      sba: { ...allOpen, music: false },
    });

    expect(getParsedLocalSettings().sba).toEqual({
      podcasts: true,
      music: false,
      addByRSS: true,
      library: true,
    });
  });
});
