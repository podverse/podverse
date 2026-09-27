import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { ROUTES } from '../../../constants/routes';
import { getSSRApiRequestService } from '../../../factories/apiRequestService';
import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { getSSRJwtFromCookies } from '../../../utils/auth/ssrAuth';

const manageHref = `${ROUTES.SETTINGS}?tab=account`;

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function MembershipRenewPage() {
  const t = await getTranslations('membership');
  const jwt = await getSSRJwtFromCookies();
  let inGrace = false;
  if (jwt !== undefined) {
    try {
      const status = await getSSRApiRequestService(jwt).reqBillingGetStatus();
      inGrace = status.in_grace_period;
    } catch {
      inGrace = false;
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
            <Link href={ROUTES.CHECKOUT}>{t('extend_my_membership')}</Link>
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
