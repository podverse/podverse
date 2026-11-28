import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { DTOAccount, DTOBillingStatus } from '@podverse/helpers';
import { deriveMembershipState } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { createBillingApi } from '../billing/billingApi';
import type {
  BillingClient,
  BillingLocalizedPrice,
  BillingPurchaseOutcome,
} from '../billing/BillingClient';
import { createBillingClient } from '../billing/createBillingClient';
import { accountWithBillingStatus } from '../billing/purchaseStanding';
import { loadPublicClientConfig } from '../config/publicClientConfig';
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
  cadenceAfterGrantedCheckout,
  checkoutOptionsRequest,
  checkoutPlanProcessorId,
  checkoutProduct,
  isClientUpdateRequired,
  mapCheckoutProcessors,
  offersProcessor,
  resolveStoreCheckoutMode,
  showsStrikeInvoice,
  showsStrikeWebLink,
  storeProcessorId,
} from './storeCheckout';

export type CheckoutNotice = 'failed' | 'not_applied' | 'success' | 'waiting';
export type CheckoutNoticeSource = 'purchase' | 'restore';

/** How long a granted purchase or restore stays on screen before Membership opens. */
const SUCCESS_REDIRECT_DELAY_MS = 4_000;

export type ConfirmedPurchase = {
  cadence: StoreCheckoutCadence;
  expiresAt: string | null;
};

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
  confirmedPurchase: ConfirmedPurchase | null;
  dismissUpdate: () => void;
  failCheckout: () => void;
  loading: boolean;
  notice: CheckoutNotice | null;
  noticeSource: CheckoutNoticeSource | null;
  openMembership: () => void;
  onPurchase: () => void;
  onRestore: () => void;
  onStrikeSettled: () => void;
  platform: 'android' | 'ios' | null;
  prices: readonly BillingLocalizedPrice[];
  processorId: 'apple' | 'google_play' | 'test' | null;
  processors: readonly CheckoutProcessorOffer[];
  product: CheckoutProductOffer | null;
  ready: boolean;
  returningToMembership: boolean;
  selectCadence: (cadence: StoreCheckoutCadence) => void;
  showPayPal: boolean;
  showStrikeInvoice: boolean;
  showStrikeLink: boolean;
  storeOffered: boolean;
  storePurchases: boolean;
  submitting: boolean;
  updateDialogVisible: boolean;
  updateRequired: boolean;
};

