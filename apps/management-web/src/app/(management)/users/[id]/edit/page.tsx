import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
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

  const { tab } = await searchParams;

  return <EditUserPageClient userId={userId} initialTab={tab} />;
}
