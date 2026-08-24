import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import {
  canReadNotifications,
  canUpdateNotifications,
} from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { NotificationCampaignDetailPageClient } from './NotificationCampaignDetailPageClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NotificationCampaignDetailPage({ params }: PageProps) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadNotifications(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  const resolvedParams = await params;
  return (
    <NotificationCampaignDetailPageClient
      canCancel={canUpdateNotifications(user)}
      campaignIdText={resolvedParams.id}
    />
  );
}
