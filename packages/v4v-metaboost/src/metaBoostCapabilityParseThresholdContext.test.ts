import { describe, expect, it } from 'vitest';

import { parseCapabilityThresholdContextFields } from './metaBoostCapabilityParseThresholdContext.js';

describe('parseCapabilityThresholdContextFields', () => {
  it('returns null values when threshold fields are absent', () => {
    expect(parseCapabilityThresholdContextFields({})).toEqual({
      preferredCurrency: null,
      minimumMessageAmountMinor: null,
      conversionEndpointUrl: null,
    });
  });

  it('parses threshold fields when provided', () => {
    expect(
      parseCapabilityThresholdContextFields({
        preferred_currency: 'USD',
        minimum_message_amount_minor: 200,
        conversion_endpoint_url:
          'https://example.com/v1/standard/mb-v1/messages/public/a/conversion',
      })
    ).toEqual({
      preferredCurrency: 'USD',
      minimumMessageAmountMinor: 200,
      conversionEndpointUrl: 'https://example.com/v1/standard/mb-v1/messages/public/a/conversion',
    });
  });

  it('rejects invalid minimum_message_amount_minor values', () => {
    expect(() =>
      parseCapabilityThresholdContextFields({
        minimum_message_amount_minor: -1,
      })
    ).toThrow('minimum_message_amount_minor');

    expect(() =>
      parseCapabilityThresholdContextFields({
        minimum_message_amount_minor: 1.5,
      })
    ).toThrow('minimum_message_amount_minor');
  });

  it('rejects invalid conversion_endpoint_url values', () => {
    expect(() =>
      parseCapabilityThresholdContextFields({
        conversion_endpoint_url: 'not-a-url',
      })
    ).toThrow('conversion_endpoint_url');
  });
});
