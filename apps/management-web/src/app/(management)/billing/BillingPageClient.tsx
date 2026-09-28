'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { NavCard } from '@podverse/ui';
import { Breadcrumbs, ManagementPageShell, NavCardGrid } from '@podverse/ui';

import { BillingProcessorStatus } from '../../../components/billing/BillingProcessorStatus';
import {
  canReadBillingChannels,
  canReadBillingProcessorProducts,
  canReadBillingWebhookEvents,
} from '../../../lib/managementPermissions';
import type { CurrentUser } from '../../../lib/requests/auth';
import type { BillingProcessorStatusRow } from '../../../lib/requests/billing';
import { reqBillingGetProcessors } from '../../../lib/requests/billing';
import { ROUTES } from '../../../lib/routes';

export type BillingPageClientProps = {
  initialUser: CurrentUser;
};

export function BillingPageClient({ initialUser }: BillingPageClientProps) {
  const [user] = useState(initialUser);
  const [processors, setProcessors] = useState<BillingProcessorStatusRow[] | null>(null);
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await reqBillingGetProcessors();
        if (!cancelled) {
          setProcessors(result.data);
        }
      } catch {
        if (!cancelled) {
          setProcessors(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: NavCard[] = [];
  if (canReadBillingChannels(user)) {
    cards.push({
      href: ROUTES.BILLING_CHECKOUT_CHANNELS,
      title: t('checkoutChannelsCardTitle'),
      description: t('checkoutChannelsCardDescription'),
    });
  }
  if (canReadBillingProcessorProducts(user)) {
    cards.push({
      href: ROUTES.BILLING_PROCESSOR_PRODUCTS,
      title: t('processorProductsCardTitle'),
      description: t('processorProductsCardDescription'),
    });
  }
  if (canReadBillingWebhookEvents(user)) {
    cards.push({
      href: ROUTES.BILLING_WEBHOOK_EVENTS,
      title: t('webhookEventsCardTitle'),
      description: t('webhookEventsCardDescription'),
    });
  }

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: ROUTES.DASHBOARD, label: tNav('dashboard') }, { label: t('pageTitle') }]}
        />
      }
      title={t('pageTitle')}
    >
      {processors !== null ? <BillingProcessorStatus rows={processors} /> : null}
      <NavCardGrid cards={cards} LinkComponent={Link} />
    </ManagementPageShell>
  );
}
