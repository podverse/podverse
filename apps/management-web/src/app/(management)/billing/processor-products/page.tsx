import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { canReadBillingProcessorProducts } from '../../../../lib/managementPermissions';
import { ROUTES } from '../../../../lib/routes';
import { ProcessorProductsPageClient } from './ProcessorProductsPageClient';

export default async function ProcessorProductsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (!canReadBillingProcessorProducts(user)) {
    redirect(ROUTES.DASHBOARD);
  }

  return <ProcessorProductsPageClient initialUser={user} />;
}
