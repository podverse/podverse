import { describe, expect, it } from 'vitest';

import { parseCapabilityThresholdContextFields } from './metaBoostCapabilityParseThresholdContext.js';

describe('parseCapabilityThresholdContextFields', () => {
  it('returns null values when threshold fields are absent', () => {
    expect(parseCapabilityThresholdContextFields({})).toEqual({
      preferredCurrency: null,
      conversionEndpointUrl: null,
    });
  });

  it('parses preferred currency and conversion endpoint when provided', () => {
    expect(
      parseCapabilityThresholdContextFields({
        preferred_currency: 'USD',
        conversion_endpoint_url:
          'https://example.com/v1/standard/mb-v1/messages/public/a/conversion',
      })
    ).toEqual({
      preferredCurrency: 'USD',
      conversionEndpointUrl: 'https://example.com/v1/standard/mb-v1/messages/public/a/conversion',
    });
  });

  it('ignores deprecated field minimum_message_amount_minor (not part of capability contract)', () => {
    expect(
      parseCapabilityThresholdContextFields({
        preferred_currency: 'EUR',
        minimum_message_amount_minor: -1,
      })
    ).toEqual({
      preferredCurrency: 'EUR',
      conversionEndpointUrl: null,
    });
  });

  it('rejects invalid conversion_endpoint_url values', () => {
    expect(() =>
      parseCapabilityThresholdContextFields({
        conversion_endpoint_url: 'not-a-url',
      })
    ).toThrow('conversion_endpoint_url');
  });
});
