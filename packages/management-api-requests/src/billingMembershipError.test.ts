import { describe, expect, it } from 'vitest';

import { readBillingMembershipRequestError } from './billing.js';

describe('readBillingMembershipRequestError', () => {
  it('reads the API message and access end from a conflict body', () => {
    const parsed = readBillingMembershipRequestError({
      response: {
        status: 409,
        data: {
          message: 'Paid access continues past the requested end.',
          access_ends_at: '2026-12-01T00:00:00.000Z',
        },
      },
    });
    expect(parsed).toEqual({
      status: 409,
      message: 'Paid access continues past the requested end.',
      accessEndsAt: '2026-12-01T00:00:00.000Z',
    });
  });

  it('returns null when the body is not a billing error', () => {
    expect(readBillingMembershipRequestError(new Error('network'))).toBeNull();
    expect(
      readBillingMembershipRequestError({
        response: { status: 500, data: { message: '' } },
      })
    ).toBeNull();
  });
});
