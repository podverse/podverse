import { notFound, redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import {
  canReadBillingAccount,
  canReadBillingChannels,
  canReadBillingProcessorProducts,
  canReadBillingWebhookEvents,
} from '../../../../../lib/managementPermissions';
import { ROUTES } from '../../../../../lib/routes';
import { isBillingHelpSlug } from '../billingHelpArticles';
import { BillingHelpArticleClient } from './BillingHelpArticleClient';

function canReadBillingHelp(
  user: NonNullable<Awaited<ReturnType<typeof getManagementSessionUser>>>
) {
  return (
    canReadBillingChannels(user) ||
    canReadBillingProcessorProducts(user) ||
    canReadBillingWebhookEvents(user) ||
    canReadBillingAccount(user)
  );
}

export default async function BillingHelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadBillingHelp(user)) {
    redirect(ROUTES.DASHBOARD);
  }
  const { slug } = await params;
  if (!isBillingHelpSlug(slug)) {
    notFound();
  }

  return <BillingHelpArticleClient slug={slug} />;
}
