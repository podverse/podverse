import { describe, expect, it } from 'vitest';

import { mobileBoostPaymentDescription } from './mobileBoostPaymentDescription';

describe('mobileBoostPaymentDescription', () => {
  it('uses the trimmed message', () => {
    expect(mobileBoostPaymentDescription('hello', 'Podverse Next')).toBe('hello');
    expect(mobileBoostPaymentDescription('  hello  ', 'Podverse Next')).toBe('hello');
  });

  it('uses the app name when the message is blank', () => {
    expect(mobileBoostPaymentDescription('  ', 'Podverse Next')).toBe('Podverse Next boost');
    expect(mobileBoostPaymentDescription('', 'Podverse Next')).toBe('Podverse Next boost');
  });
});
