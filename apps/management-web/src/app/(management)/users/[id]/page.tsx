import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { UserDetailPageClient } from './UserDetailPageClient';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (user.role !== 'superuser') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    redirect('/users');
  }

  return <UserDetailPageClient userId={userId} />;
}
