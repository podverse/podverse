import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { SettingsPageClient } from './SettingsPageClient';

export default async function SettingsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  return <SettingsPageClient initialUser={user} />;
}
