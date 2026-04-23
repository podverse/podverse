import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { DashboardPageClient } from './DashboardPageClient';

export default async function DashboardPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  return <DashboardPageClient initialUser={user} />;
}
