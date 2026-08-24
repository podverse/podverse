import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../lib/routes';
import { StatsPageClient } from './StatsPageClient';

export default async function StatsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  return <StatsPageClient initialUser={user} />;
}
