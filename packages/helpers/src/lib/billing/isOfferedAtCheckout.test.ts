import { describe, expect, it } from 'vitest';

import { isOfferedAtCheckout } from './isOfferedAtCheckout.js';

describe('isOfferedAtCheckout', () => {
  it('offers PayPal one-time and auto-renew, and store processors auto-renew only', () => {
    expect(isOfferedAtCheckout('paypal', 'one_time')).toBe(true);
    expect(isOfferedAtCheckout('paypal', 'auto_renew')).toBe(true);
    expect(isOfferedAtCheckout('apple', 'auto_renew')).toBe(true);
    expect(isOfferedAtCheckout('google_play', 'auto_renew')).toBe(true);
    expect(isOfferedAtCheckout('test', 'auto_renew')).toBe(true);
    expect(isOfferedAtCheckout('apple', 'one_time')).toBe(false);
    expect(isOfferedAtCheckout('google_play', 'one_time')).toBe(false);
    expect(isOfferedAtCheckout('test', 'one_time')).toBe(false);
  });
});
