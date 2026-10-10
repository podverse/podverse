import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { DTOBillingStatus } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { createMobileApiRequestService } from '../auth/mobileApi';
import { createBillingApi } from '../billing/billingApi';
import type {
  BillingClient,
  BillingLocalizedPrice,
  BillingPurchaseOutcome,
} from '../billing/BillingClient';
import { createBillingClient } from '../billing/createBillingClient';
import { accountRepository } from '../data/repositories/accountRepository';
import type { MoreStackParamList } from '../navigation';
import { MORE_STACK_ROUTES } from '../navigation';
import type {
  CheckoutProcessorOffer,
  CheckoutProductOffer,
  StoreCheckoutCadence,
  StoreCheckoutMode,
} from './storeCheckout';
import {
  availableCadences,
  checkoutProduct,
  isClientUpdateRequired,
  mapCheckoutProcessors,
  offersProcessor,
  resolveStoreCheckoutMode,
  storeProcessorId,
} from './storeCheckout';

export type CheckoutNotice = 'failed' | 'success' | 'waiting';
export type CheckoutNoticeSource = 'purchase' | 'restore';

export type CatalogPricing = {
  annuallySavingsPercent: number;
  costAnnually: number;
  costMonthly: number;
};

/**
 * One billing client for the signed-in membership screen. The store listener attaches when the
 * client is created; a second visit reuses it so the listener is not registered again.
 * Token fields are written on each render so a refresh is visible to the next request.
 */
const screenAuthDeps: AuthRequestDeps = {
  accessToken: null,
  clearSession: () => Promise.resolve(),
  refreshToken: null,
  setTokens: () => Promise.resolve(),
};

let screenBillingClient: BillingClient | null = null;

const billingClient = (): BillingClient => {
  if (screenBillingClient === null) {
    screenBillingClient = createBillingClient(screenAuthDeps);
  }
  return screenBillingClient;
};

const checkoutPlatform = (): 'android' | 'ios' | null => {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  return null;
};

export type UseStoreCheckoutResult = {
  cadence: StoreCheckoutCadence | undefined;
  cadences: StoreCheckoutCadence[];
  catalogPricing: CatalogPricing | null;
  checkoutMode: StoreCheckoutMode;
  dismissUpdate: () => void;
  loading: boolean;
  notice: CheckoutNotice | null;
  noticeSource: CheckoutNoticeSource | null;
  onPurchase: () => void;
  onRestore: () => void;
  platform: 'android' | 'ios' | null;
  prices: readonly BillingLocalizedPrice[];
  processorId: 'apple' | 'google_play' | 'test' | null;
  processors: readonly CheckoutProcessorOffer[];
  product: CheckoutProductOffer | null;
  ready: boolean;
  selectCadence: (cadence: StoreCheckoutCadence) => void;
  showPayPal: boolean;
  storeOffered: boolean;
  storePurchases: boolean;
  submitting: boolean;
  updateDialogVisible: boolean;
  updateRequired: boolean;
};

