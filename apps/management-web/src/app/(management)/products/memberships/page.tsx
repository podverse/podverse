import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../../lib/routes';
import { ProductMembershipsPageClient } from './ProductMembershipsPageClient';

export default async function ProductMembershipsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (user.role !== 'superuser') {
    redirect(ROUTES.DASHBOARD);
  }

  return <ProductMembershipsPageClient />;
}
