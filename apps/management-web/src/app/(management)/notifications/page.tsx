import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { canReadNotifications } from '../../../lib/managementPermissions';
import { ROUTES } from '../../../lib/routes';
import { NotificationsListPageClient } from './NotificationsListPageClient';

export default async function NotificationsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadNotifications(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  return <NotificationsListPageClient initialUser={user} />;
}
