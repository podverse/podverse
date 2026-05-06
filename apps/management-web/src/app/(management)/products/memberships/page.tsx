import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { ProductMembershipsPageClient } from './ProductMembershipsPageClient';

export default async function ProductMembershipsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }
  if (user.role !== 'superuser') {
    redirect('/dashboard');
  }

  return <ProductMembershipsPageClient />;
}
