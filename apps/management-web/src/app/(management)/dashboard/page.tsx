import { redirect } from 'next/navigation';

import { getManagementAuthService } from '../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../lib/routes';
import { fetchBucketStorageEnabledForDashboard } from '../../../lib/server/bucketStorageDashboard';
import { DashboardPageClient } from './DashboardPageClient';

export default async function DashboardPage() {
  const auth = await getManagementAuthService();
  if (!auth) {
    redirect(ROUTES.HOME);
  }

  const bucketStorageEnabled = await fetchBucketStorageEnabledForDashboard(auth.service, auth.user);

  return (
    <DashboardPageClient bucketStorageEnabled={bucketStorageEnabled} initialUser={auth.user} />
  );
}
