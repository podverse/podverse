import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadFeeds } from '../../../../lib/managementPermissions';
import { FlagStatusPageClient } from './FlagStatusPageClient';

export default async function FeedFlagStatusPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }
  if (!canReadFeeds(user)) {
    redirect('/dashboard');
  }
  return <FlagStatusPageClient user={user} />;
}
