'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActionLink,
  Alert,
  Breadcrumbs,
  ManagementPageShell,
  PageHeaderActions,
  ResourceTableWithFilter,
  type SortDirection,
  StatusBadge,
  Table,
} from '@podverse/ui';

import { ManagementProbeChromeGate } from '../../../components/ManagementProbeChromeGate/ManagementProbeChromeGate';
import { useManagementTableChrome } from '../../../components/Table/managementTableChrome';
import { ManagementIconButtonLink } from '../../../lib/ManagementIconButtonLink';
import { resolveManagementProbeChromePhase } from '../../../lib/managementProbeChromeGate';
import { managementSearchParamsObject } from '../../../lib/managementTableUrl';
import { deleteUser, listUsers, probeUsersExist, type User } from '../../../lib/requests/users';
import { resolveManagementTableEmptyState } from '../../../lib/tableEmptyState';

const USER_COLUMN_IDS = ['id_text', 'email', 'username', 'verified', 'created_at'] as const;

function sortUsers(rows: User[], sortKey: string, order: SortDirection): User[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === 'verified') {
      const av = a.verified === true ? 1 : 0;
      const bv = b.verified === true ? 1 : 0;
      if (av !== bv) {
        return av > bv ? dir : -dir;
      }
      return 0;
    }
    const av = a[sortKey as keyof User];
    const bv = b[sortKey as keyof User];
    if (sortKey === 'created_at') {
      const da = av !== null && av !== undefined ? new Date(String(av)).getTime() : 0;
      const db = bv !== null && bv !== undefined ? new Date(String(bv)).getTime() : 0;
      if (da !== db) {
        return da > db ? dir : -dir;
      }
      return 0;
    }
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

