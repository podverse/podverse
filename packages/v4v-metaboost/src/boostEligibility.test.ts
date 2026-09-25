import { describe, expect, it } from 'vitest';

import { getBoostEligibilityForContent } from './boostEligibility.js';

describe('getBoostEligibilityForContent', () => {
  it('shows the boost action only when channel values and a supported MetaBoost standard exist', () => {
    expect(
      getBoostEligibilityForContent({
        channel: {
          channel_meta_boost: {
            node: 'https://api.example.com/v1/s/mbrss-v1/boost/abc/',
            standard: 'mbrss-v1',
          },
          channel_values: [
            {
              channel_value_recipients: [],
              id: 1,
              method: 'keysend',
              suggested: null,
              type: 'lightning',
            },
          ],
          podcast_guid: 'guid-1',
        },
      }).canShowBoostAction
    ).toBe(true);
  });

  it('stays off when value tags exist without a supported MetaBoost standard', () => {
    expect(
      getBoostEligibilityForContent({
        channel: {
          channel_values: [
            {
              channel_value_recipients: [],
              id: 1,
              method: 'keysend',
              suggested: null,
              type: 'lightning',
            },
          ],
        },
      }).canShowBoostAction
    ).toBe(false);
  });
});