export const useStoreCheckout = (): UseStoreCheckoutResult => {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { accessToken, clearSession, refreshToken, setAccount, setTokens } = useAuth();
  const platform = checkoutPlatform();
  screenAuthDeps.accessToken = accessToken;
  screenAuthDeps.clearSession = clearSession;
  screenAuthDeps.refreshToken = refreshToken;
  screenAuthDeps.setTokens = setTokens;
  const setAccountRef = useRef(setAccount);
  setAccountRef.current = setAccount;
  const client = billingClient();
  const storePurchases = client.backend !== 'unavailable';
  const processorId = storeProcessorId(client.backend);

  const [loading, setLoading] = useState(platform !== null);
  const [processors, setProcessors] = useState<readonly CheckoutProcessorOffer[]>([]);
  const [prices, setPrices] = useState<readonly BillingLocalizedPrice[]>([]);
  const [catalogPricing, setCatalogPricing] = useState<CatalogPricing | null>(null);
  const [cadence, setCadence] = useState<StoreCheckoutCadence>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<CheckoutNotice | null>(null);
  const [noticeSource, setNoticeSource] = useState<CheckoutNoticeSource | null>(null);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateDialogVisible, setUpdateDialogVisible] = useState(false);

  useEffect(() => {
    if (platform === null) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      const pricingApi = createMobileApiRequestService();
      const pricingRequest =
        pricingApi === null
          ? Promise.resolve(null)
          : pricingApi.reqProductMembershipGet().catch(() => null);
      try {
        if (client.backend !== 'unavailable') {
          await client.syncUnfinishedTransactions().catch(() => undefined);
        }
        let storefront: string | null = null;
        if (client.backend !== 'unavailable') {
          try {
            storefront = await client.getStorefront();
          } catch {
            storefront = null;
          }
        }
        const billingApi = createBillingApi(screenAuthDeps);
        let nextStatus: DTOBillingStatus | null = null;
        let mapped: CheckoutProcessorOffer[] = [];
        try {
          const options = await billingApi.getCheckoutOptions({ platform, storefront });
          mapped = mapCheckoutProcessors(options);
        } catch {
          mapped = [];
        }
        try {
          nextStatus = await billingApi.getMembershipStatus(platform);
        } catch {
          nextStatus = null;
        }
        const pricingResponse = await pricingRequest;
        if (!active) {
          return;
        }
        const nextCatalog =
          pricingResponse !== null && 'data' in pricingResponse
            ? {
                annuallySavingsPercent: pricingResponse.data.annuallySavingsPercent,
                costAnnually: pricingResponse.data.premiumMembershipCostAnnually,
                costMonthly: pricingResponse.data.premiumMembershipCostMonthly,
              }
            : null;
        const catalogReady =
          nextCatalog !== null &&
          Number.isFinite(nextCatalog.costMonthly) &&
          Number.isFinite(nextCatalog.costAnnually);
        setProcessors(mapped);
        setCatalogPricing(catalogReady ? nextCatalog : null);
        const enrolled = nextStatus?.billing_cadence;
        if (enrolled === 'monthly' || enrolled === 'annual') {
          setCadence(enrolled);
        }
        if (catalogReady || client.backend === 'unavailable') {
          return;
        }
        const productIds = mapped.flatMap((processor) =>
          processor.products.map((product) => product.externalProductId)
        );
        if (productIds.length === 0) {
          return;
        }
        try {
          const nextPrices = await client.listPrices(productIds);
          if (active) {
            setPrices(nextPrices);
          }
        } catch {
          if (active) {
            setPrices([]);
          }
        }
      } catch {
        if (active) {
          setProcessors([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [client, platform]);

  const cadences = processorId === null ? [] : availableCadences(processors, processorId);
  const selectedCadence = cadences.includes(cadence) ? cadence : cadences[0];
  const product =
    processorId === null || selectedCadence === undefined
      ? null
      : checkoutProduct(processors, processorId, selectedCadence);
  const showPayPal = offersProcessor(processors, 'paypal');
  const storeOffered = processorId !== null && offersProcessor(processors, processorId);
  const checkoutMode = resolveStoreCheckoutMode({
    backend: client.backend,
    processors,
  });
  const ready = !loading && product !== null;

  useEffect(() => {
    if (selectedCadence !== undefined && selectedCadence !== cadence) {
      setCadence(selectedCadence);
    }
  }, [cadence, selectedCadence]);

  const refreshAccount = async () => {
    if (screenAuthDeps.accessToken === null) {
      return;
    }
    try {
      const account = await accountRepository.refreshSnapshot(screenAuthDeps);
      setAccountRef.current(account);
    } catch {
      // The purchase is already recorded. The next account refresh picks up the new expiry.
    }
  };

  const applyOutcome = async (
    outcome: BillingPurchaseOutcome,
    source: CheckoutNoticeSource
  ): Promise<void> => {
    if (isClientUpdateRequired(outcome.errorCode)) {
      setUpdateRequired(true);
      setUpdateDialogVisible(true);
      setNotice(null);
      return;
    }
    if (outcome.phase === 'cancelled') {
      return;
    }
    if (outcome.phase === 'confirmed') {
      await refreshAccount();
      if (source === 'purchase') {
        navigation.popTo(MORE_STACK_ROUTES.MoreMembership);
        return;
      }
      setNotice('success');
      return;
    }
    if (outcome.phase === 'waiting') {
      setNotice('waiting');
      return;
    }
    setNotice('failed');
  };

  const onPurchase = () => {
    if (product === null) {
      return;
    }
    setSubmitting(true);
    setNotice(null);
    setNoticeSource('purchase');
    void client
      .purchase({
        basePlanId: product.basePlanId,
        productId: product.externalProductId,
      })
      .then((outcome) => applyOutcome(outcome, 'purchase'))
      .catch(() => {
        setNotice('failed');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const onRestore = () => {
    setSubmitting(true);
    setNotice(null);
    setNoticeSource('restore');
    void client
      .restore()
      .then((outcome) => applyOutcome(outcome, 'restore'))
      .catch(() => {
        setNotice('failed');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return {
    cadence: selectedCadence,
    cadences,
    catalogPricing,
    checkoutMode,
    dismissUpdate: () => {
      setUpdateDialogVisible(false);
    },
    loading,
    notice,
    noticeSource,
    onPurchase,
    onRestore,
    platform,
    prices,
    processorId,
    processors,
    product,
    ready,
    selectCadence: setCadence,
    showPayPal,
    storeOffered,
    storePurchases,
    submitting,
    updateDialogVisible,
    updateRequired,
  };
};
