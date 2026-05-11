import { redirect } from 'next/navigation';

import { getManagementSession } from '../../../lib/auth/serverManagementSession';
import { canReadStorage } from '../../../lib/managementPermissions';
import { StoragePageClient } from './StoragePageClient';

export default async function StoragePage() {
  const session = await getManagementSession();
  if (!session) {
    redirect('/');
  }

  const { user, service } = session;
  if (!canReadStorage(user)) {
    redirect('/dashboard');
  }

  try {
    const probe = await service.apiRequest<{ enabled: boolean }>({
      path: '/storage',
      method: 'GET',
    });
    if (probe.enabled !== true) {
      redirect('/dashboard');
    }
  } catch {
    redirect('/dashboard');
  }

  return <StoragePageClient initialUser={user} />;
}
