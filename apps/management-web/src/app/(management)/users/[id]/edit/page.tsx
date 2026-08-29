import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../../../lib/routes';
import { EditUserPageClient } from './EditUserPageClient';

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
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

  const { tab } = await searchParams;

  return <EditUserPageClient userId={userId} initialTab={tab} />;
}
