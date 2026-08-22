import { getMobileConfig } from '../config';

/**
 * Pure (RN-free) URL building for the membership purchase hand-off (Track 19). Kept separate from
 * `checkoutEntry` (which imports `react-native`) so the path constants + URL logic are node-testable and
 * live in one place — the single seam a future native-IAP swap (master plan 19.2–19.5) edits.
 */
export type CheckoutMode = 'sign_up' | 'extend';

/** Web routes for the hand-off, centralized so the native-IAP swap touches one place. */
const CHECKOUT_WEB_PATHS: Record<CheckoutMode, string> = {
  extend: '/checkout',
  sign_up: '/sign-up',
};

/** Build the absolute web URL for a checkout mode from the configured public web base URL. */
export const buildCheckoutUrl = (mode: CheckoutMode): string => {
  const base = getMobileConfig().webBaseUrl.replace(/\/+$/, '');
  return `${base}${CHECKOUT_WEB_PATHS[mode]}`;
};
