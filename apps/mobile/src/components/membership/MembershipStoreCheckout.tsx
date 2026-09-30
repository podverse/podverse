import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import type { AuthRequestDeps } from '../../auth/authRequestWithRefresh';
import { createMobileApiRequestService } from '../../auth/mobileApi';
import type { BillingCheckoutCatalog, BillingMembershipStatus } from '../../billing/billingApi';
import { createBillingApi } from '../../billing/billingApi';
import type {
  BillingClient,
  BillingLocalizedPrice,
  BillingPurchaseOutcome,
} from '../../billing/BillingClient';
import { createBillingClient } from '../../billing/createBillingClient';
import { getMobileConfig } from '../../config';
import { accountRepository } from '../../data/repositories/accountRepository';
import { openCheckout, openWebPath } from '../../membership/checkoutEntry';
import type { CheckoutProcessorOffer, StoreCheckoutCadence } from '../../membership/storeCheckout';
import {
  availableCadences,
  checkoutProduct,
  isClientUpdateRequired,
  mapCheckoutProcessors,
  offersProcessor,
  resolveStoreCheckoutMode,
  showsStackingNotice,
  storeListingUrl,
  storeProcessorId,
  subscriptionManagementUrl,
} from '../../membership/storeCheckout';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import { Accordion, Badge, Button, Card } from '../primitives';
import { ToggleSwitch } from '../primitives/ToggleSwitch';
import { LoadingSection } from '../state/LoadingSection';

type PurchaseNotice = 'failed' | 'success' | 'waiting';

type NoticeSource = 'purchase' | 'restore';

/** Public membership prices from `GET /product/membership/pricing`, the catalog web checkout uses. */
type CatalogPricing = {
  annuallySavingsPercent: number;
  costAnnually: number;
  costMonthly: number;
};

