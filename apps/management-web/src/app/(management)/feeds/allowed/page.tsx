import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadFeeds } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { AllowedFeedsPageClient } from './AllowedFeedsPageClient';

export default async function AllowedFeedsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadFeeds(user)) {
    redirect(ROUTES.DASHBOARD);
  }
  return <AllowedFeedsPageClient user={user} />;
}
