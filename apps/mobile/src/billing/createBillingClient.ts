import { Platform } from 'react-native';

import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { getMobileConfig } from '../config';
import type { BillingApi } from './billingApi';
import { createBillingApi } from './billingApi';
import type { BillingBackend, BillingClient } from './BillingClient';
import { createFakeBillingClient } from './fakeBillingClient';
import type { BillingPlatformChoice } from './selectBillingBackend';
import { selectBillingBackend } from './selectBillingBackend';
import { createUnavailableBillingClient } from './unavailableBillingClient';

const platformChoice = (): BillingPlatformChoice => {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  return 'other';
};

const loadStoreClient = async (api: BillingApi): Promise<BillingClient> => {
  if (Platform.OS === 'ios') {
    const { createStorekitBillingClient } = await import('./storekitBillingClient');
    return createStorekitBillingClient(api);
  }
  if (Platform.OS === 'android') {
    const { createPlayBillingClient } = await import('./playBillingClient');
    return createPlayBillingClient(api);
  }
  return createUnavailableBillingClient();
};

const createLazyStoreClient = (api: BillingApi, backend: BillingBackend): BillingClient => {
  let inner: Promise<BillingClient> | null = null;
  const load = (): Promise<BillingClient> => {
    if (inner === null) {
      inner = loadStoreClient(api).catch((error: unknown) => {
        inner = null;
        throw error;
      });
    }
    return inner;
  };

  // Attach the store listener as soon as the client exists. Unfinished transactions are posted
  // when `syncUnfinishedTransactions` runs, after a session is available.
  void load().catch(() => undefined);

  return {
    backend,
    bindAccount: async () => (await load()).bindAccount(),
    getStorefront: async () => (await load()).getStorefront(),
    listPrices: async (productIds) => (await load()).listPrices(productIds),
    purchase: async (product) => (await load()).purchase(product),
    restore: async () => (await load()).restore(),
    syncUnfinishedTransactions: async () => (await load()).syncUnfinishedTransactions(),
  };
};

/** Fake under the E2E harness, unavailable on FOSS, otherwise the platform store. */
export const createBillingClient = (deps: AuthRequestDeps): BillingClient => {
  const config = getMobileConfig();
  const backend = selectBillingBackend({
    billingMode: config.billingMode,
    isE2e: config.isE2e,
    platform: platformChoice(),
  });
  if (backend === 'fake') {
    return createFakeBillingClient(createBillingApi(deps));
  }
  if (backend === 'unavailable') {
    return createUnavailableBillingClient();
  }
  return createLazyStoreClient(createBillingApi(deps), backend);
};
