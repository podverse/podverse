import { redirect } from 'next/navigation';

import { getManagementSession } from '../../../../../lib/auth/serverManagementSession';
import { canUpdateAdmins } from '../../../../../lib/managementPermissions';
import { getAdminAccountById } from '../../../../../lib/requests/admins';
import { EditAdminPageClient } from './EditAdminPageClient';

export default async function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getManagementSession();
  if (!session) {
    redirect('/');
  }

  const { user, token } = session;
  if (!canUpdateAdmins(user)) {
    redirect('/admins');
  }

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (isNaN(adminId)) {
    redirect('/admins');
  }

  let admin;
  try {
    admin = await getAdminAccountById(adminId, token);
  } catch {
    redirect('/admins');
  }

  if (!admin || admin.role === 'superuser') {
    redirect('/admins');
  }

  return <EditAdminPageClient admin={admin} />;
}
