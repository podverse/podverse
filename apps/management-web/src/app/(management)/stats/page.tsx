import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { StatsPageClient } from './StatsPageClient';

export default async function StatsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  return <StatsPageClient initialUser={user} />;
}
