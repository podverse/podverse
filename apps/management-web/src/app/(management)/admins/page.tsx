import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../lib/routes';
import { AdminsListPageClient } from './AdminsListPageClient';

export default async function AdminsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  return <AdminsListPageClient initialUser={user} />;
}
