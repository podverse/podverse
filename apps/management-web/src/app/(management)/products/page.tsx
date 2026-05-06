import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import { ProductsPageClient } from './ProductsPageClient';

export default async function ProductsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }
  if (user.role !== 'superuser') {
    redirect('/dashboard');
  }

  return <ProductsPageClient />;
}
