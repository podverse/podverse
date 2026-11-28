import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateAbbrev } from '@podverse/helpers';

import { getMobileConfig } from '../../config';
import { openCheckout, openWebPath } from '../../membership/checkoutEntry';
import { storeListingUrl } from '../../membership/storeCheckout';
import { useStoreCheckout } from '../../membership/useStoreCheckout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import { Accordion, Button, Card } from '../primitives';
import { LoadingSection } from '../state/LoadingSection';
import { MembershipCheckoutPlans } from './MembershipCheckoutPlans';
import { MembershipStrikeCheckout } from './MembershipStrikeCheckout';

/**
 * Store checkout for a signed-in member. Monthly or annual, then buy. Plan prices and the annual
 * percent off come from `GET /config` (`membership`). PayPal, when the server
 * includes it for this platform, opens web checkout. When nothing on this platform can be bought,
 * the screen tells the member how to reach the team. The terms page is the legal document that
 * describes how the service handles data, so Privacy opens that page too.
 *
 * A purchase that extended membership stays on this screen long enough to read, then Membership
 * opens. A purchase the store recorded without extending membership stays here until the member
 * opens Membership. The card stays hidden until checkout options and that pricing catalog have
 * settled.
 */
export function MembershipStoreCheckout() {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
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
        intro: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
          marginBottom: tokens.spacing.sm,
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
        success: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  const noticeText =
    checkout.notice === 'success'
      ? t('checkout.success_active')
      : checkout.notice === 'waiting'
        ? t('membership.checkout.purchase_waiting')
        : checkout.notice === 'not_applied'
          ? t('checkout.purchase_not_applied')
          : checkout.notice === 'failed'
            ? t('checkout.purchase_failed')
            : null;

  const viewMembership =
    checkout.notice === 'not_applied' ? (
      <Button
        fullWidth
        label={t('checkout.view_membership')}
        onPress={checkout.openMembership}
        size="form"
        testID="membership-checkout-view-membership"
        variant="primary"
      />
    ) : null;

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

  const openingMembership = checkout.returningToMembership ? (
    <Text style={styles.disclosure}>{t('checkout.success_opening_membership')}</Text>
  ) : null;

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
                : checkout.notice === 'not_applied'
                  ? 'membership-checkout-not-applied'
                  : 'membership-checkout-error'
          }
        >
          {noticeText}
        </Text>
      ) : null}
      {checkout.noticeSource !== 'restore' ? openingMembership : null}
      {checkout.noticeSource !== 'restore' ? viewMembership : null}
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

  const strikeLink = checkout.showStrikeLink ? (
    <Button
      fullWidth
      label={t('membership.checkout.pay_with_bitcoin_on_the_web')}
      onPress={() => {
        void openCheckout({ mode: 'extend' });
      }}
      size="form"
      testID="membership-checkout-strike"
      variant="outline"
    />
  ) : null;

  const payPalButton = checkout.showPayPal ? (
    <Button
      fullWidth
      label={t('membership.checkout.pay_with_paypal_on_the_web')}
      onPress={() => {
        void openCheckout({ mode: 'extend' });
      }}
      size="form"
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

  if (checkout.confirmedPurchase !== null) {
    const purchase = checkout.confirmedPurchase;
    const confirmedMessage =
      purchase.expiresAt === null
        ? purchase.cadence === 'annual'
          ? t('checkout.success_extended_year_length')
          : t('checkout.success_extended_month_length')
        : purchase.cadence === 'annual'
          ? t('checkout.success_extended_year', {
              date: formatDateAbbrev(purchase.expiresAt, i18n.language),
            })
          : t('checkout.success_extended_month', {
              date: formatDateAbbrev(purchase.expiresAt, i18n.language),
            });
    return (
      <View style={styles.block} testID="membership-checkout-success">
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {confirmedMessage}
        </Text>
        <Text style={styles.disclosure}>{t('checkout.success_opening_membership')}</Text>
        <Button
          fullWidth
          label={t('checkout.view_membership')}
          onPress={checkout.openMembership}
          size="form"
          testID="membership-checkout-view-membership"
          variant="primary"
        />
        {updateDialog}
      </View>
    );
  }

  if (!checkout.storePurchases) {
    return (
      <View style={styles.block} testID="membership-checkout-foss">
        {payPalButton}
        {checkout.showStrikeInvoice &&
        checkout.cadence !== undefined &&
        checkout.cadences.length > 0 ? (
          <MembershipCheckoutPlans
            cadences={checkout.cadences}
            catalogPricing={checkout.catalogPricing}
            onSelect={checkout.selectCadence}
            prices={checkout.prices}
            processorId="strike"
            processors={checkout.processors}
            selectedCadence={checkout.cadence}
          />
        ) : null}
        {checkout.showStrikeInvoice && checkout.product !== null ? (
          <MembershipStrikeCheckout
            key={checkout.product.id}
            onFailed={checkout.failCheckout}
            onSettled={checkout.onStrikeSettled}
            processorProductId={checkout.product.id}
          />
        ) : null}
        {!checkout.showPayPal && !checkout.showStrikeInvoice ? contactBlock : null}
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
          <Text style={styles.intro} testID="membership-checkout-intro">
            {t('checkout.page_intro')}
          </Text>
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
                size="form"
                testID="membership-extend-purchase"
                variant="primary"
              />
            </>
          ) : null}
          {payPalButton}
          {strikeLink}
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
              size="form"
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
                      : checkout.notice === 'not_applied'
                        ? 'membership-checkout-not-applied'
                        : 'membership-checkout-error'
                }
              >
                {noticeText}
              </Text>
            ) : null}
            {checkout.noticeSource === 'restore' ? openingMembership : null}
            {checkout.noticeSource === 'restore' ? viewMembership : null}
          </View>
        </Accordion>
      ) : null}
    </View>
  );
}
