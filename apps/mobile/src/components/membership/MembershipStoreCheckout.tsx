import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateAbbrev } from '@podverse/helpers';

import { getMobileConfig } from '../../config';
import { openCheckout, openWebPath } from '../../membership/checkoutEntry';
import { addedMembershipWindow, storeListingUrl } from '../../membership/storeCheckout';
import { useMembership } from '../../membership/useMembership';
import { useStoreCheckout } from '../../membership/useStoreCheckout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import { Accordion, Button, Card } from '../primitives';
import { LoadingSection } from '../state/LoadingSection';
import { MembershipCheckoutPlans } from './MembershipCheckoutPlans';

/**
 * Store checkout for a signed-in member. Monthly or annual, then buy. Plan prices and the annual
 * percent off come from `GET /product/membership`, the public catalog. PayPal, when the server
 * includes it for this platform, opens web checkout. When nothing on this platform can be bought,
 * the screen tells the member how to reach the team. The terms page is the legal document that
 * describes how the service handles data, so Privacy opens that page too.
 *
 * The card stays hidden until checkout options and that pricing catalog have settled.
 */
export function MembershipStoreCheckout() {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const membership = useMembership();
  const checkout = useStoreCheckout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        block: {
          gap: tokens.spacing.base,
          marginBottom: tokens.spacing.lg,
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
        loading: {
          flex: 1,
        },
        stack: {
          gap: tokens.spacing.base,
        },
        status: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  const addedTime =
    checkout.product === null
      ? null
      : addedMembershipWindow({
          cadence: checkout.product.cadence,
          membershipExpiresAt: membership.expiresAt,
          nowMs: Date.now(),
        });

  const noticeText =
    checkout.notice === 'success'
      ? t('checkout.success_active')
      : checkout.notice === 'waiting'
        ? t('membership.checkout.purchase_waiting')
        : checkout.notice === 'failed'
          ? t('checkout.purchase_failed')
          : null;

  const updateDialog = (
    <ConfirmDialog
      body={t('membership.checkout.update_required_body')}
      cancelLabel={t('membership.gate.cancel')}
      cancelTestID="membership-checkout-update-cancel"
      confirmLabel={t('membership.checkout.update_app')}
      confirmTestID="membership-checkout-update-confirm"
      onCancel={checkout.dismissUpdate}
      onConfirm={() => {
        checkout.dismissUpdate();
        if (checkout.platform === null) {
          return;
        }
        void Linking.openURL(storeListingUrl(checkout.platform));
      }}
      testID="membership-checkout-update-modal"
      title={t('membership.checkout.update_required_title')}
      visible={checkout.updateDialogVisible}
    />
  );

  const notices = (
    <>
      {noticeText !== null && checkout.noticeSource !== 'restore' ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.status}
          testID={
            checkout.notice === 'success'
              ? 'membership-checkout-success'
              : checkout.notice === 'waiting'
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

  const payPalButton = checkout.showPayPal ? (
    <Button
      fullWidth
      label={t('membership.checkout.pay_with_paypal_on_the_web')}
      onPress={() => {
        void openCheckout({ mode: 'extend' });
      }}
      testID="membership-checkout-paypal"
      variant="outline"
    />
  ) : null;

  if (checkout.loading) {
    return (
      <View style={styles.loading} testID="membership-checkout-pending">
        <LoadingSection testID="membership-checkout-loading" />
      </View>
    );
  }

  if (!checkout.storePurchases) {
    return (
      <View style={styles.block} testID="membership-checkout-foss">
        {payPalButton}
        {!checkout.showPayPal ? contactBlock : null}
        {notices}
      </View>
    );
  }

  return (
    <View
      style={styles.block}
      testID={checkout.ready ? 'membership-checkout-ready' : 'membership-checkout-pending'}
    >
      <Card>
        <View style={styles.stack}>
          {addedTime !== null ? (
            <Text style={styles.status} testID="membership-checkout-added-time">
              {t('checkout.added_time', {
                end: formatDateAbbrev(addedTime.end, i18n.language),
                start: formatDateAbbrev(addedTime.start, i18n.language),
              })}
            </Text>
          ) : null}
          {checkout.cadence !== undefined && checkout.cadences.length > 0 ? (
            <MembershipCheckoutPlans
              cadences={checkout.cadences}
              catalogPricing={checkout.catalogPricing}
              onSelect={checkout.selectCadence}
              prices={checkout.prices}
              processorId={checkout.processorId ?? ''}
              processors={checkout.processors}
              selectedCadence={checkout.cadence}
            />
          ) : null}
          {checkout.storeOffered && checkout.product !== null ? (
            <>
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
              <Button
                disabled={checkout.submitting || checkout.updateRequired}
                fullWidth
                label={t('checkout.complete_purchase')}
                loading={checkout.submitting && checkout.noticeSource === 'purchase'}
                onPress={checkout.onPurchase}
                testID="membership-extend-purchase"
                variant="primary"
              />
            </>
          ) : null}
          {payPalButton}
          {checkout.checkoutMode === 'contact' ? contactBlock : null}
          {checkout.storeOffered && checkout.product === null ? (
            <Text style={styles.disclosure}>{t('checkout.plan_unavailable')}</Text>
          ) : null}
          {notices}
        </View>
      </Card>
      {checkout.storeOffered ? (
        <Accordion
          testID="membership-checkout-troubleshooting"
          title={t('membership.checkout.troubleshooting')}
        >
          <View style={styles.stack}>
            <Text style={styles.disclosure} testID="membership-checkout-restore-help">
              {t('membership.checkout.restore_purchases_help')}
            </Text>
            <Button
              disabled={checkout.submitting || checkout.updateRequired}
              fullWidth
              label={t('membership.checkout.restore_purchases')}
              loading={checkout.submitting && checkout.noticeSource === 'restore'}
              onPress={checkout.onRestore}
              testID="membership-checkout-restore"
              variant="secondary"
            />
            {checkout.noticeSource === 'restore' && noticeText !== null ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.status}
                testID={
                  checkout.notice === 'success'
                    ? 'membership-checkout-success'
                    : checkout.notice === 'waiting'
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
