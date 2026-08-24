import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadEmbedDemo } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { EmbedDemoConfigPageClient } from './EmbedDemoConfigPageClient';

export default async function EmbedDemoConfigPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadEmbedDemo(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  return <EmbedDemoConfigPageClient />;
}
