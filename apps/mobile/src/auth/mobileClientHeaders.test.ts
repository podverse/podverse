import { describe, expect, it } from 'vitest';

import {
  buildMobileClientHeaders,
  MOBILE_CLIENT_PLATFORM_HEADER,
  MOBILE_CLIENT_VERSION_FALLBACK,
  MOBILE_CLIENT_VERSION_HEADER,
} from './mobileClientHeaders';

describe('buildMobileClientHeaders', () => {
  it('emits version + platform headers from resolved values', () => {
    expect(buildMobileClientHeaders('1.2.3', 'ios')).toEqual({
      [MOBILE_CLIENT_VERSION_HEADER]: '1.2.3',
      [MOBILE_CLIENT_PLATFORM_HEADER]: 'ios',
    });
  });

  it('falls back to a sentinel version when the Expo config has none', () => {
    for (const missing of [null, undefined, '']) {
      expect(buildMobileClientHeaders(missing, 'android')).toEqual({
        [MOBILE_CLIENT_VERSION_HEADER]: MOBILE_CLIENT_VERSION_FALLBACK,
        [MOBILE_CLIENT_PLATFORM_HEADER]: 'android',
      });
    }
  });
});
