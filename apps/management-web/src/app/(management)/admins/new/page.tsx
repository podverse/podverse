import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { NewAdminPageClient } from './NewAdminPageClient';

export default async function NewAdminPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (user.role !== 'superuser') {
    redirect('/admins');
  }

  return <NewAdminPageClient />;
}
