import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../lib/routes';
import { DatabaseIndexPageClient } from './DatabaseIndexPageClient';

export default async function DatabasePage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  return <DatabaseIndexPageClient />;
}
