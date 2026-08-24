import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadFeeds } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { FlagStatusPageClient } from './FlagStatusPageClient';

export default async function FeedFlagStatusPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadFeeds(user)) {
    redirect(ROUTES.DASHBOARD);
  }
  return <FlagStatusPageClient user={user} />;
}
