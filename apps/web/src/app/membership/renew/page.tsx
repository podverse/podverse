import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getConfig } from '../../../config';
import { ROUTES } from '../../../constants/routes';
import { getSSRApiRequestService } from '../../../factories/apiRequestService';
import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { getSSRJwtFromCookies } from '../../../utils/auth/ssrAuth';
import { hasWebPurchasableProcessor } from '../../checkout/purchaseAvailability';

const manageHref = `${ROUTES.SETTINGS}?tab=account`;

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function MembershipRenewPage() {
  const t = await getTranslations('membership');
  const config = getConfig();
  const jwt = await getSSRJwtFromCookies();
  let inGrace = false;
  let purchasable = false;
  if (jwt !== undefined) {
    const api = getSSRApiRequestService(jwt);
    try {
      const status = await api.reqBillingGetStatus();
      inGrace = status.in_grace_period;
    } catch {
      inGrace = false;
    }
    if (inGrace) {
      try {
        const checkoutOptions = await api.reqBillingGetCheckoutOptions({ platform: 'web' });
        purchasable = hasWebPurchasableProcessor({
          paypalClientId: config.public.paypal.clientId,
          processorIds: checkoutOptions.processors.map((processor) => processor.processor_id),
        });
      } catch {
        purchasable = false;
      }
    }
  }

  return (
    <div className="container">
      <h1>{t('renew_membership')}</h1>
      {inGrace ? (
        <>
          <p>{t('manage.grace_renew_body')}</p>
          <p>
            <Link href={manageHref}>{t('manage.manage_membership')}</Link>
          </p>
          <p>
            <Link href={purchasable ? ROUTES.CHECKOUT : ROUTES.MEMBERSHIP}>
              {purchasable ? t('extend_my_membership') : t('membership_link_text')}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p>{t('membership_expired_text_line2')}</p>
          <p>
            <Link href={ROUTES.MEMBERSHIP}>{t('membership_link_text')}</Link>
          </p>
        </>
      )}
    </div>
  );
}
