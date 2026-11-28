import { getLocale, getTranslations } from 'next-intl/server';
import React from 'react';

import type { DTOAccount, DTOMembershipComparison } from '@podverse/helpers';
import {
  calculateTimeRemaining,
  deriveMembershipState,
  formatDateAbbrev,
  getAccountSignupModeCapabilities,
} from '@podverse/helpers';
import { MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getConfigResolved } from '../../config/loadPublicClientConfig.server';
import { getSSRApiRequestService } from '../../factories/apiRequestService';
import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { getSSRLoggedInAccount } from '../../utils/auth/ssrAuth';
import { hasWebPurchasableProcessor } from '../checkout/purchaseAvailability';
import { MembershipComparison } from './MembershipComparison';
import { MembershipCTA } from './MembershipCTA';

import styles from '../../styles/app/membership/Membership.module.scss';

type MembershipPricingData = {
  costMonthly: number;
  costAnnually: number;
  freeTrialExpiration: number;
  freeTrialDays: number;
  annuallySavingsPercent: number;
  monthlyEquivalentAnnually: number;
};

type RenderIntroTextParams = {
  t: (key: string, values?: Record<string, string | number>) => string;
  canPublicSignup: boolean;
  ssrLoggedInAccount: DTOAccount | null;
  isMembershipExpired: boolean;
  isTrialStatus: boolean;
  minutesLeft: number | null;
  hoursLeft: number | null;
  daysLeft: number | null;
  isPremiumStatus: boolean;
  membershipExpiresAt: Date | string | null | undefined;
  pricingData: MembershipPricingData | null;
  /** The expiry card already shows the date, so the intro does not repeat it. */
  suppressExpiryIntro: boolean;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

function MembershipContactMailto({
  className,
  contactEmail,
}: {
  className: string;
  contactEmail: string;
}) {
  return (
    <a className={className} href={`mailto:${contactEmail}`}>
      {contactEmail}
    </a>
  );
}

export default async function MembershipPage() {
  const config = await getConfigResolved();
  const locale = await getLocale();
  const t = await getTranslations('membership');
  const tCheckout = await getTranslations('checkout');
  const tSettingsMembership = await getTranslations('settings.membership');
  const ssrLoggedInAccount = await getSSRLoggedInAccount();
  const ssrApiRequestService = getSSRApiRequestService();
  const contactEmail = config.public.account.contactEmail;
  const canPublicSignup = getAccountSignupModeCapabilities(
    config.public.account.signupMode
  ).canPublicSignup;

  let webCanPurchase = false;
  try {
    const checkoutOptions = await ssrApiRequestService.reqBillingGetCheckoutOptions({
      platform: 'web',
    });
    webCanPurchase = hasWebPurchasableProcessor({
      paypalClientId: config.public.paypal.clientId,
      processorIds: checkoutOptions.processors.map((processor) => processor.processor_id),
    });
  } catch {
    // Checkout options are optional. Purchase actions stay hidden.
  }

  const showPurchaseActions = webCanPurchase && (ssrLoggedInAccount !== null || canPublicSignup);

  let pricingData: MembershipPricingData | null = null;
  let errorMessage: string | null = null;
  if (showPurchaseActions) {
    try {
      const response = await ssrApiRequestService.reqMembershipGetPricing();
      if ('data' in response && response.data) {
        pricingData = response.data;
      } else if ('message' in response && response.message) {
        errorMessage = response.message;
      }
    } catch {
      // Pricing copy is optional. The purchase button still opens checkout.
    }
  }

  // Determine user status (shared derivation — tolerant of both the DTO `account_membership_id` and a
  // populated `account_membership.id`).
  const membership = deriveMembershipState(ssrLoggedInAccount);
  const isTrialStatus = membership.tier === 'trial';
  const isPremiumStatus = membership.tier === 'premium';
  const membershipExpiresAt = membership.expiresAt;
  const isMembershipExpired = membership.isExpired;
  let comparison: DTOMembershipComparison | null = null;
  try {
    const comparisonResponse = await ssrApiRequestService.reqMembershipComparisonGet({ locale });
    comparison = comparisonResponse.data;
  } catch {
    // The comparison table fetches its own document when this request fails.
  }

  const showPremiumExpiry =
    ssrLoggedInAccount !== null &&
    isPremiumStatus &&
    !isMembershipExpired &&
    membershipExpiresAt !== null;

  // Calculate time left in membership if active
  const { daysLeft, hoursLeft, minutesLeft } =
    membershipExpiresAt && !isMembershipExpired
      ? calculateTimeRemaining(membershipExpiresAt)
      : { daysLeft: null, hoursLeft: null, minutesLeft: null };

  const contactBefore = showPurchaseActions
    ? t('contact_questions_text_before')
    : t('contact_mode_text_before');
  const contactLine =
    contactEmail !== '' ? (
      <>
        {contactBefore}{' '}
        <MembershipContactMailto className={styles.contactLink ?? ''} contactEmail={contactEmail} />
      </>
    ) : !showPurchaseActions ? (
      tCheckout('purchase_unavailable')
    ) : null;

  const intro = renderIntroText({
    t,
    canPublicSignup,
    ssrLoggedInAccount,
    isMembershipExpired,
    isTrialStatus,
    minutesLeft,
    hoursLeft,
    daysLeft,
    isPremiumStatus,
    membershipExpiresAt,
    pricingData,
    suppressExpiryIntro: showPremiumExpiry,
  });

  return (
    <>
      <MainHeader title={t('membership')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <div className={styles.content} data-testid="membership-content">
              <div className={styles.lead}>
                {showPremiumExpiry && membershipExpiresAt !== null ? (
                  <section className={styles.expiryBanner} data-testid="membership-expiry">
                    <p className={styles.expiryTier}>{t('premium')}</p>
                    <p className={styles.expiryLabel}>{tSettingsMembership('expires_on')}</p>
                    <p className={styles.expiryDate}>
                      {formatDateAbbrev(membershipExpiresAt, locale)}
                    </p>
                  </section>
                ) : null}

                {intro !== '' ? <p className={styles.contactLine}>{intro}</p> : null}

                {showPurchaseActions ? (
                  <MembershipCTA loggedIn={ssrLoggedInAccount !== null} tier={membership.tier} />
                ) : null}

                {contactLine !== null ? (
                  <p className={styles.contactLine} data-testid="membership-contact">
                    {contactLine}
                  </p>
                ) : null}
              </div>

              {showPurchaseActions && errorMessage && (
                <section className={styles.errorSection}>
                  <p>{errorMessage}</p>
                </section>
              )}

              {showPurchaseActions && pricingData && (
                <section className={styles.pricingSection}>
                  <div className={styles.pricingPlan}>
                    <h3 className={styles.planTitle}>{t('pricing_monthly')}</h3>
                    <div className={styles.planPrice}>
                      ${pricingData.costMonthly}
                      <span className={styles.planPeriod}>{t('pricing_per_month')}</span>
                    </div>
                  </div>
                  <div className={styles.pricingPlan}>
                    <h3 className={styles.planTitle}>{t('pricing_annually')}</h3>
                    <div className={styles.planPriceContainer}>
                      <div className={styles.planPrice}>
                        ${pricingData.costAnnually}
                        <span className={styles.planPeriod}>{t('pricing_per_year')}</span>
                      </div>
                      {pricingData.annuallySavingsPercent > 0 && (
                        <div className={styles.savingsBadge}>
                          {t('pricing_save_percent', {
                            percent: pricingData.annuallySavingsPercent,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <MembershipComparison initial={comparison} showHeading />
            </div>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}

function renderIntroText({
  t,
  canPublicSignup,
  ssrLoggedInAccount,
  isMembershipExpired,
  isTrialStatus,
  minutesLeft,
  hoursLeft,
  daysLeft,
  isPremiumStatus,
  membershipExpiresAt,
  pricingData,
  suppressExpiryIntro,
}: RenderIntroTextParams): string | React.ReactElement {
  if (!ssrLoggedInAccount) {
    return canPublicSignup ? t('cta_sign_up_text') : '';
  }

  if (suppressExpiryIntro) {
    return '';
  }

  if (isMembershipExpired) {
    return (
      <>
        {isTrialStatus ? t('trial_expired_text_line1') : t('membership_expired_text_line1')}
        <br />
        {isTrialStatus ? t('trial_expired_text_line2') : t('membership_expired_text_line2')}
      </>
    );
  }

  if (minutesLeft !== null) {
    if (isTrialStatus) {
      const key =
        minutesLeft === 1 ? 'intro_trial_minutes_left_one' : 'intro_trial_minutes_left_other';
      return t(key, { minutes: minutesLeft });
    } else {
      const key =
        minutesLeft === 1
          ? 'intro_membership_minutes_left_one'
          : 'intro_membership_minutes_left_other';
      return t(key, { minutes: minutesLeft });
    }
  }

  if (hoursLeft !== null) {
    if (isTrialStatus) {
      const key = hoursLeft === 1 ? 'intro_trial_hours_left_one' : 'intro_trial_hours_left_other';
      return t(key, { hours: hoursLeft });
    } else {
      const key =
        hoursLeft === 1 ? 'intro_membership_hours_left_one' : 'intro_membership_hours_left_other';
      return t(key, { hours: hoursLeft });
    }
  }

  if (daysLeft !== null) {
    if (isTrialStatus) {
      const key = daysLeft === 1 ? 'intro_trial_days_left_one' : 'intro_trial_days_left_other';
      return t(key, { days: daysLeft });
    } else {
      const key =
        daysLeft === 1 ? 'intro_membership_days_left_one' : 'intro_membership_days_left_other';
      return t(key, { days: daysLeft });
    }
  }

  if (isTrialStatus) {
    return t('cta_upgrade_text');
  }

  if (isPremiumStatus && membershipExpiresAt) {
    return t('your_membership_expires_on', {
      date: new Date(membershipExpiresAt).toLocaleDateString(),
    });
  }

  if (pricingData) {
    return t('intro_try_premium', { days: pricingData.freeTrialDays });
  }

  return '';
}
