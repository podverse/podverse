import { describe, expect, it } from 'vitest';

import {
  buildMb1CreateBoostRequest,
  isMetaboostMb1CreateBoostResponse,
  MB1_FORBIDDEN_LEGACY_BODY_KEYS,
  mb1ConfirmPaymentUrlFromBoostPostUrl,
} from './mb1CreateBoost.js';

describe('buildMb1CreateBoostRequest', () => {
  it('produces MB1 ingest fields and omits legacy Blip keys', () => {
    const body = buildMb1CreateBoostRequest({
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
    for (const key of MB1_FORBIDDEN_LEGACY_BODY_KEYS) {
      expect(serialized.includes(`"${key}"`)).toBe(false);
    }
  });

  it('omits item fields when guid/title pair is incomplete', () => {
    const body = buildMb1CreateBoostRequest({
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

describe('mb1ConfirmPaymentUrlFromBoostPostUrl', () => {
  it('appends confirm-payment to boost URL', () => {
    expect(mb1ConfirmPaymentUrlFromBoostPostUrl('http://localhost:4000/v1/s/mb1/boost/abc/')).toBe(
      'http://localhost:4000/v1/s/mb1/boost/abc/confirm-payment'
    );
  });
});

describe('isMetaboostMb1CreateBoostResponse', () => {
  it('accepts Metaboost create response shape', () => {
    expect(
      isMetaboostMb1CreateBoostResponse({ message_guid: '550e8400-e29b-41d4-a716-446655440000' })
    ).toBe(true);
    expect(isMetaboostMb1CreateBoostResponse({ id: 'x', url: 'y', desc: 'z' })).toBe(false);
  });
});
