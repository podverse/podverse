import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadAdmins } from '../../../../lib/managementPermissions';
import { AdminDetailPageClient } from './AdminDetailPageClient';

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (!canReadAdmins(user)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (Number.isNaN(adminId)) {
    redirect('/admins');
  }

  return <AdminDetailPageClient adminId={adminId} initialUser={user} />;
}
