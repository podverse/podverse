'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type {
  BillingCadence,
  DTOBillingCheckoutOptions,
  DTOBillingStatus,
} from '@podverse/helpers';
import { extendMembershipPeriodByCadence, formatDateAbbrev } from '@podverse/helpers';
import {
  Alert,
  Button,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
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

function futureExpiry(status: DTOBillingStatus | null): Date | null {
  const value = status?.membership_expires_at;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
    return null;
  }
  return expiry;
}

export function CheckoutPageClient({
  pricingData,
  isContactOnlyMode,
  contactEmail,
}: CheckoutPageClientProps) {
  const t = useTranslations('checkout');
  const tMembership = useTranslations('membership');
  const tAuth = useTranslations('authentication');
  const locale = useLocale();
  const { loggedInAccount } = useAccount();
  const config = useConfig();
  const router = useRouter();
  const paypalClientId = config.public.paypal.clientId;

  const [cadence, setCadence] = useState<BillingCadence>('monthly');
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

  const paypalProduct = options === null ? null : checkoutProduct(options, 'paypal', cadence);
  const testProduct = options === null ? null : checkoutProduct(options, 'test', cadence);
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
  const currentExpiry = futureExpiry(status);
  const extensionEnd =
    currentExpiry === null
      ? null
      : extendMembershipPeriodByCadence({
          membershipExpiresAt: currentExpiry,
          cadence,
        });

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
        cadence,
        externalProductId: testProduct.external_product_id,
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

  const addedTime =
    currentExpiry === null || extensionEnd === null
      ? null
      : t('added_time', {
          start: formatDateAbbrev(currentExpiry, locale),
          end: formatDateAbbrev(extensionEnd, locale),
        });

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
                {addedTime !== null ? (
                  <Alert testId="checkout-added-time" variant="default">
                    {addedTime}
                  </Alert>
                ) : null}
                <section className={styles.formSection}>
                  <div className={styles.buttonSection}>
                    {paypalPurchasable && paypalProduct !== null ? (
                      <CheckoutPayPalButtons
                        clientId={paypalClientId}
                        processorProductId={paypalProduct.id}
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
                    {!cadenceHasProduct ? <p>{t('plan_unavailable')}</p> : null}
                  </div>
                </section>
              </>
            ) : null}
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
