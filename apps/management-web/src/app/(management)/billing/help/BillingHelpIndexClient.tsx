'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Breadcrumbs, ManagementPageShell } from '@podverse/ui';

import { ROUTES } from '../../../../lib/routes';
import { BILLING_HELP_SLUGS, billingHelpTitleKey } from './billingHelpArticles';

export function BillingHelpIndexClient() {
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.BILLING, label: t('pageTitle') },
            { label: t('help.title') },
          ]}
        />
      }
      title={t('help.title')}
    >
      <p>{t('help.indexIntro')}</p>
      <ul>
        {BILLING_HELP_SLUGS.map((slug) => (
          <li key={slug}>
            <Link href={`${ROUTES.BILLING_HELP}/${slug}`}>
              {t(`help.${billingHelpTitleKey(slug)}`)}
            </Link>
          </li>
        ))}
      </ul>
    </ManagementPageShell>
  );
}
