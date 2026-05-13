import { redirect } from 'next/navigation';

import { getManagementSession } from '../../../../lib/auth/serverManagementSession';
import { canReadStorage } from '../../../../lib/managementPermissions';
import { decodeStorageObjectKeyFromPathSegment } from '../../../../lib/storageObjectPath';
import { StorageObjectDetailPageClient } from './StorageObjectDetailPageClient';

export default async function StorageObjectDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key: encoded } = await params;
  const objectKey = decodeStorageObjectKeyFromPathSegment(encoded);
  if (objectKey === null) {
    redirect('/dashboard');
  }

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

  return <StorageObjectDetailPageClient objectKey={objectKey} />;
}
