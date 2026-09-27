import type { MobileBillingMode } from '../config/billingEnv';
import type { BillingBackend } from './BillingClient';

export type BillingPlatformChoice = 'android' | 'ios' | 'other';

/**
 * The fake client runs only in a Metro dev build with the E2E flag, so a release binary cannot
 * post test-processor payments. FOSS / unavailable builds never select StoreKit or Play. Any
 * other platform has no store sheet.
 */
export const selectBillingBackend = (input: {
  billingMode: MobileBillingMode;
  isDev: boolean;
  isE2e: boolean;
  platform: BillingPlatformChoice;
}): BillingBackend => {
  if (input.isDev && input.isE2e) {
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
