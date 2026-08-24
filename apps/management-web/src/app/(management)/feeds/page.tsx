import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { canReadFeeds } from '../../../lib/managementPermissions';
import { ROUTES } from '../../../lib/routes';
import { FeedsPageClient } from './FeedsPageClient';

export default async function FeedsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadFeeds(user)) {
    redirect(ROUTES.DASHBOARD);
  }
  return <FeedsPageClient />;
}
