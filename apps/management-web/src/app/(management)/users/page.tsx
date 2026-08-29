import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../lib/routes';
import { UsersListPageClient } from './UsersListPageClient';

export default async function UsersPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  if (user.role !== 'superuser') {
    redirect(ROUTES.DASHBOARD);
  }

  return <UsersListPageClient />;
}
