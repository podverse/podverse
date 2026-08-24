import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../lib/routes';
import { WorkersPageClient } from './WorkersPageClient';

export default async function WorkersPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  return <WorkersPageClient initialUser={user} />;
}
