import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { NewUserPageClient } from './NewUserPageClient';

export default async function NewUserPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (user.role !== 'superuser') {
    redirect('/users');
  }

  return <NewUserPageClient />;
}
