'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { BillingCadence, DTOBillingCheckoutOptions } from '@podverse/helpers';
import {
  Alert,
  Button,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
  MembershipPlanSelector,
} from '@podverse/ui';

import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { CheckoutPayPalButtons } from './CheckoutPayPalButtons';
import { checkoutProduct, isBillingCadence, offersProcessor } from './checkoutProducts';
import { CheckoutStrikePanel } from './CheckoutStrikePanel';
import type { WebCheckoutMethod } from './purchaseAvailability';
import { hasWebPurchasableProcessor, webCheckoutMethods } from './purchaseAvailability';

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
  const [chosenMethod, setChosenMethod] = useState<WebCheckoutMethod | null>(null);
  const [options, setOptions] = useState<DTOBillingCheckoutOptions | null>(null);
  const [catalogPricing, setCatalogPricing] = useState<MembershipPricingData | null>(pricingData);
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
      const pricingRequest = getApiRequestService()
        .reqProductMembershipGet()
        .catch(() => null);
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
        const pricingResponse = await pricingRequest;
        if (
          !cancelled &&
          pricingResponse !== null &&
          'data' in pricingResponse &&
          pricingResponse.data !== undefined
        ) {
          const catalog = pricingResponse.data;
          const costMonthly = catalog.premiumMembershipCostMonthly;
          const costAnnually = catalog.premiumMembershipCostAnnually;
          const monthlyEquivalentAnnually = costMonthly * 12;
          setCatalogPricing({
            costMonthly,
            costAnnually,
            freeTrialExpiration: 0,
            freeTrialDays: 0,
            annuallySavingsPercent: catalog.annuallySavingsPercent,
            monthlyEquivalentAnnually,
          });
        }
      } catch {
        // Keep SSR pricing when the catalog request fails.
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
  const strikeProduct = options === null ? null : checkoutProduct(options, 'strike', cadence);
  const testProduct = options === null ? null : checkoutProduct(options, 'test', cadence);
  const canPurchase =
    options !== null &&
    hasWebPurchasableProcessor({
      paypalClientId,
      processorIds: options.processors.map((processor) => processor.processor_id),
    });
  const paypalPurchasable =
    options !== null && offersProcessor(options, 'paypal') && paypalClientId !== '';
  const strikeOffered = options !== null && offersProcessor(options, 'strike');
  const methods = webCheckoutMethods({ paypalPurchasable, strikeOffered });
  const showMethodChoice = methods.length > 1;
  const activeMethod = showMethodChoice
    ? chosenMethod !== null && methods.includes(chosenMethod)
      ? chosenMethod
      : null
    : (methods[0] ?? null);
  const showTestPurchase = options !== null && offersProcessor(options, 'test');
  const waitingForMethod = showMethodChoice && activeMethod === null;
  const cadenceHasProduct =
    (activeMethod === 'paypal' && paypalProduct !== null) ||
    (activeMethod === 'strike' && strikeProduct !== null) ||
    (showTestPurchase && testProduct !== null);

  const formatCatalogUsd = (amount: number): string => {
    const dollars = Math.round(amount * 100) / 100;
    return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
  };

  const planPrice = (plan: BillingCadence): string => {
    if (catalogPricing === null) {
      return '';
    }
    const amount = plan === 'monthly' ? catalogPricing.costMonthly : catalogPricing.costAnnually;
    return formatCatalogUsd(amount);
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

  return (
    <>
      <MainHeader title={t('checkout')} />
      <MainWrapper>
        <MainSidebarLayout>
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
                <section className={styles.intro} data-testid="checkout-intro">
                  <p>{t('page_intro')}</p>
                </section>
                <MembershipPlanSelector
                  name="payment-plan"
                  legend={t('choose_a_plan')}
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
                        catalogPricing !== null && catalogPricing.annuallySavingsPercent > 0
                          ? tMembership('pricing_percent_off', {
                              percent: catalogPricing.annuallySavingsPercent,
                            })
                          : undefined,
                    },
                  ]}
                />
                {showMethodChoice ? (
                  <MembershipPlanSelector
                    legend={t('choose_a_payment_method')}
                    name="payment-method"
                    onChange={(value) => {
                      if (value === 'paypal' || value === 'strike') {
                        setChosenMethod(value);
                        setError(null);
                      }
                    }}
                    options={methods.map((method) => ({
                      value: method,
                      label: method === 'paypal' ? t('paypal') : t('bitcoin_lightning'),
                      price: '',
                      period: '',
                    }))}
                    selectedValue={activeMethod ?? ''}
                  />
                ) : null}
                {error !== null ? <Alert>{error}</Alert> : null}
                <section className={styles.formSection}>
                  <div className={styles.buttonSection}>
                    {activeMethod === 'paypal' && paypalProduct !== null ? (
                      <CheckoutPayPalButtons
                        clientId={paypalClientId}
                        onError={() => {
                          setError(t('purchase_failed'));
                        }}
                        processorProductId={paypalProduct.id}
                      />
                    ) : null}
                    {activeMethod === 'strike' && strikeProduct !== null ? (
                      <CheckoutStrikePanel
                        key={strikeProduct.id}
                        onError={() => {
                          setError(t('purchase_failed'));
                        }}
                        onRenew={() => {
                          setError(null);
                        }}
                        processorProductId={strikeProduct.id}
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
                    {!waitingForMethod && !cadenceHasProduct ? (
                      <p>{t('plan_unavailable')}</p>
                    ) : null}
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
