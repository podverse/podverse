import { describe, expect, it } from 'vitest';

import {
  buildMbV1CreateBoostRequest,
  isMetaboostMbV1CreateBoostResponse,
} from './mbV1CreateBoost.js';

describe('buildMbV1CreateBoostRequest', () => {
  it('builds required mb-v1 request fields for boost action', () => {
    const body = buildMbV1CreateBoostRequest({
      totalMsat: 5_000_000,
      appName: 'Podverse',
      action: 'boost',
      message: 'Hello mb-v1',
      yourName: 'Alice',
      appVersion: '1.2.3',
    });

    expect(body).toEqual({
      currency: 'BTC',
      amount: 5000,
      amount_unit: 'satoshi',
      action: 'boost',
      app_name: 'Podverse',
      app_version: '1.2.3',
      sender_name: 'Alice',
      message: 'Hello mb-v1',
    });
  });

  it('sets message to null for stream action', () => {
    const body = buildMbV1CreateBoostRequest({
      totalMsat: 1000,
      appName: 'Podverse',
      action: 'stream',
      message: 'ignored',
      yourName: 'Alice',
    });

    expect(body.message).toBeNull();
  });

  it('omits optional fields when blank', () => {
    const body = buildMbV1CreateBoostRequest({
      totalMsat: 2000,
      appName: 'Podverse',
      action: 'boost',
      message: '',
      yourName: '   ',
      appVersion: '   ',
    });

    expect(body.sender_name).toBeUndefined();
    expect(body.app_version).toBeUndefined();
    expect(body.message).toBeUndefined();
  });

  it('throws when amount is zero or negative', () => {
    expect(() =>
      buildMbV1CreateBoostRequest({
        totalMsat: 0,
        appName: 'Podverse',
        action: 'boost',
        message: 'x',
        yourName: 'y',
      })
    ).toThrow(/positive/i);

    expect(() =>
      buildMbV1CreateBoostRequest({
        totalMsat: -1,
        appName: 'Podverse',
        action: 'boost',
        message: 'x',
        yourName: 'y',
      })
    ).toThrow(/positive/i);
  });
});

describe('isMetaboostMbV1CreateBoostResponse', () => {
  it('accepts valid response payload', () => {
    expect(
      isMetaboostMbV1CreateBoostResponse({
        message_guid: '550e8400-e29b-41d4-a716-446655440000',
      })
    ).toBe(true);
  });

  it('rejects invalid payload', () => {
    expect(isMetaboostMbV1CreateBoostResponse({ message_guid: '' })).toBe(false);
    expect(isMetaboostMbV1CreateBoostResponse({})).toBe(false);
  });
});
