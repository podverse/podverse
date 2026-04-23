import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { CreateRowPageClient } from './CreateRowPageClient';

export default async function CreateRowPage({ params }: { params: Promise<{ table: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  const { table } = await params;
  return <CreateRowPageClient tableName={table} />;
}
