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

const webOrigin = (): string => getMobileConfig().webBaseUrl.replace(/\/+$/, '');

/** Build the absolute web URL for a checkout mode from the configured public web base URL. */
export const buildCheckoutUrl = (mode: CheckoutMode): string =>
  `${webOrigin()}${CHECKOUT_WEB_PATHS[mode]}`;

/** Absolute URL for a path on the public web origin, such as the terms page. */
export const buildWebPathUrl = (path: string): string => {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${webOrigin()}${suffix}`;
};