const formatCatalogUsd = (amount: number): string => {
  const dollars = Math.round(amount * 100) / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
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

/**
 * Store checkout for a signed-in member. Plan prices and the annual percent off come from
 * `GET /product/membership`, the public catalog. PayPal, when the
 * server includes it for this platform, opens web checkout. When nothing on this platform can be
 * bought, the screen tells the member how to reach the team. The terms page is the legal document
 * that describes how the service handles data, so Privacy opens that page too.
 *
 * The card stays hidden until checkout options, membership status, and that pricing catalog
 * have settled. A spinner is the only thing on screen until that frame, so rows do not appear
 * and then shift.
 */
export function MembershipStoreCheckout() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
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
  const [status, setStatus] = useState<BillingMembershipStatus | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [cadence, setCadence] = useState<StoreCheckoutCadence>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<PurchaseNotice | null>(null);
  const [noticeSource, setNoticeSource] = useState<NoticeSource | null>(null);
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
        const optionsRequest = billingApi.getCheckoutOptions({ platform, storefront });
        const statusRequest = billingApi.getMembershipStatus();
        let nextOptions: BillingCheckoutCatalog = { processors: [] };
        try {
          nextOptions = await optionsRequest;
        } catch {
          nextOptions = { processors: [] };
        }
        let nextStatus: BillingMembershipStatus | null = null;
        try {
          nextStatus = await statusRequest;
        } catch {
          nextStatus = null;
        }
        const pricingResponse = await pricingRequest;
        if (!active) {
          return;
        }
        const mapped = mapCheckoutProcessors(nextOptions);
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
        setStatus(nextStatus);
        setCatalogPricing(catalogReady ? nextCatalog : null);
        if (processorId !== null) {
          const renewCadences = availableCadences(mapped, processorId, 'auto_renew');
          const onceCadences = availableCadences(mapped, processorId, 'one_time');
          if (renewCadences.length === 0 && onceCadences.length > 0) {
            setAutoRenew(false);
          }
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

  const purchaseKind = autoRenew ? 'auto_renew' : 'one_time';
  const cadences =
    processorId === null ? [] : availableCadences(processors, processorId, purchaseKind);
  const selectedCadence = cadences.includes(cadence) ? cadence : cadences[0];
  const product =
    processorId === null || selectedCadence === undefined
      ? null
      : checkoutProduct(processors, processorId, selectedCadence, purchaseKind);
  const alreadyRenewing = status?.active_auto_renew === true;
  const showPayPal = offersProcessor(processors, 'paypal');
  const storeOffered = processorId !== null && offersProcessor(processors, processorId);
  const showStorePurchase = storeOffered && !alreadyRenewing;
  const showCadence =
    showStorePurchase && selectedCadence !== undefined && cadences.length > 0;
  const checkoutMode = resolveStoreCheckoutMode({
    backend: client.backend,
    processors,
  });
  const manageUrl = subscriptionManagementUrl(client.backend);
  const ready = !loading && product !== null && !alreadyRenewing;

  useEffect(() => {
    if (processorId === null || loading) {
      return;
    }
    const renewCadences = availableCadences(processors, processorId, 'auto_renew');
    const onceCadences = availableCadences(processors, processorId, 'one_time');
    if (autoRenew && renewCadences.length === 0 && onceCadences.length > 0) {
      setAutoRenew(false);
    }
  }, [autoRenew, loading, processorId, processors]);

  useEffect(() => {
    if (selectedCadence !== undefined && selectedCadence !== cadence) {
      setCadence(selectedCadence);
    }
  }, [cadence, selectedCadence]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        block: {
          gap: tokens.spacing.base,
          marginBottom: tokens.spacing.lg,
        },
        stack: {
          gap: tokens.spacing.base,
        },
        disclosure: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        link: {
          ...typography.body,
          color: tokens.text.accent,
        },
        loading: {
          flex: 1,
        },
        plan: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          flex: 1,
          gap: tokens.spacing.sm,
          padding: tokens.spacing.lg,
        },
        planName: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
        },
        planPeriod: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        planPrice: {
          ...typography.title,
          color: themeStyles.textPrimary.color,
        },
        planRow: {
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        planSelected: {
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        linkRow: {
          flexDirection: 'row',
          gap: tokens.spacing.lg,
        },
        status: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
        switchLabel: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
          flex: 1,
        },
        switchRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const displayPriceFor = (externalProductId: string): string | null => {
    const match = prices.find((item) => item.productId === externalProductId);
    return match === undefined ? null : match.displayPrice;
  };

  const planName = (value: StoreCheckoutCadence): string =>
    value === 'monthly' ? t('membership.pricing_monthly') : t('membership.pricing_annually');

  const planPeriod = (value: StoreCheckoutCadence): string =>
    value === 'monthly' ? t('membership.pricing_per_month') : t('membership.pricing_per_year');

  const planPrice = (value: StoreCheckoutCadence): string | null => {
    const catalogAmount =
      catalogPricing === null
        ? null
        : value === 'monthly'
          ? catalogPricing.costMonthly
          : catalogPricing.costAnnually;
    if (catalogAmount !== null) {
      return formatCatalogUsd(catalogAmount);
    }
    if (processorId === null) {
      return null;
    }
    const offer = checkoutProduct(processors, processorId, value, purchaseKind);
    return offer === null ? null : displayPriceFor(offer.externalProductId);
  };

  const percentOff =
    catalogPricing !== null &&
    Number.isFinite(catalogPricing.annuallySavingsPercent) &&
    catalogPricing.annuallySavingsPercent > 0
      ? catalogPricing.annuallySavingsPercent
      : null;

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

  const reloadStatus = async () => {
    const nextStatus = await createBillingApi(screenAuthDeps).getMembershipStatus();
    setStatus(nextStatus);
  };

  const applyOutcome = async (
    outcome: BillingPurchaseOutcome,
    source: NoticeSource
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
      await reloadStatus().catch(() => undefined);
      return;
    }
    if (outcome.phase === 'waiting') {
      setNotice('waiting');
      return;
    }
    setNotice('failed');
  };

  const onPurchase = () => {
    if (product === null || submitting || updateRequired) {
      return;
    }
    setSubmitting(true);
    setNotice(null);
    setNoticeSource('purchase');
    void client
      .purchase({ productId: product.externalProductId, purchaseKind: product.purchaseKind })
      .then((outcome) => applyOutcome(outcome, 'purchase'))
      .catch(() => {
        setNotice('failed');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const onRestore = () => {
    if (submitting || updateRequired) {
      return;
    }
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

  const onAutoRenewChange = (next: boolean) => {
    if (
      !next &&
      processorId !== null &&
      availableCadences(processors, processorId, 'one_time').length === 0
    ) {
      return;
    }
    setAutoRenew(next);
  };

  const periodEnd =
    status?.active_subscription?.current_period_end ?? status?.membership_expires_at ?? null;
  const periodDate = periodEnd === null ? null : new Date(periodEnd).toLocaleDateString();
  const showStacking =
    storePurchases &&
    !alreadyRenewing &&
    showsStackingNotice(status?.membership_expires_at ?? null, Date.now());

  const updateDialog = (
    <ConfirmDialog
      body={t('membership.checkout.update_required_body')}
      cancelLabel={t('membership.gate.cancel')}
      cancelTestID="membership-checkout-update-cancel"
      confirmLabel={t('membership.checkout.update_app')}
      confirmTestID="membership-checkout-update-confirm"
      onCancel={() => {
        setUpdateDialogVisible(false);
      }}
      onConfirm={() => {
        setUpdateDialogVisible(false);
        if (platform === null) {
          return;
        }
        void Linking.openURL(storeListingUrl(platform));
      }}
      testID="membership-checkout-update-modal"
      title={t('membership.checkout.update_required_title')}
      visible={updateDialogVisible}
    />
  );

  const noticeText =
    notice === 'success'
      ? t('checkout.success_active')
      : notice === 'waiting'
        ? t('membership.checkout.purchase_waiting')
        : notice === 'failed'
          ? t('checkout.purchase_failed')
          : null;

  const notices = (
    <>
      {noticeText !== null && noticeSource !== 'restore' ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.status}
          testID={
            notice === 'success'
              ? 'membership-checkout-success'
              : notice === 'waiting'
                ? 'membership-checkout-waiting'
                : 'membership-checkout-error'
          }
        >
          {noticeText}
        </Text>
      ) : null}
      {updateDialog}
    </>
  );

  const contactEmail = getMobileConfig().contactEmail;
  const contactBlock = (
    <View testID="membership-checkout-contact">
      {contactEmail !== '' ? (
        <>
          <Text style={styles.status}>{t('membership.contact_mode_text_before')}</Text>
          <Pressable
            accessibilityLabel={contactEmail}
            accessibilityRole="link"
            onPress={() => {
              void Linking.openURL(`mailto:${contactEmail}`);
            }}
          >
            <Text style={styles.link}>{contactEmail}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.status}>{t('checkout.purchase_unavailable')}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loading} testID="membership-checkout-pending">
        <LoadingSection testID="membership-checkout-loading" />
      </View>
    );
  }

  if (!storePurchases) {
    return (
      <View style={styles.block} testID="membership-checkout-foss">
        {showPayPal ? (
          <Button
            fullWidth
            label={t('membership.checkout.pay_with_paypal_on_the_web')}
            onPress={() => {
              void openCheckout({ mode: 'extend' });
            }}
            testID="membership-checkout-paypal"
            variant="outline"
          />
        ) : null}
        {!showPayPal ? contactBlock : null}
        {notices}
      </View>
    );
  }

  return (
    <View
      style={styles.block}
      testID={ready ? 'membership-checkout-ready' : 'membership-checkout-pending'}
    >
      <Card>
        <View style={styles.stack}>
          {status?.in_grace_period === true ? (
            <Text style={styles.disclosure}>{t('membership.manage.grace_banner')}</Text>
          ) : null}
          {alreadyRenewing && periodDate !== null ? (
            <Text style={styles.status} testID="membership-checkout-status">
              {`${t('settings.membership.renews_on')} ${periodDate}`}
            </Text>
          ) : null}
          {showStacking ? (
            <Text style={styles.disclosure} testID="membership-checkout-stacking">
              {t('membership.checkout.stacking_notice')}
            </Text>
          ) : null}
          {showCadence && selectedCadence !== undefined ? (
            <View style={styles.planRow} testID="membership-checkout-cadence">
              {cadences.map((value) => {
                const selected = value === selectedCadence;
                const name = planName(value);
                const price = planPrice(value);
                const period = planPeriod(value);
                const savings =
                  value === 'annual' && percentOff !== null
                    ? t('membership.pricing_percent_off', { percent: percentOff })
                    : null;
                const priceLabel = price === null ? name : `${name}, ${price}${period}`;
                return (
                  <Pressable
                    accessibilityLabel={
                      savings === null ? priceLabel : `${priceLabel}, ${savings}`
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={value}
                    onPress={() => {
                      setCadence(value);
                    }}
                    style={[styles.plan, selected ? styles.planSelected : null]}
                    testID={`membership-checkout-cadence-${value}`}
                  >
                    <Text style={styles.planName}>{name}</Text>
                    {price !== null ? (
                      <Text style={styles.planPrice} testID={`membership-checkout-price-${value}`}>
                        {price}
                      </Text>
                    ) : null}
                    {price !== null ? <Text style={styles.planPeriod}>{period}</Text> : null}
                    {savings !== null ? (
                      <Badge
                        label={savings}
                        testID="membership-checkout-percent-off"
                        tone="accent"
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {showStorePurchase ? (
            <>
              <Text style={styles.disclosure}>
                {t('membership.checkout.auto_renew_disclosure')}
              </Text>
              <View style={styles.linkRow}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void openWebPath('/terms');
                  }}
                  testID="membership-checkout-terms"
                >
                  <Text style={styles.link}>{t('misc.terms')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void openWebPath('/terms');
                  }}
                  testID="membership-checkout-privacy"
                >
                  <Text style={styles.link}>{t('membership.checkout.privacy')}</Text>
                </Pressable>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t('checkout.auto_renew')}</Text>
                <ToggleSwitch
                  accessibilityLabel={t('checkout.auto_renew')}
                  onValueChange={onAutoRenewChange}
                  testID="membership-checkout-auto-renew"
                  value={autoRenew}
                />
              </View>
              <Button
                disabled={product === null || submitting || updateRequired}
                fullWidth
                label={t('checkout.complete_purchase')}
                loading={submitting && noticeSource === 'purchase'}
                onPress={onPurchase}
                testID="membership-extend-purchase"
                variant="primary"
              />
            </>
          ) : null}
          {alreadyRenewing && manageUrl !== null ? (
            <Button
              fullWidth
              label={
                client.backend === 'play'
                  ? t('settings.membership.manage_in_play')
                  : t('settings.membership.manage_in_app_store')
              }
              onPress={() => {
                void Linking.openURL(manageUrl);
              }}
              testID="membership-checkout-manage"
              variant="primary"
            />
          ) : null}
          {!alreadyRenewing && showPayPal ? (
            <Button
              fullWidth
              label={t('membership.checkout.pay_with_paypal_on_the_web')}
              onPress={() => {
                void openCheckout({ mode: 'extend' });
              }}
              testID="membership-checkout-paypal"
              variant="outline"
            />
          ) : null}
          {checkoutMode === 'contact' ? contactBlock : null}
          {storeOffered && product === null && !alreadyRenewing ? (
            <Text style={styles.disclosure}>{t('checkout.plan_unavailable')}</Text>
          ) : null}
          {notices}
        </View>
      </Card>
      {storeOffered ? (
        <Accordion
          testID="membership-checkout-troubleshooting"
          title={t('membership.checkout.troubleshooting')}
        >
          <View style={styles.stack}>
            <Text style={styles.disclosure} testID="membership-checkout-restore-help">
              {t('membership.checkout.restore_purchases_help')}
            </Text>
            <Button
              disabled={submitting || updateRequired}
              fullWidth
              label={t('membership.checkout.restore_purchases')}
              loading={submitting && noticeSource === 'restore'}
              onPress={onRestore}
              testID="membership-checkout-restore"
              variant="secondary"
            />
            {noticeSource === 'restore' && noticeText !== null ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.status}
                testID={
                  notice === 'success'
                    ? 'membership-checkout-success'
                    : notice === 'waiting'
                      ? 'membership-checkout-waiting'
                      : 'membership-checkout-error'
                }
              >
                {noticeText}
              </Text>
            ) : null}
          </View>
        </Accordion>
      ) : null}
    </View>
  );
}
