import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import type { CheckoutMode } from './checkoutUrl';
import { buildCheckoutUrl } from './checkoutUrl';

/**
 * Membership purchase hand-off. The Membership screen routes purchases to the **web** flow. This
 * module is the single web-vs-native seam; URL building lives in `checkoutUrl` (pure).
 *
 * Opens in an in-app browser (`expo-web-browser`); falls back to the system browser (`Linking`) if the
 * in-app browser is unavailable.
 */
export type { CheckoutMode } from './checkoutUrl';
export { buildCheckoutUrl } from './checkoutUrl';

/** Open the web sign-up (logged-out) or checkout (logged-in) page in an in-app browser. */
export const openCheckout = async ({ mode }: { mode: CheckoutMode }): Promise<void> => {
  const url = buildCheckoutUrl(mode);
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
};
