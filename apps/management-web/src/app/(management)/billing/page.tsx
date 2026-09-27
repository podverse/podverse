import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import {
  canReadBillingAccount,
  canReadBillingChannels,
  canReadBillingProcessorProducts,
  canReadBillingWebhookEvents,
} from '../../../lib/managementPermissions';
import { ROUTES } from '../../../lib/routes';
import { BillingPageClient } from './BillingPageClient';

export default async function BillingPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  const canRead =
    canReadBillingChannels(user) ||
    canReadBillingProcessorProducts(user) ||
    canReadBillingWebhookEvents(user) ||
    canReadBillingAccount(user);
  if (!canRead) {
    redirect(ROUTES.DASHBOARD);
  }

  return <BillingPageClient initialUser={user} />;
}
