import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../../lib/routes';
import { UserDetailPageClient } from './UserDetailPageClient';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  if (user.role !== 'superuser') {
    redirect(ROUTES.DASHBOARD);
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    redirect(ROUTES.USERS);
  }

  return <UserDetailPageClient userId={userId} />;
}
