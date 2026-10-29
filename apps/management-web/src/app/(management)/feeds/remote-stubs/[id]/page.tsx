import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { canReadFeeds } from '../../../../../lib/managementPermissions';
import { ROUTES } from '../../../../../lib/routes';
import { RemoteStubDetailPageClient } from './RemoteStubDetailPageClient';

export default async function RemoteStubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadFeeds(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  const { id } = await params;
  const stubId = parseInt(id, 10);
  if (Number.isNaN(stubId) || stubId <= 0) {
    redirect(ROUTES.FEEDS_REMOTE_STUBS);
  }

  return <RemoteStubDetailPageClient stubId={stubId} user={user} />;
}
