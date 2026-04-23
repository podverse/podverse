import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { getTableRow } from '../../../../../lib/requests/database';
import { RowDetailPageClient } from './RowDetailPageClient';

export default async function RowDetailPage({
  params,
}: {
  params: Promise<{ table: string; id: string }>;
}) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  const { table, id } = await params;
  const rowId = parseInt(id, 10);
  if (isNaN(rowId)) {
    redirect(`/database/${table}`);
  }

  try {
    const row = await getTableRow(table, rowId);
    return <RowDetailPageClient tableName={table} rowId={rowId} initialRow={row} />;
  } catch {
    redirect(`/database/${table}`);
  }
}
