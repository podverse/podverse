import type { MobileBillingMode } from '../config/billingEnv';
import type { BillingBackend } from './BillingClient';

export type BillingPlatformChoice = 'android' | 'ios' | 'other';

/**
 * E2E uses the fake client so a Maestro run never opens a store sheet. FOSS / unavailable builds
 * never select StoreKit or Play. Any other platform has no store sheet.
 */
export const selectBillingBackend = (input: {
  billingMode: MobileBillingMode;
  isE2e: boolean;
  platform: BillingPlatformChoice;
}): BillingBackend => {
  if (input.isE2e) {
    return 'fake';
  }
  if (input.billingMode === 'unavailable') {
    return 'unavailable';
  }
  if (input.platform === 'ios') {
    return 'storekit';
  }
  if (input.platform === 'android') {
    return 'play';
  }
  return 'unavailable';
};
