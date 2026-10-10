import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import {
  canReadBillingAccount,
  canReadBillingChannels,
  canReadBillingProcessorProducts,
  canReadBillingWebhookEvents,
} from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { BillingHelpIndexClient } from './BillingHelpIndexClient';

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

export default async function BillingHelpIndexPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadBillingHelp(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  return <BillingHelpIndexClient />;
}
