import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canCreateAdmins } from '../../../../lib/managementPermissions';
import { NewAdminPageClient } from './NewAdminPageClient';

export default async function NewAdminPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (!canCreateAdmins(user)) {
    redirect('/admins');
  }

  return <NewAdminPageClient />;
}
