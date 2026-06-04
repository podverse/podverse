import { describe, expect, it } from 'vitest';

import { isAllowedCustomThemesUrl } from './customThemesUrl.js';

describe('isAllowedCustomThemesUrl', () => {
  it('allows https URLs', () => {
    expect(isAllowedCustomThemesUrl('https://example.com/themes.json')).toBe(true);
  });

  it('allows local http URLs', () => {
    expect(isAllowedCustomThemesUrl('http://localhost:2111/themes/custom-themes.multi.json')).toBe(
      true
    );
    expect(isAllowedCustomThemesUrl('http://127.0.0.1/themes.json')).toBe(true);
  });

  it('rejects remote http and invalid values', () => {
    expect(isAllowedCustomThemesUrl('http://example.com/themes.json')).toBe(false);
    expect(isAllowedCustomThemesUrl('')).toBe(false);
    expect(isAllowedCustomThemesUrl(undefined)).toBe(false);
  });
});
