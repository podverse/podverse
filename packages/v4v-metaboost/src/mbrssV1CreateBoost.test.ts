import { describe, expect, it } from 'vitest';

import { BLIP0010_BTC_LN_BOOST_JSON_KEYS } from './blip0010BtcLnBoostJsonKeys.js';
import {
  buildMbrssV1CreateBoostRequest,
  isMetaboostMbrssV1CreateBoostResponse,
} from './mbrssV1CreateBoost.js';

describe('buildMbrssV1CreateBoostRequest', () => {
  it('produces mbrss-v1 ingest fields only (no bLIP-0010 BTC/LN keysend JSON keys)', () => {
    const body = buildMbrssV1CreateBoostRequest({
      totalMsat: 5_000_000,
      appName: 'Podverse',
      action: 'boost',
      feedGuid: 'urn:guid:feed',
      feedTitle: 'Test feed',
      message: 'Hello',
      yourName: 'Alice',
      itemGuid: 'https://example.com/ep1',
      itemTitle: 'Episode 1',
    });

    expect(body.currency).toBe('BTC');
    expect(body.amount).toBe(5000);
    expect(body.amount_unit).toBe('satoshis');
    expect(body.action).toBe('boost');
    expect(body.app_name).toBe('Podverse');
    expect(body.feed_guid).toBe('urn:guid:feed');
    expect(body.feed_title).toBe('Test feed');
    expect(body.message).toBe('Hello');
    expect(body.sender_name).toBe('Alice');
    expect(body.item_guid).toBe('https://example.com/ep1');
    expect(body.item_title).toBe('Episode 1');

    const serialized = JSON.stringify(body);
    for (const key of BLIP0010_BTC_LN_BOOST_JSON_KEYS) {
      expect(serialized.includes(`"${key}"`)).toBe(false);
    }
  });

  it('omits item fields when guid/title pair is incomplete', () => {
    const body = buildMbrssV1CreateBoostRequest({
      totalMsat: 1_000,
      appName: 'Podverse',
      action: 'boost',
      feedGuid: 'urn:guid:feed',
      feedTitle: 'Test feed',
      message: '',
      yourName: '',
      itemGuid: 'only-guid',
    });

    expect(body.item_guid).toBeUndefined();
    expect(body.item_title).toBeUndefined();
  });
});

describe('isMetaboostMbrssV1CreateBoostResponse', () => {
  it('accepts Metaboost create response shape', () => {
    expect(
      isMetaboostMbrssV1CreateBoostResponse({
        message_guid: '550e8400-e29b-41d4-a716-446655440000',
      })
    ).toBe(true);
    expect(isMetaboostMbrssV1CreateBoostResponse({ id: 'x', url: 'y', desc: 'z' })).toBe(false);
  });
});
