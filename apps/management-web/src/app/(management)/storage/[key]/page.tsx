import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  getManagementSessionUser,
  MANAGEMENT_AUTH_COOKIE_NAME,
} from '../../../../lib/auth/serverManagementSession';
import { canReadStorage } from '../../../../lib/managementPermissions';
import { ManagementApiRequestService } from '../../../../lib/requests/apiRequestService';
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

  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }
  if (!canReadStorage(user)) {
    redirect('/dashboard');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(MANAGEMENT_AUTH_COOKIE_NAME)?.value;
  if (token === undefined || token === '') {
    redirect('/');
  }

  const service = new ManagementApiRequestService(token);
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
