import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { ROUTES } from '../../../../../lib/routes';
import { CreateRowPageClient } from './CreateRowPageClient';

export default async function CreateRowPage({ params }: { params: Promise<{ table: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  const { table } = await params;
  return <CreateRowPageClient tableName={table} />;
}
