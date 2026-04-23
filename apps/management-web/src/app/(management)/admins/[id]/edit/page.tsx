import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { getAdminAccountById } from '../../../../../lib/requests/adminAccount';
import { EditAdminPageClient } from './EditAdminPageClient';

export default async function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (user.role !== 'superuser') {
    redirect('/admins');
  }

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (isNaN(adminId)) {
    redirect('/admins');
  }

  const admin = await getAdminAccountById(adminId, undefined);
  if (!admin || admin.role === 'superuser') {
    redirect('/admins');
  }

  return <EditAdminPageClient admin={admin} />;
}
