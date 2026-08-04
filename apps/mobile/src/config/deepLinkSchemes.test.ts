import { describe, expect, it } from 'vitest';

import {
  buildMobileLinkPrefixes,
  DEFAULT_MOBILE_DEEP_LINK_SCHEMES,
  parseMobileDeepLinkSchemes,
} from './deepLinkSchemes';

describe('parseMobileDeepLinkSchemes', () => {
  it('falls back to the default list when unset or empty', () => {
    expect(parseMobileDeepLinkSchemes(undefined)).toEqual(DEFAULT_MOBILE_DEEP_LINK_SCHEMES);
    expect(parseMobileDeepLinkSchemes('')).toEqual(DEFAULT_MOBILE_DEEP_LINK_SCHEMES);
    expect(parseMobileDeepLinkSchemes('   ')).toEqual(DEFAULT_MOBILE_DEEP_LINK_SCHEMES);
  });

  it('splits on commas and whitespace and trims entries', () => {
    expect(parseMobileDeepLinkSchemes('myapp, myapp-next')).toEqual(['myapp', 'myapp-next']);
    expect(parseMobileDeepLinkSchemes('myapp myapp-next')).toEqual(['myapp', 'myapp-next']);
  });

  it('strips a trailing :// or : so pasted URL schemes normalize to bare names', () => {
    expect(parseMobileDeepLinkSchemes('podverse://, podverse-next://')).toEqual([
      'podverse',
      'podverse-next',
    ]);
    expect(parseMobileDeepLinkSchemes('podverse:')).toEqual(['podverse']);
  });
});

describe('buildMobileLinkPrefixes', () => {
  it('appends :// to each scheme and normalizes the web base URL (default Podverse shape)', () => {
    expect(
      buildMobileLinkPrefixes(DEFAULT_MOBILE_DEEP_LINK_SCHEMES, 'https://podverse.fm')
    ).toEqual(['podverse-next://', 'podverse://', 'https://podverse.fm']);
  });

  it('trims a trailing slash from the web base URL', () => {
    expect(buildMobileLinkPrefixes(['myapp'], 'https://example.com/')).toEqual([
      'myapp://',
      'https://example.com',
    ]);
  });
});
