import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { canReadFeeds } from '../../../lib/managementPermissions';
import { FeedsPageClient } from './FeedsPageClient';

export default async function FeedsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }
  if (!canReadFeeds(user)) {
    redirect('/dashboard');
  }
  return <FeedsPageClient />;
}
