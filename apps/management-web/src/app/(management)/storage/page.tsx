import { redirect } from 'next/navigation';

import { getManagementSession } from '../../../lib/auth/serverManagementSession';
import { canReadStorage } from '../../../lib/managementPermissions';
import { ROUTES } from '../../../lib/routes';
import { StoragePageClient } from './StoragePageClient';

export default async function StoragePage() {
  const session = await getManagementSession();
  if (!session) {
    redirect(ROUTES.HOME);
  }

  const { user, service } = session;
  if (!canReadStorage(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  try {
    const probe = await service.apiRequest<{ enabled: boolean }>({
      path: '/storage',
      method: 'GET',
    });
    if (probe.enabled !== true) {
      redirect(ROUTES.DASHBOARD);
    }
  } catch {
    redirect(ROUTES.DASHBOARD);
  }

  return <StoragePageClient initialUser={user} />;
}
