import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../lib/auth/serverManagementSession';
import { TableBrowserPageClient } from './TableBrowserPageClient';

export default async function TableBrowserPage({ params }: { params: Promise<{ table: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  const { table } = await params;
  return <TableBrowserPageClient tableName={table} />;
}
