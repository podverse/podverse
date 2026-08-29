import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { getTableRow } from '../../../../../lib/requests/database';
import { buildDatabaseTablePath, ROUTES } from '../../../../../lib/routes';
import { RowDetailPageClient } from './RowDetailPageClient';

export default async function RowDetailPage({
  params,
}: {
  params: Promise<{ table: string; id: string }>;
}) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  const { table, id } = await params;
  const rowId = parseInt(id, 10);
  if (isNaN(rowId)) {
    redirect(buildDatabaseTablePath(table));
  }

  try {
    const row = await getTableRow(table, rowId);
    return <RowDetailPageClient tableName={table} rowId={rowId} initialRow={row} />;
  } catch {
    redirect(buildDatabaseTablePath(table));
  }
}
