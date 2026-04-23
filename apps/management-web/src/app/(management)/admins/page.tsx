import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { AdminsListPageClient } from './AdminsListPageClient';

export default async function AdminsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  return <AdminsListPageClient initialUser={user} />;
}
