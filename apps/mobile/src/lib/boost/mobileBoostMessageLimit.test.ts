import { describe, expect, it } from 'vitest';

import {
  BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT,
  mobileBoostMessageMaxLength,
} from './mobileBoostMessageLimit';

describe('mobileBoostMessageMaxLength', () => {
  it('caps a channel with no MetaBoost node at 400', () => {
    expect(BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT).toBe(400);
    expect(mobileBoostMessageMaxLength(false, { messageCharLimit: null, status: 'error' })).toBe(
      400
    );
  });

  it('uses a successful capability limit', () => {
    expect(mobileBoostMessageMaxLength(true, { messageCharLimit: 280, status: 'success' })).toBe(
      280
    );
    expect(mobileBoostMessageMaxLength(true, { messageCharLimit: 280.9, status: 'success' })).toBe(
      280
    );
    expect(mobileBoostMessageMaxLength(true, { messageCharLimit: 0, status: 'success' })).toBe(0);
  });

  it('leaves the field uncapped until a successful limit arrives', () => {
    expect(mobileBoostMessageMaxLength(true, { messageCharLimit: null, status: 'success' })).toBe(
      undefined
    );
    expect(mobileBoostMessageMaxLength(true, { messageCharLimit: 280, status: 'loading' })).toBe(
      undefined
    );
    expect(mobileBoostMessageMaxLength(true, { messageCharLimit: 280, status: 'error' })).toBe(
      undefined
    );
    expect(mobileBoostMessageMaxLength(true, { messageCharLimit: null, status: 'idle' })).toBe(
      undefined
    );
    expect(mobileBoostMessageMaxLength(true, { messageCharLimit: -1, status: 'success' })).toBe(
      undefined
    );
    expect(
      mobileBoostMessageMaxLength(true, {
        messageCharLimit: Number.POSITIVE_INFINITY,
        status: 'success',
      })
    ).toBe(undefined);
  });
});
