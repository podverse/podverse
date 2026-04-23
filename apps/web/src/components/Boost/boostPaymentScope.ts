/**
 * Boost payment flows are mutually exclusive:
 * - `app_only`: /donate — app Lightning recipient only; never creator totals or payments.
 * - `creator_only`: episode/item boost — value-tag creators only; never app recipient or app totals.
 */
export type BoostPaymentScope = 'app_only' | 'creator_only';

/** Local-settings key for /donate amounts; must not collide with episode value-tab keys like `lightning`. */
export const DONATE_APP_BOOST_VALUE_KEY = 'donate-app-lightning';
