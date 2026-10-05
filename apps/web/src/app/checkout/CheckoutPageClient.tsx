'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type {
  BillingCadence,
  DTOBillingCheckoutOptions,
  DTOBillingStatus,
} from '@podverse/helpers';
import {
  ActionLink,
  Alert,
  Button,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
  MembershipAutoRenewConsent,
  MembershipPlanSelector,
  SideContent,
} from '@podverse/ui';

import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { CheckoutPayPalButtons } from './CheckoutPayPalButtons';
import { checkoutProduct, isBillingCadence, offersProcessor } from './checkoutProducts';
import { hasWebPurchasableProcessor } from './purchaseAvailability';

import styles from '../../styles/app/checkout/Checkout.module.scss';

type MembershipPricingData = {
  costMonthly: number;
  costAnnually: number;
  freeTrialExpiration: number;
  freeTrialDays: number;
  annuallySavingsPercent: number;
  monthlyEquivalentAnnually: number;
};

type CheckoutPageClientProps = {
  pricingData: MembershipPricingData | null;
  isContactOnlyMode: boolean;
  contactEmail: string;
};

export function CheckoutPageClient({
  pricingData,
  isContactOnlyMode,
  contactEmail,
}: CheckoutPageClientProps) {
  const t = useTranslations('checkout');
  const tMembership = useTranslations('membership');
  const tAuth = useTranslations('authentication');
  const { loggedInAccount } = useAccount();
  const config = useConfig();
  const router = useRouter();
  const paypalClientId = config.public.paypal.clientId;

  const [cadence, setCadence] = useState<BillingCadence>('monthly');
  const [autoRenew, setAutoRenew] = useState(true);
  const [options, setOptions] = useState<DTOBillingCheckoutOptions | null>(null);
  const [status, setStatus] = useState<DTOBillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signedIn = loggedInAccount !== null;

  useEffect(() => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const optionsRequest = getApiRequestService().reqBillingGetCheckoutOptions();
      const statusRequest = getApiRequestService().reqBillingGetStatus();
      try {
        const nextOptions = await optionsRequest;
        if (!cancelled) {
          setOptions(nextOptions);
        }
      } catch {
        if (!cancelled) {
          setOptions(null);
        }
      }
      try {
        const nextStatus = await statusRequest;
        if (!cancelled) {
          setStatus(nextStatus);
        }
      } catch {
        if (!cancelled) {
          setStatus(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const purchaseKind = autoRenew ? 'auto_renew' : 'one_time';
  const paypalProduct =
    options === null ? null : checkoutProduct(options, 'paypal', cadence, purchaseKind);
  const testProduct =
    options === null ? null : checkoutProduct(options, 'test', cadence, purchaseKind);
  const canPurchase =
    options !== null &&
    hasWebPurchasableProcessor({
      paypalClientId,
      processorIds: options.processors.map((processor) => processor.processor_id),
    });
  const paypalPurchasable =
    options !== null && offersProcessor(options, 'paypal') && paypalClientId !== '';
  const showTestPurchase = options !== null && offersProcessor(options, 'test');
  const cadenceHasProduct =
    (paypalPurchasable && paypalProduct !== null) || (showTestPurchase && testProduct !== null);
  const alreadyRenewing = status?.active_auto_renew === true;
  const startsLater =
    autoRenew &&
    status?.membership_expires_at !== null &&
    status?.membership_expires_at !== undefined &&
    new Date(status.membership_expires_at).getTime() > Date.now();

  const planPrice = (plan: BillingCadence): string => {
    if (pricingData === null) {
      return '';
    }
    const amount = plan === 'monthly' ? pricingData.costMonthly : pricingData.costAnnually;
    return `$${amount}`;
  };

  const completeTestPurchase = async () => {
    if (testProduct === null) {
      setError(t('plan_unavailable'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await getApiRequestService().reqBillingSimulatePayment({
        purchaseKind,
        cadence,
        externalProductId: testProduct.external_product_id,
        externalSubscriptionId: autoRenew ? crypto.randomUUID() : null,
        externalTransactionId: crypto.randomUUID(),
      });
      if (result.outcome.status === 'failed') {
        setError(t('purchase_failed'));
        return;
      }
      router.push(ROUTES.CHECKOUT_SUCCESS);
    } catch {
      setError(t('purchase_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <MainHeader title={t('checkout')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <WebLoadingSpinnerOverlay isLoading={loading} />
            {isContactOnlyMode && !signedIn ? (
              <section className={styles.disabledSection}>
                <p>{t('disabled_message')}</p>
              </section>
            ) : null}
            {!isContactOnlyMode && !signedIn ? <Alert>{tAuth('login_required')}</Alert> : null}
            {signedIn && !loading && !canPurchase ? (
              <>
                <Alert testId="checkout-contact" variant="default">
                  {contactEmail !== '' ? (
                    <>
                      {tMembership('contact_mode_text_before')}{' '}
                      <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                    </>
                  ) : (
                    t('purchase_unavailable')
                  )}
                </Alert>
                {alreadyRenewing ? (
                  <section className={styles.formSection}>
                    <p>{t('already_renewing')}</p>
                    <ActionLink href={`${ROUTES.SETTINGS}?tab=account`} LinkComponent={Link}>
                      {t('manage_membership')}
                    </ActionLink>
                  </section>
                ) : null}
              </>
            ) : null}
            {signedIn && !loading && canPurchase ? (
              <>
                <MembershipPlanSelector
                  name="payment-plan"
                  legend={t('payment_plan')}
                  selectedValue={cadence}
                  onChange={(value) => {
                    if (isBillingCadence(value)) {
                      setCadence(value);
                    }
                  }}
                  options={[
                    {
                      value: 'monthly',
                      label: tMembership('pricing_monthly'),
                      price: planPrice('monthly'),
                      period: tMembership('pricing_per_month'),
                    },
                    {
                      value: 'annual',
                      label: tMembership('pricing_annually'),
                      price: planPrice('annual'),
                      period: tMembership('pricing_per_year'),
                      savingsLabel:
                        pricingData !== null && pricingData.annuallySavingsPercent > 0
                          ? tMembership('pricing_save_percent', {
                              percent: pricingData.annuallySavingsPercent,
                            })
                          : undefined,
                    },
                  ]}
                />
                {error !== null ? <Alert>{error}</Alert> : null}
                {alreadyRenewing ? (
                  <section className={styles.formSection}>
                    <p>{t('already_renewing')}</p>
                    <ActionLink href={`${ROUTES.SETTINGS}?tab=account`} LinkComponent={Link}>
                      {t('manage_membership')}
                    </ActionLink>
                  </section>
                ) : (
                  <section className={styles.formSection}>
                    {startsLater &&
                    status?.membership_expires_at !== undefined &&
                    status.membership_expires_at !== null ? (
                      <Alert variant="default">
                        {t('billing_starts_on', {
                          date: new Date(status.membership_expires_at).toLocaleDateString(),
                        })}
                      </Alert>
                    ) : null}
                    <MembershipAutoRenewConsent
                      id="auto-renew"
                      checked={autoRenew}
                      onChange={setAutoRenew}
                      label={t('auto_renew')}
                      disclosure={t('auto_renew_disclosure')}
                    />
                    <div className={styles.buttonSection}>
                      {paypalPurchasable && paypalProduct !== null ? (
                        <CheckoutPayPalButtons
                          clientId={paypalClientId}
                          processorProductId={paypalProduct.id}
                          autoRenew={autoRenew}
                          onError={() => {
                            setError(t('purchase_failed'));
                          }}
                        />
                      ) : null}
                      {showTestPurchase ? (
                        <Button
                          disabled={submitting || testProduct === null}
                          onClick={() => {
                            void completeTestPurchase();
                          }}
                          type="button"
                          variant="primary"
                        >
                          {t('complete_test_purchase')}
                        </Button>
                      ) : null}
                      {cadenceHasProduct ? null : <p>{t('plan_unavailable')}</p>}
                    </div>
                  </section>
                )}
              </>
            ) : null}
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
