import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { getConfig } from '../../config';
import { getSSRApiRequestService } from '../../factories/apiRequestService';
import { CheckoutPageClient } from './CheckoutPageClient';

type MembershipPricingData = {
  costMonthly: number;
  costAnnually: number;
  freeTrialExpiration: number;
  freeTrialDays: number;
  annuallySavingsPercent: number;
  monthlyEquivalentAnnually: number;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function CheckoutPage() {
  const config = getConfig();
  const ssrApiRequestService = getSSRApiRequestService();
  const signupMode = config.public.account.signupMode;
  const isContactOnlyMode = signupMode !== 'user_signup_email';

  let pricingData: MembershipPricingData | null = null;
  if (!isContactOnlyMode) {
    try {
      const response = await ssrApiRequestService.reqMembershipGetPricing();
      if ('data' in response && response.data) {
        pricingData = response.data;
      }
    } catch {
      // Handle error - pricing data is optional
    }
  }

  return <CheckoutPageClient pricingData={pricingData} isContactOnlyMode={isContactOnlyMode} />;
}
