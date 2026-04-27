import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { UsersListPageClient } from './UsersListPageClient';

export default async function UsersPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (user.role !== 'superuser') {
    redirect('/dashboard');
  }

  return <UsersListPageClient />;
}
