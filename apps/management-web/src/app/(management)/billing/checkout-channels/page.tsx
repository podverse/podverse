import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadBillingChannels } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { CheckoutChannelsPageClient } from './CheckoutChannelsPageClient';

export default async function CheckoutChannelsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadBillingChannels(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  return <CheckoutChannelsPageClient initialUser={user} />;
}
