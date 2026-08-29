import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canCreateNotifications } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { NewNotificationCampaignPageClient } from './NewNotificationCampaignPageClient';

export default async function NewNotificationCampaignPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canCreateNotifications(user)) {
    redirect(ROUTES.NOTIFICATIONS);
  }

  return <NewNotificationCampaignPageClient />;
}
