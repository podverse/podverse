import { redirect } from 'next/navigation';

import { getManagementSession } from '../../../../../lib/auth/serverManagementSession';
import { canUpdateAdmins } from '../../../../../lib/managementPermissions';
import { getAdminAccountById } from '../../../../../lib/requests/admins';
import { ROUTES } from '../../../../../lib/routes';
import { EditAdminPageClient } from './EditAdminPageClient';

export default async function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getManagementSession();
  if (!session) {
    redirect(ROUTES.HOME);
  }

  const { user, token } = session;
  if (!canUpdateAdmins(user)) {
    redirect(ROUTES.ADMINS);
  }

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (isNaN(adminId)) {
    redirect(ROUTES.ADMINS);
  }

  let admin;
  try {
    admin = await getAdminAccountById(adminId, token);
  } catch {
    redirect(ROUTES.ADMINS);
  }

  if (!admin || admin.role === 'superuser') {
    redirect(ROUTES.ADMINS);
  }

  return <EditAdminPageClient admin={admin} />;
}
