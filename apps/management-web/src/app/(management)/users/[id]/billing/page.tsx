import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { canReadBillingAccount } from '../../../../../lib/managementPermissions';
import { ROUTES } from '../../../../../lib/routes';
import { UserBillingPageClient } from './UserBillingPageClient';

export default async function UserBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadBillingAccount(user)) {
    redirect(ROUTES.DASHBOARD);
  }
  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    redirect(ROUTES.USERS);
  }

  return <UserBillingPageClient initialUser={user} accountId={accountId} />;
}
