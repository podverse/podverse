'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import {
  ActionLink,
  Alert,
  ManagementPageShell,
  PageHeaderActions,
  ResourceTableWithFilter,
  type SortDirection,
  StatusBadge,
  Table,
} from '@podverse/ui';

import { ManagementLoadingSpinnerSmall } from '../../../components/LoadingSpinner/ManagementLoadingSpinnerSmall';
import { useManagementTableChrome } from '../../../components/Table/managementTableChrome';
import { ManagementIconButtonLink } from '../../../lib/ManagementIconButtonLink';
import { managementSearchParamsObject } from '../../../lib/managementTableUrl';
import { type AdminAccount, listAdmins } from '../../../lib/requests/admins';
import type { CurrentUser } from '../../../lib/requests/auth';

const CRUD_LABELS: Record<number, string> = {
  0: 'None',
  1: 'C',
  2: 'R',
  3: 'CR',
  4: 'U',
  5: 'CU',
  6: 'RU',
  7: 'CRU',
  8: 'D',
  9: 'CD',
  10: 'RD',
  11: 'CRD',
  12: 'UD',
  13: 'CUD',
  14: 'RUD',
  15: 'CRUD',
};

function crudLabel(value: number): string {
  return CRUD_LABELS[value] ?? String(value);
}

const ADMIN_COLUMN_IDS = [
  'id_text',
  'email',
  'role',
  'feeds',
  'takedownReasons',
  'admins_perm',
  'stats_perm',
  'bucket',
] as const;

function sortAdmins(rows: AdminAccount[], sortKey: string, order: SortDirection): AdminAccount[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === 'feeds') {
      const va = a.permissions?.feeds_crud ?? 0;
      const vb = b.permissions?.feeds_crud ?? 0;
      return (va - vb) * dir;
    }
    if (sortKey === 'takedownReasons') {
      const va = a.permissions?.feed_takedown_reasons_crud ?? 0;
      const vb = b.permissions?.feed_takedown_reasons_crud ?? 0;
      return (va - vb) * dir;
    }
    if (sortKey === 'admins_perm') {
      const va = a.permissions?.admins_crud ?? 0;
      const vb = b.permissions?.admins_crud ?? 0;
      return (va - vb) * dir;
    }
    if (sortKey === 'stats_perm') {
      const va = a.permissions?.stats_crud ?? 0;
      const vb = b.permissions?.stats_crud ?? 0;
      return (va - vb) * dir;
    }
    if (sortKey === 'bucket') {
      const va = a.permissions?.bucket_crud ?? 0;
      const vb = b.permissions?.bucket_crud ?? 0;
      return (va - vb) * dir;
    }
    const av = a[sortKey as keyof AdminAccount];
    const bv = b[sortKey as keyof AdminAccount];
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

export type AdminsListPageClientProps = {
  initialUser: CurrentUser;
};

