import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canCreateAdmins } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { NewAdminPageClient } from './NewAdminPageClient';

export default async function NewAdminPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  if (!canCreateAdmins(user)) {
    redirect(ROUTES.ADMINS);
  }

  return <NewAdminPageClient />;
}
