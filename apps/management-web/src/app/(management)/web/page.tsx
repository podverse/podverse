import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { canReadEmbedDemo } from '../../../lib/managementPermissions';
import { WebPageClient } from './WebPageClient';

export default async function WebPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }
  if (!canReadEmbedDemo(user)) {
    redirect('/dashboard');
  }

  return <WebPageClient />;
}