export function UsersListPageClient() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const chrome = useManagementTableChrome();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const basePath = pathname !== null && pathname !== '' ? pathname : '/users';
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );
  const pageFromUrl = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
  const urlSearch = searchParams.get('search') ?? '';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(pageFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [probeUsersUnscopedExist, setProbeUsersUnscopedExist] = useState<boolean | undefined>(
    undefined
  );

  const [sortBy, setSortBy] = useState<string>('id_text');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');

  useEffect(() => {
    setPage(pageFromUrl);
  }, [pageFromUrl]);

  const loadUsers = useCallback(
    async (p: number, s?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listUsers({ page: p, limit: 25, search: s || undefined });
        setUsers(result.users);
        setListTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
        setPage(result.pagination.page);
      } catch {
        setError(t('failedToLoad'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadUsers(pageFromUrl, urlSearch);
  }, [loadUsers, pageFromUrl, urlSearch]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (urlSearch.trim() === '') {
      setProbeUsersUnscopedExist(undefined);
      return;
    }
    if (users.length > 0) {
      setProbeUsersUnscopedExist(true);
      return;
    }
    let cancelled = false;
    void probeUsersExist().then((exists) => {
      if (!cancelled) {
        setProbeUsersUnscopedExist(exists);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loading, urlSearch, users.length]);

  const sortedUsers = useMemo(
    () => sortUsers(users, sortBy, sortOrder),
    [users, sortBy, sortOrder]
  );

  const pushPageToUrl = useCallback(
    (nextPage: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set('page', String(nextPage));
      router.push(`${basePath}?${p.toString()}`);
    },
    [basePath, router, searchParams]
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
        header: t('tableHeaders.username'),
        id: 'username',
        label: t('tableHeaders.username'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.username'))),
        sortKey: 'username',
      },
      {
        header: t('tableHeaders.verified'),
        id: 'verified',
        label: t('tableHeaders.verified'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.verified'))),
        sortKey: 'verified',
      },
      {
        header: t('tableHeaders.createdAt'),
        id: 'created_at',
        label: t('tableHeaders.createdAt'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.createdAt'))),
        sortKey: 'created_at',
      },
    ],
    [chrome, t]
  );

  const hasDataInSystem = loading
    ? undefined
    : urlSearch.trim() === ''
      ? listTotal > 0
      : probeUsersUnscopedExist === undefined
        ? undefined
        : probeUsersUnscopedExist;

  const usersTableEmptyState = resolveManagementTableEmptyState({
    filteredEmptyMessage: t('noResults'),
    hasDataInSystem,
    hasVisibleRows: sortedUsers.length > 0,
    systemEmptyMessage: chrome.systemEmptyMessage,
  });

  const probingUsersExistence =
    !loading &&
    urlSearch.trim() !== '' &&
    users.length === 0 &&
    probeUsersUnscopedExist === undefined;

  const systemUsersEmpty = usersTableEmptyState?.mode === 'system-empty';

  const usersChromePhase = resolveManagementProbeChromePhase({
    bypassWhileError: error !== null,
    loading,
    probingExistence: probingUsersExistence,
  });

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: '/dashboard', label: tNav('dashboard') }, { label: t('title') }]}
        />
      }
      title={t('title')}
      headerChildren={
        usersChromePhase === 'content' && !systemUsersEmpty ? (
          <PageHeaderActions>
            <ActionLink href="/users/new" variant="primary" LinkComponent={Link}>
              {tc('createNew')}
            </ActionLink>
          </PageHeaderActions>
        ) : null
      }
    >
      <ManagementProbeChromeGate
        bypassWhileError={error !== null}
        loading={loading}
        probingExistence={probingUsersExistence}
      >
        <>
          <Alert>{error}</Alert>
          {!error && (
            <ResourceTableWithFilter<User>
              actions={{
                LinkComponent: ManagementIconButtonLink,
                editHref: (userRow) => `/users/${userRow.id}/edit`,
                labels: {
                  delete: tc('delete'),
                  edit: tc('edit'),
                  view: tc('view'),
                },
                onDelete: async (userRow) => {
                  await deleteUser(userRow.id);
                  await loadUsers(pageFromUrl, urlSearch);
                },
                viewHref: (userRow) => `/users/${userRow.id}`,
              }}
              allColumnIds={[...USER_COLUMN_IDS]}
              basePath={basePath}
              columns={columns}
              currentQueryParams={currentQueryParams}
              deleteConfirm={{
                ...chrome.deleteConfirmLabels,
                message: () => t('confirmDelete'),
                modalAriaLabel: t('deleteConfirmAria'),
              }}
              emptyState={usersTableEmptyState}
              filterableColumnIds={[...USER_COLUMN_IDS]}
              getRowKey={(userRow) => String(userRow.id)}
              initialColumns={[...USER_COLUMN_IDS]}
              initialSearch={urlSearch}
              labels={{
                ...chrome.filterLabels,
                actionsColumn: tc('actions'),
              }}
              pagination={{
                currentPage: page,
                nextLabel: tc('paginationNextButton'),
                onPageChange: (newPage) => {
                  pushPageToUrl(newPage);
                },
                pageIndicatorLabel: tc('paginationPageOf', {
                  currentPage: page,
                  totalPages,
                }),
                prevLabel: tc('paginationPrevButton'),
                totalPages,
              }}
              paginationMode="page"
              renderCells={(userRow) => (
                <>
                  <Table.Cell>{userRow.id_text}</Table.Cell>
                  <Table.Cell>{userRow.email ?? '-'}</Table.Cell>
                  <Table.Cell>{userRow.username ?? '-'}</Table.Cell>
                  <Table.Cell>
                    <StatusBadge variant={userRow.verified ? 'success' : 'warning'}>
                      {userRow.verified ? tc('yes') : tc('no')}
                    </StatusBadge>
                  </Table.Cell>
                  <Table.Cell>
                    {userRow.created_at ? new Date(userRow.created_at).toLocaleDateString() : '-'}
                  </Table.Cell>
                </>
              )}
              rows={sortedUsers}
              searchSyncParams={{ page: '1' }}
              sortBy={sortBy}
              sortOrder={sortOrder}
              sortableColumnIds={[...USER_COLUMN_IDS]}
              onSortChange={(key, order) => {
                setSortBy(key);
                setSortOrder(order);
              }}
            />
          )}
        </>
      </ManagementProbeChromeGate>
    </ManagementPageShell>
  );
}
