import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  getManagementSessionUser,
  MANAGEMENT_AUTH_COOKIE_NAME,
} from '../../../lib/auth/serverManagementSession';
import { fetchBucketStorageEnabledForDashboard } from '../../../lib/server/bucketStorageDashboard';
import { DashboardPageClient } from './DashboardPageClient';

export default async function DashboardPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(MANAGEMENT_AUTH_COOKIE_NAME)?.value ?? '';
  const bucketStorageEnabled =
    token !== '' ? await fetchBucketStorageEnabledForDashboard(token, user) : false;

  return <DashboardPageClient bucketStorageEnabled={bucketStorageEnabled} initialUser={user} />;
}