export function AdminsListPageClient({ initialUser }: AdminsListPageClientProps) {
  const [user] = useState<CurrentUser>(initialUser);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('admins');
  const tc = useTranslations('common');
  const chrome = useManagementTableChrome();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = pathname !== null && pathname !== '' ? pathname : '/admins';
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );
  const urlSearch = searchParams.get('search') ?? '';

  const [sortBy, setSortBy] = useState<string>('id_text');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');

  const isSuperuser = user.role === 'superuser';
  const canCreate = isSuperuser;

  useEffect(() => {
    let cancelled = false;

    const loadAdmins = async () => {
      try {
        const list = await listAdmins();
        if (!cancelled) {
          setAdmins(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('failedToLoad'));
          console.error('Error loading admins:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAdmins();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const sortedAdmins = useMemo(
    () => sortAdmins(admins, sortBy, sortOrder),
    [admins, sortBy, sortOrder]
  );

  const columns = useMemo(
    () => [
      {
        header: t('tableHeaders.id'),
        id: 'id_text',
        label: t('tableHeaders.id'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.id'))),
        sortKey: 'id_text',
      },
      {
        header: t('tableHeaders.email'),
        id: 'email',
        label: t('tableHeaders.email'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.email'))),
        sortKey: 'email',
      },
      {
        header: t('tableHeaders.role'),
        id: 'role',
        label: t('tableHeaders.role'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.role'))),
        sortKey: 'role',
      },
      {
        header: t('tableHeaders.feeds'),
        id: 'feeds',
        label: t('tableHeaders.feeds'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.feeds'))),
        sortKey: 'feeds',
      },
      {
        header: t('tableHeaders.takedownReasons'),
        id: 'takedownReasons',
        label: t('tableHeaders.takedownReasons'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.takedownReasons'))),
        sortKey: 'takedownReasons',
      },
      {
        header: t('tableHeaders.admins'),
        id: 'admins_perm',
        label: t('tableHeaders.admins'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.admins'))),
        sortKey: 'admins_perm',
      },
      {
        header: t('tableHeaders.stats'),
        id: 'stats_perm',
        label: t('tableHeaders.stats'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.stats'))),
        sortKey: 'stats_perm',
      },
      {
        header: t('tableHeaders.bucket'),
        id: 'bucket',
        label: t('tableHeaders.bucket'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.bucket'))),
        sortKey: 'bucket',
      },
    ],
    [chrome, t]
  );

  const emptyMessage =
    admins.length === 0 && !loading
      ? urlSearch.trim() !== ''
        ? tc('noDataFound')
        : undefined
      : undefined;

  return (
    <ManagementPageShell
      title={t('title')}
      headerChildren={
        <PageHeaderActions>
          {canCreate && (
            <ActionLink href="/admins/new" variant="primary" LinkComponent={Link}>
              {t('createAdmin')}
            </ActionLink>
          )}
        </PageHeaderActions>
      }
    >
      {loading && <ManagementLoadingSpinnerSmall />}
      <Alert>{error}</Alert>
      {!loading && !error && (
        <ResourceTableWithFilter<AdminAccount>
          actions={{
            LinkComponent: ManagementIconButtonLink,
            editHref: (adminRow) => `/admins/${adminRow.id}/edit`,
            labels: {
              delete: tc('delete'),
              edit: tc('edit'),
              view: tc('view'),
            },
          }}
          allColumnIds={[...ADMIN_COLUMN_IDS]}
          basePath={basePath}
          columns={columns}
          currentQueryParams={currentQueryParams}
          deleteConfirm={{
            ...chrome.deleteConfirmLabels,
            message: () => '',
            modalAriaLabel: chrome.deleteConfirmLabels.modalAriaLabel,
          }}
          emptyMessage={emptyMessage}
          filterableColumnIds={[...ADMIN_COLUMN_IDS]}
          getRowActions={(adminRow) => ({
            delete: 'hidden',
            edit: isSuperuser && adminRow.role !== 'superuser' ? 'enabled' : 'hidden',
            view: 'hidden',
          })}
          getRowKey={(adminRow) => adminRow.id_text}
          initialColumns={[...ADMIN_COLUMN_IDS]}
          initialSearch={urlSearch}
          labels={{
            ...chrome.filterLabels,
            actionsColumn: tc('actions'),
          }}
          paginationMode="page"
          renderCells={(adminRow) => (
            <>
              <Table.Cell>{adminRow.id_text}</Table.Cell>
              <Table.Cell>{adminRow.email ?? '-'}</Table.Cell>
              <Table.Cell>
                <StatusBadge variant={adminRow.role === 'superuser' ? 'success' : 'neutral'}>
                  {adminRow.role}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>{crudLabel(adminRow.permissions?.feeds_crud ?? 0)}</Table.Cell>
              <Table.Cell>
                {crudLabel(adminRow.permissions?.feed_takedown_reasons_crud ?? 0)}
              </Table.Cell>
              <Table.Cell>{crudLabel(adminRow.permissions?.admins_crud ?? 0)}</Table.Cell>
              <Table.Cell>{crudLabel(adminRow.permissions?.stats_crud ?? 0)}</Table.Cell>
              <Table.Cell>{crudLabel(adminRow.permissions?.bucket_crud ?? 0)}</Table.Cell>
            </>
          )}
          rows={sortedAdmins}
          searchSyncParams={{ page: '1' }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          sortableColumnIds={[...ADMIN_COLUMN_IDS]}
          onSortChange={(key, order) => {
            setSortBy(key);
            setSortOrder(order);
          }}
        />
      )}
    </ManagementPageShell>
  );
}
