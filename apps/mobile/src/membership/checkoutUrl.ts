import { getMobileConfig } from '../config';

/**
 * Pure (RN-free) URL building for the membership purchase hand-off. Kept separate from
 * `checkoutEntry` (which imports `react-native`) so the path constants and URL logic are node-testable
 * and live in one place.
 */
export type CheckoutMode = 'sign_up' | 'extend';

/** Web routes for the hand-off. */
const CHECKOUT_WEB_PATHS: Record<CheckoutMode, string> = {
  extend: '/checkout',
  sign_up: '/sign-up',
};

/** Build the absolute web URL for a checkout mode from the configured public web base URL. */
export const buildCheckoutUrl = (mode: CheckoutMode): string => {
  const base = getMobileConfig().webBaseUrl.replace(/\/+$/, '');
  return `${base}${CHECKOUT_WEB_PATHS[mode]}`;
};
