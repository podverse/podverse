'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActionLink,
  Alert,
  Breadcrumbs,
  ManagementPageShell,
  PageHeaderActions,
  type SortDirection,
  StatusBadge,
  Table,
  TableWithFilter,
  useTableFilterState,
} from '@podverse/ui';

import { ManagementLoadingSpinnerSmall } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerSmall';
import { useManagementTableChrome } from '../../../../components/Table/managementTableChrome';
import { ManagementIconButtonLink } from '../../../../lib/ManagementIconButtonLink';
import { managementSearchParamsObject } from '../../../../lib/managementTableUrl';
import { getTableMeta, queryTable, type TableMeta } from '../../../../lib/requests/database';

const TABLE_LABEL_KEYS: Record<string, string> = {
  feed: 'tables.feed.label',
  feed_takedown_reason: 'tables.feed_takedown_reason.label',
};

export type TableBrowserPageClientProps = {
  tableName: string;
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' && value.includes('T')) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

export function TableBrowserPageClient({ tableName }: TableBrowserPageClientProps) {
  const [meta, setMeta] = useState<TableMeta | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('database');
  const tc = useTranslations('common');
  const chrome = useManagementTableChrome();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname !== null && pathname !== '' ? pathname : `/database/${tableName}`;
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );
  const initialSearch = searchParams.get('search') ?? '';

  const sortUiOrder: SortDirection = sortDir === 'ASC' ? 'asc' : 'desc';

  const fieldNames = useMemo(() => (meta !== null ? meta.fields.map((f) => f.name) : []), [meta]);

  const filter = useTableFilterState({
    allColumnIds: fieldNames,
    basePath,
    currentQueryParams,
    initialColumns: fieldNames.length > 0 ? fieldNames : [],
    initialSearch,
    searchSyncParams: { page: '1' },
  });

  useEffect(() => {
    let cancelled = false;

    const loadMeta = async () => {
      try {
        const m = await getTableMeta(tableName);
        if (!cancelled) {
          setMeta(m);
          setSortField(m.defaultSortField);
          setSortDir(m.defaultSortDirection);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('failedToLoadMeta'));
          console.error('Error loading table meta:', err);
          setLoading(false);
        }
      }
    };

    void loadMeta();

    return () => {
      cancelled = true;
    };
  }, [tableName, t]);

  useEffect(() => {
    if (!meta) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await queryTable(tableName, {
          sorts: [{ field: sortField, direction: sortDir }],
          page,
          pageSize,
        });
        if (!cancelled) {
          setRows(result.rows);
          setTotal(result.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('failedToLoadData'));
          console.error('Error loading table data:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [meta, tableName, sortField, sortDir, page, pageSize, t]);

  const displayedRows = useMemo(() => {
    let list = [...rows];
    const q = filter.search.trim().toLowerCase();
    if (q !== '' && meta !== null) {
      const cols =
        filter.selectedColumnIds.length > 0
          ? filter.selectedColumnIds
          : meta.fields.map((f) => f.name);
      list = list.filter((row) =>
        cols.some((col) => {
          const v = row[col];
          return String(v ?? '')
            .toLowerCase()
            .includes(q);
        })
      );
    }
    return list;
  }, [rows, meta, filter.search, filter.selectedColumnIds]);

  const columns = useMemo(() => {
    if (meta === null) {
      return [];
    }
    const fieldCols = meta.fields.map((field) => ({
      header: field.name,
      id: field.name,
      label: field.name,
      sortAriaLabel: chrome.sortAriaForColumn(field.name),
      sortKey: field.name,
    }));
    return [
      ...fieldCols,
      {
        header: tc('actions'),
        id: '__actions',
        label: tc('actions'),
        sortable: false,
      },
    ];
  }, [chrome, meta, tc]);

  const handleSortChange = useCallback((key: string, order: SortDirection) => {
    setSortField(key);
    setSortDir(order === 'asc' ? 'ASC' : 'DESC');
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const paginationText =
    total === 1
      ? t('paginationSummarySingular', { total, page, totalPages })
      : t('paginationSummary', { total, page, totalPages });

  const tableLabel = TABLE_LABEL_KEYS[tableName] ? t(TABLE_LABEL_KEYS[tableName]) : tableName;

  return (
    <ManagementPageShell
      title={tableLabel}
      headerChildren={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: '/database', label: t('title') }, { label: tableName }]}
        />
      }
    >
      {loading && !meta && <ManagementLoadingSpinnerSmall />}
      <Alert>{error}</Alert>
      {meta && (
        <>
          <PageHeaderActions>
            {!meta.readOnly && (
              <ActionLink href={`/database/${tableName}/new`} variant="inline" LinkComponent={Link}>
                {tc('createNew')}
              </ActionLink>
            )}
            {meta.readOnly && <StatusBadge variant="warning">{tc('readOnlyTable')}</StatusBadge>}
          </PageHeaderActions>
          <TableWithFilter
            columns={columns}
            emptyMessage={displayedRows.length === 0 ? tc('noDataFound') : undefined}
            filter={filter}
            filterableColumnIds={meta.fields.map((f) => f.name)}
            getRowKey={(row) => String(row[meta.primaryKeyField] ?? '')}
            labels={chrome.filterLabels}
            pagination={{
              currentPage: page,
              nextLabel: tc('next'),
              onPageChange: (newPage) => {
                setPage(newPage);
              },
              pageIndicatorLabel: paginationText,
              prevLabel: tc('previous'),
              totalPages,
            }}
            paginationMode="page"
            renderCells={(row) => (
              <>
                {meta.fields.map((field) => (
                  <Table.Cell key={field.name}>{formatCell(row[field.name])}</Table.Cell>
                ))}
                <Table.Cell>
                  <Table.RowActions>
                    <Table.IconViewLink
                      LinkComponent={ManagementIconButtonLink}
                      ariaLabel={`${tc('view')} ${String(row[meta.primaryKeyField])}`}
                      href={`/database/${tableName}/${String(row[meta.primaryKeyField])}`}
                      title={tc('view')}
                    />
                  </Table.RowActions>
                </Table.Cell>
              </>
            )}
            rows={displayedRows}
            sortBy={sortField}
            sortOrder={sortUiOrder}
            sortableColumnIds={meta.fields.map((f) => f.name)}
            onSortChange={handleSortChange}
          />
        </>
      )}
    </ManagementPageShell>
  );
}
