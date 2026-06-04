import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { ROUTES } from '../../../constants/routes';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function MembershipRenewPage() {
  const t = await getTranslations('membership');

  return (
    <div className="container">
      <h1>{t('renew_membership')}</h1>
      <p>{t('membership_expired_text_line2')}</p>
      <p>
        <Link href={ROUTES.MEMBERSHIP}>{t('membership_link_text')}</Link>
      </p>
    </div>
  );
}
