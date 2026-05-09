'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import {
  Breadcrumbs,
  ManagementPageShell,
  ResourceTableWithFilter,
  type SortDirection,
  StatusBadge,
  Table,
} from '@podverse/ui';

import { useManagementTableChrome } from '../../../components/Table/managementTableChrome';
import { managementSearchParamsObject } from '../../../lib/managementTableUrl';
import { type ExtensionListItem } from '../../../lib/requests/extensions';
import { resolveManagementTableEmptyState } from '../../../lib/tableEmptyState';

import styles from './ExtensionsListPageClient.module.scss';

const EXTENSIONS_COLUMN_IDS = ['name', 'kind', 'enabled', 'updatedAt'] as const;

function parseDateToTime(value: string | null): number {
  if (value === null || value === '') {
    return 0;
  }
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortExtensions(
  rows: ExtensionListItem[],
  sortKey: string,
  order: SortDirection
): ExtensionListItem[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === 'enabled') {
      const av = a.enabled ? 1 : 0;
      const bv = b.enabled ? 1 : 0;
      return (av - bv) * dir;
    }

    if (sortKey === 'updatedAt') {
      return (parseDateToTime(a.updatedAt) - parseDateToTime(b.updatedAt)) * dir;
    }

    const av = a[sortKey as keyof ExtensionListItem];
    const bv = b[sortKey as keyof ExtensionListItem];
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

export type ExtensionsListPageClientProps = {
  initialExtensions: ExtensionListItem[];
};

export function ExtensionsListPageClient({ initialExtensions }: ExtensionsListPageClientProps) {
  const t = useTranslations('extensions');
  const tNav = useTranslations('nav');
  const tc = useTranslations('common');
  const tsTable = useTranslations('tableShared');

  const chrome = useManagementTableChrome();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const basePath = pathname !== null && pathname !== '' ? pathname : '/extensions';
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );
  const urlSearch = searchParams.get('search') ?? '';

  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');

  const sortedExtensions = useMemo(
    () => sortExtensions(initialExtensions, sortBy, sortOrder),
    [initialExtensions, sortBy, sortOrder]
  );

  const filteredExtensions = useMemo(() => {
    const q = urlSearch.trim().toLowerCase();
    if (q === '') {
      return sortedExtensions;
    }

    return sortedExtensions.filter((row) => {
      return (
        row.id.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.kind.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q)
      );
    });
  }, [sortedExtensions, urlSearch]);

  const extensionsTableEmptyState = resolveManagementTableEmptyState({
    filteredEmptyMessage: tsTable('noResults'),
    hasDataInSystem: initialExtensions.length > 0,
    hasVisibleRows: filteredExtensions.length > 0,
    systemEmptyMessage: t('emptySystemMessage'),
  });

  const columns = useMemo(
    () => [
      {
        header: t('tableHeaders.name'),
        id: 'name',
        label: t('tableHeaders.name'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.name'))),
        sortKey: 'name',
      },
      {
        header: t('tableHeaders.kind'),
        id: 'kind',
        label: t('tableHeaders.kind'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.kind'))),
        sortKey: 'kind',
      },
      {
        header: t('tableHeaders.enabled'),
        id: 'enabled',
        label: t('tableHeaders.enabled'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.enabled'))),
        sortKey: 'enabled',
      },
      {
        header: t('tableHeaders.lastUpdated'),
        id: 'updatedAt',
        label: t('tableHeaders.lastUpdated'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableHeaders.lastUpdated'))),
        sortKey: 'updatedAt',
      },
    ],
    [chrome, t]
  );

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
    >
      <div className={styles.tableWrap}>
        <ResourceTableWithFilter<ExtensionListItem>
          allColumnIds={[...EXTENSIONS_COLUMN_IDS]}
          basePath={basePath}
          columns={columns}
          currentQueryParams={currentQueryParams}
          deleteConfirm={{
            ...chrome.deleteConfirmLabels,
            message: () => '',
            modalAriaLabel: chrome.deleteConfirmLabels.modalAriaLabel,
          }}
          emptyState={extensionsTableEmptyState}
          filterableColumnIds={[...EXTENSIONS_COLUMN_IDS]}
          getRowKey={(row) => row.id}
          initialColumns={[...EXTENSIONS_COLUMN_IDS]}
          initialSearch={urlSearch}
          labels={{
            ...chrome.filterLabels,
            actionsColumn: tc('actions'),
          }}
          paginationMode="page"
          renderCells={(row) => (
            <>
              <Table.Cell>{row.name}</Table.Cell>
              <Table.Cell>{row.kind}</Table.Cell>
              <Table.Cell>
                <StatusBadge variant={row.enabled ? 'success' : 'neutral'}>
                  {row.enabled ? t('enabled') : t('disabled')}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>
                {row.updatedAt !== null && row.updatedAt !== ''
                  ? new Date(row.updatedAt).toLocaleString()
                  : '—'}
              </Table.Cell>
            </>
          )}
          rows={filteredExtensions}
          searchSyncParams={{ page: '1' }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          sortableColumnIds={[...EXTENSIONS_COLUMN_IDS]}
          onRowClick={(row) => {
            router.push(`/extensions/${encodeURIComponent(row.id)}`);
          }}
          onSortChange={(key, order) => {
            setSortBy(key);
            setSortOrder(order);
          }}
        />
      </div>
    </ManagementPageShell>
  );
}
