import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../../lib/routes';
import { NewUserPageClient } from './NewUserPageClient';

export default async function NewUserPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  if (user.role !== 'superuser') {
    redirect(ROUTES.USERS);
  }

  return <NewUserPageClient />;
}