export const useStoreCheckout = (): UseStoreCheckoutResult => {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { accessToken, account, clearSession, refreshToken, setAccount, setTokens } = useAuth();
  const platform = checkoutPlatform();
  screenAuthDeps.accessToken = accessToken;
  screenAuthDeps.clearSession = clearSession;
  screenAuthDeps.refreshToken = refreshToken;
  screenAuthDeps.setTokens = setTokens;
  const setAccountRef = useRef(setAccount);
  setAccountRef.current = setAccount;
  const accountRef = useRef(account);
  accountRef.current = account;
  const client = billingClient();
  const storePurchases = client.backend !== 'unavailable';
  const processorId = storeProcessorId(client.backend);

  const [loading, setLoading] = useState(
    checkoutOptionsRequest({
      backend: client.backend,
      devicePlatform: platform,
      storefront: null,
    }) !== null
  );
  const [processors, setProcessors] = useState<readonly CheckoutProcessorOffer[]>([]);
  const [prices, setPrices] = useState<readonly BillingLocalizedPrice[]>([]);
  const [catalogPricing, setCatalogPricing] = useState<CatalogPricing | null>(null);
  const [cadence, setCadence] = useState<StoreCheckoutCadence>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<CheckoutNotice | null>(null);
  const [noticeSource, setNoticeSource] = useState<CheckoutNoticeSource | null>(null);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateDialogVisible, setUpdateDialogVisible] = useState(false);
  const [confirmedPurchase, setConfirmedPurchase] = useState<ConfirmedPurchase | null>(null);
  const [returningToMembership, setReturningToMembership] = useState(false);
  const purchasedCadenceRef = useRef<StoreCheckoutCadence | null>(null);

  useEffect(() => {
    if (
      checkoutOptionsRequest({
        backend: client.backend,
        devicePlatform: platform,
        storefront: null,
      }) === null
    ) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      const pricingRequest = loadPublicClientConfig();
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
        const optionsRequest = checkoutOptionsRequest({
          backend: client.backend,
          devicePlatform: platform,
          storefront,
        });
        if (optionsRequest !== null) {
          try {
            const options = await billingApi.getCheckoutOptions(optionsRequest);
            mapped = mapCheckoutProcessors(options);
          } catch {
            mapped = [];
          }
        }
        try {
          nextStatus = await billingApi.getMembershipStatus(platform ?? undefined);
        } catch {
          nextStatus = null;
        }
        const publicConfig = await pricingRequest;
        if (!active) {
          return;
        }
        const nextCatalog =
          publicConfig === null
            ? null
            : {
                annuallySavingsPercent: publicConfig.membership.annuallySavingsPercent,
                costAnnually: publicConfig.membership.premiumMembershipCostAnnually,
                costMonthly: publicConfig.membership.premiumMembershipCostMonthly,
              };
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

  const planProcessorId = checkoutPlanProcessorId(processorId, processors);
  const cadences = planProcessorId === null ? [] : availableCadences(processors, planProcessorId);
  const selectedCadence = cadences.includes(cadence) ? cadence : cadences[0];
  const product =
    planProcessorId === null || selectedCadence === undefined
      ? null
      : checkoutProduct(processors, planProcessorId, selectedCadence);
  const showPayPal = offersProcessor(processors, 'paypal');
  const strikeOffered = offersProcessor(processors, 'strike');
  const showStrikeInvoice = showsStrikeInvoice({
    backend: client.backend,
    strikeOffered,
  });
  const showStrikeLink = showsStrikeWebLink({
    backend: client.backend,
    strikeOffered,
  });
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

  const refreshAccount = async (): Promise<DTOAccount | null> => {
    if (screenAuthDeps.accessToken === null) {
      return null;
    }
    try {
      const refreshed = await accountRepository.refreshSnapshot(screenAuthDeps);
      setAccountRef.current(refreshed);
      accountRef.current = refreshed;
      return refreshed;
    } catch {
      // The purchase is already recorded. The next account refresh picks up the new expiry.
      return null;
    }
  };

  const rememberBillingStatus = async (
    status: DTOBillingStatus | null
  ): Promise<DTOAccount | null> => {
    const refreshed = await refreshAccount();
    const base = refreshed ?? accountRef.current;
    if (base === null || status === null) {
      return base;
    }
    const next = accountWithBillingStatus(base, status);
    setAccountRef.current(next);
    accountRef.current = next;
    try {
      await accountRepository.saveSnapshot(next);
    } catch {
      // The in-memory account already has the primary standing.
    }
    return next;
  };

  const openMembership = useCallback(() => {
    const state = navigation.getState();
    const hasMembership = state.routes.some(
      (route) => route.name === MORE_STACK_ROUTES.MoreMembership
    );
    if (hasMembership) {
      navigation.popTo(MORE_STACK_ROUTES.MoreMembership);
      return;
    }
    navigation.replace(MORE_STACK_ROUTES.MoreMembership);
  }, [navigation]);

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
      const standing = await rememberBillingStatus(outcome.billingStatus);
      if (outcome.membershipGranted === false) {
        setConfirmedPurchase(null);
        setReturningToMembership(false);
        setNotice('not_applied');
        return;
      }
      if (outcome.membershipGranted === true) {
        const cadence = cadenceAfterGrantedCheckout(
          source,
          purchasedCadenceRef.current,
          standing?.account_membership_status?.billing_cadence ?? null
        );
        if (cadence === null) {
          setConfirmedPurchase(null);
          setNotice('success');
          setReturningToMembership(true);
          return;
        }
        setReturningToMembership(false);
        setConfirmedPurchase({
          cadence,
          expiresAt: standing === null ? null : deriveMembershipState(standing).expiresAt,
        });
        return;
      }
      setReturningToMembership(false);
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
    if (product === null || selectedCadence === undefined) {
      return;
    }
    purchasedCadenceRef.current = selectedCadence;
    setConfirmedPurchase(null);
    setReturningToMembership(false);
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

  const failCheckout = () => {
    setNotice('failed');
    setNoticeSource('purchase');
  };

  const onStrikeSettled = () => {
    if (selectedCadence === undefined) {
      return;
    }
    const purchasedCadence = selectedCadence;
    void (async () => {
      let status: DTOBillingStatus | null;
      try {
        status = await createBillingApi(screenAuthDeps).getMembershipStatus(platform ?? undefined);
      } catch {
        status = null;
      }
      const standing = await rememberBillingStatus(status);
      setConfirmedPurchase({
        cadence: purchasedCadence,
        expiresAt: standing === null ? null : deriveMembershipState(standing).expiresAt,
      });
    })();
  };

  const onRestore = () => {
    setConfirmedPurchase(null);
    setReturningToMembership(false);
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

  useEffect(() => {
    if (confirmedPurchase === null && !returningToMembership) {
      return;
    }
    const timer = setTimeout(() => {
      openMembership();
    }, SUCCESS_REDIRECT_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [confirmedPurchase, openMembership, returningToMembership]);

  return {
    cadence: selectedCadence,
    cadences,
    catalogPricing,
    checkoutMode,
    confirmedPurchase,
    dismissUpdate: () => {
      setUpdateDialogVisible(false);
    },
    failCheckout,
    loading,
    notice,
    noticeSource,
    openMembership,
    onPurchase,
    onRestore,
    onStrikeSettled,
    platform,
    prices,
    processorId,
    processors,
    product,
    ready,
    returningToMembership,
    selectCadence: setCadence,
    showPayPal,
    showStrikeInvoice,
    showStrikeLink,
    storeOffered,
    storePurchases,
    submitting,
    updateDialogVisible,
    updateRequired,
  };
};
