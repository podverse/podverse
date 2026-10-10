'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Breadcrumbs, ManagementPageShell } from '@podverse/ui';

import { ROUTES } from '../../../../../lib/routes';
import type { BillingHelpSlug } from '../billingHelpArticles';
import { billingHelpBodyKey, billingHelpTitleKey } from '../billingHelpArticles';

export type BillingHelpArticleClientProps = {
  slug: BillingHelpSlug;
};

export function BillingHelpArticleClient({ slug }: BillingHelpArticleClientProps) {
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const title = t(`help.${billingHelpTitleKey(slug)}`);

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.BILLING, label: t('pageTitle') },
            { href: ROUTES.BILLING_HELP, label: t('help.title') },
            { label: title },
          ]}
        />
      }
      title={title}
    >
      <p>{t(`help.${billingHelpBodyKey(slug)}`)}</p>
    </ManagementPageShell>
  );
}
