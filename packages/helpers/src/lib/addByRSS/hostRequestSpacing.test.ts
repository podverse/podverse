import { describe, expect, it } from 'vitest';

import { resolveAddByRSSHostRequestSpacing } from './hostRequestSpacing.js';

describe('resolveAddByRSSHostRequestSpacing', () => {
  it('spaces requests to wavlake.com, including www and http', () => {
    expect(resolveAddByRSSHostRequestSpacing('https://wavlake.com/feed/x')).toEqual({
      key: 'wavlake.com',
      spacingMs: 5000,
    });
    expect(resolveAddByRSSHostRequestSpacing('http://www.wavlake.com/x')).toEqual({
      key: 'wavlake.com',
      spacingMs: 5000,
    });
  });

  it('ignores hosts that only mention wavlake in the path or a lookalike name', () => {
    expect(resolveAddByRSSHostRequestSpacing('https://example.com/wavlake.com')).toBeNull();
    expect(resolveAddByRSSHostRequestSpacing('https://notwavlake.com/x')).toBeNull();
  });
});
