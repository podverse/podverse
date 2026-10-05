import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import type { CheckoutMode } from './checkoutUrl';
import { buildCheckoutUrl, buildWebPathUrl } from './checkoutUrl';

/**
 * Web hand-off for sign-up and for PayPal checkout. Store purchases stay on the Membership screen.
 * URL building lives in `checkoutUrl` (pure).
 *
 * Opens in an in-app browser (`expo-web-browser`); falls back to the system browser (`Linking`) if the
 * in-app browser is unavailable.
 */
export type { CheckoutMode } from './checkoutUrl';
export { buildCheckoutUrl, buildWebPathUrl } from './checkoutUrl';

const openUrl = async (url: string): Promise<void> => {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
};

/** Open the web sign-up (logged-out) or checkout (logged-in) page in an in-app browser. */
export const openCheckout = async ({ mode }: { mode: CheckoutMode }): Promise<void> => {
  await openUrl(buildCheckoutUrl(mode));
};

/** Open a path on the public web origin, such as the terms page. */
export const openWebPath = async (path: string): Promise<void> => {
  await openUrl(buildWebPathUrl(path));
};
