import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import type { AuthRequestDeps } from '../../auth/authRequestWithRefresh';
import type { BillingMembershipStatus } from '../../billing/billingApi';
import { createBillingApi } from '../../billing/billingApi';
import type {
  BillingClient,
  BillingLocalizedPrice,
  BillingPurchaseOutcome,
} from '../../billing/BillingClient';
import { createBillingClient } from '../../billing/createBillingClient';
import { accountRepository } from '../../data/repositories/accountRepository';
import { openCheckout, openWebPath } from '../../membership/checkoutEntry';
import type { CheckoutProcessorOffer, StoreCheckoutCadence } from '../../membership/storeCheckout';
import {
  availableCadences,
  checkoutProduct,
  isClientUpdateRequired,
  mapCheckoutProcessors,
  offersProcessor,
  showsStackingNotice,
  storeListingUrl,
  storeProcessorId,
  subscriptionManagementUrl,
} from '../../membership/storeCheckout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import { OptionChipGroup } from '../form/OptionChipGroup';
import { Button, Card } from '../primitives';
import { ToggleSwitch } from '../primitives/ToggleSwitch';

type PurchaseNotice = 'failed' | 'success' | 'waiting';

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
 * Store checkout for a signed-in member. Prices come from the billing client. PayPal, when the
 * server includes it for this platform, opens web checkout. The terms page is the legal document
 * that describes how the service handles data, so Privacy opens that page too.
 */
export function MembershipStoreCheckout() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [processors, setProcessors] = useState<readonly CheckoutProcessorOffer[]>([]);
  const [prices, setPrices] = useState<readonly BillingLocalizedPrice[]>([]);
  const [status, setStatus] = useState<BillingMembershipStatus | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [cadence, setCadence] = useState<StoreCheckoutCadence>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<PurchaseNotice | null>(null);
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
      setLoadFailed(false);
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
        const [nextOptions, nextStatus] = await Promise.all([
          billingApi.getCheckoutOptions({ platform, storefront }),
          billingApi.getMembershipStatus(),
        ]);
        if (!active) {
          return;
        }
        const mapped = mapCheckoutProcessors(nextOptions);
        setProcessors(mapped);
        setStatus(nextStatus);
        if (client.backend === 'unavailable') {
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
          setLoadFailed(true);
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

  const cadenceLabel = (value: StoreCheckoutCadence): string => {
    const plan =
      value === 'monthly' ? t('membership.pricing_monthly') : t('membership.pricing_annually');
    if (processorId === null) {
      return plan;
    }
    const offer = checkoutProduct(processors, processorId, value, purchaseKind);
    if (offer === null) {
      return plan;
    }
    const price = displayPriceFor(offer.externalProductId);
    return price === null ? plan : t('membership.checkout.plan_price', { plan, price });
  };

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

  const applyOutcome = async (outcome: BillingPurchaseOutcome) => {
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
      setNotice('success');
      await refreshAccount();
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
    void client
      .purchase({ productId: product.externalProductId, purchaseKind: product.purchaseKind })
      .then((outcome) => applyOutcome(outcome))
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
    void client
      .restore()
      .then((outcome) => applyOutcome(outcome))
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
      {noticeText !== null ? (
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

  if (!storePurchases) {
    return (
      <View style={styles.block} testID="membership-checkout-foss">
        {loading ? (
          <ActivityIndicator
            accessibilityLabel={t('misc.loading_your_content')}
            accessibilityRole="progressbar"
            testID="membership-checkout-loading"
          />
        ) : null}
        {loadFailed ? (
          <Text style={styles.status}>{t('settings.membership.load_failed')}</Text>
        ) : null}
        {!loading && !loadFailed && showPayPal ? (
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
        {!loading && !loadFailed && !showPayPal ? (
          <Text style={styles.status} testID="membership-checkout-unavailable">
            {t('membership.checkout.unavailable')}
          </Text>
        ) : null}
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
          {loading ? (
            <ActivityIndicator
              accessibilityLabel={t('misc.loading_your_content')}
              accessibilityRole="progressbar"
              testID="membership-checkout-loading"
            />
          ) : null}
          {loadFailed ? (
            <Text style={styles.status}>{t('settings.membership.load_failed')}</Text>
          ) : null}
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
          {!alreadyRenewing && selectedCadence !== undefined && cadences.length > 0 ? (
            <OptionChipGroup
              onChange={setCadence}
              options={cadences.map((value) => ({
                label: cadenceLabel(value),
                testID: `membership-checkout-cadence-${value}`,
                value,
              }))}
              testID="membership-checkout-cadence"
              value={selectedCadence}
            />
          ) : null}
          {!alreadyRenewing ? (
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
                label={t('membership.extend_my_membership')}
                loading={submitting}
                onPress={onPurchase}
                testID="more-membership-cta"
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
          <Button
            disabled={submitting || updateRequired}
            fullWidth
            label={t('membership.checkout.restore_purchases')}
            onPress={onRestore}
            testID="membership-checkout-restore"
            variant="secondary"
          />
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
          {!loading && product === null && !loadFailed && !alreadyRenewing ? (
            <Text style={styles.disclosure}>{t('checkout.plan_unavailable')}</Text>
          ) : null}
          {notices}
        </View>
      </Card>
    </View>
  );
}
