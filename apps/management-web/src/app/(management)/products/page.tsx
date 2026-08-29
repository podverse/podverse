import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../lib/routes';
import { ProductsPageClient } from './ProductsPageClient';

export default async function ProductsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }
  if (user.role !== 'superuser') {
    redirect(ROUTES.DASHBOARD);
  }

  return <ProductsPageClient />;
}
