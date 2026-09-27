import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadBillingWebhookEvents } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { WebhookEventsPageClient } from './WebhookEventsPageClient';

export default async function WebhookEventsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadBillingWebhookEvents(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  return <WebhookEventsPageClient initialUser={user} />;
}
