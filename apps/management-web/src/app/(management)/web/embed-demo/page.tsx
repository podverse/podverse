import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadEmbedDemo } from '../../../../lib/managementPermissions';
import { EmbedDemoConfigPageClient } from './EmbedDemoConfigPageClient';

export default async function EmbedDemoConfigPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }
  if (!canReadEmbedDemo(user)) {
    redirect('/dashboard');
  }

  return <EmbedDemoConfigPageClient />;
}
