import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadFeeds } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { RemoteStubsPageClient } from './RemoteStubsPageClient';

export default async function RemoteStubsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadFeeds(user)) {
    redirect(ROUTES.DASHBOARD);
  }
  return <RemoteStubsPageClient user={user} />;
}
