import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { DatabaseIndexPageClient } from './DatabaseIndexPageClient';

export default async function DatabasePage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  return <DatabaseIndexPageClient />;
}
