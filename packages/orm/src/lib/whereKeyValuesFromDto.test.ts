import { IsNull } from 'typeorm';
import { describe, expect, it } from 'vitest';

import { normalizeWhereKeyValues, whereKeyValuesFromDto } from './whereKeyValuesFromDto.js';

describe('whereKeyValuesFromDto', () => {
  it('maps explicit null to IsNull() for included where keys', () => {
    const result = whereKeyValuesFromDto(['type', 'bitrate'], {
      type: 'audio/mpeg',
      bitrate: null,
    });

    expect(result.type).toBe('audio/mpeg');
    expect(result.bitrate).toEqual(IsNull());
  });

  it('omits undefined values and does not include missing keys', () => {
    type EnclosureWhereDto = {
      type: string;
      bitrate: number | null | undefined;
      item_guid: string | null | undefined;
    };

    const result = whereKeyValuesFromDto<EnclosureWhereDto>(['type', 'bitrate', 'item_guid'], {
      type: 'audio/mpeg',
      bitrate: undefined,
    });

    expect(result).toEqual({ type: 'audio/mpeg' });
  });

  it('maps podroll identity fields with null item_guid', () => {
    const result = whereKeyValuesFromDto(['feed_guid', 'feed_url', 'item_guid'], {
      feed_guid: 'guid-1',
      feed_url: 'https://example.com/feed',
      item_guid: null,
    });

    expect(result.feed_guid).toBe('guid-1');
    expect(result.feed_url).toBe('https://example.com/feed');
    expect(result.item_guid).toEqual(IsNull());
  });
});

describe('normalizeWhereKeyValues', () => {
  it('maps null entries in a plain where map to IsNull()', () => {
    const result = normalizeWhereKeyValues({
      type: 'audio/mpeg',
      bitrate: null,
    });

    expect(result.bitrate).toEqual(IsNull());
  });
});
