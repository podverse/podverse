'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  ActionLink,
  Alert,
  Breadcrumbs,
  Button,
  FlexBetween,
  LoadingText,
  ManagementPageShell,
  PageHeaderActions,
  PaginationSummaryLine,
  StatusBadge,
  Table,
} from '@podverse/ui';

import { SORT_ARROW_ASC, SORT_ARROW_DESC } from '../../../../lib/constants/sortIndicators';
import { getTableMeta, queryTable, type TableMeta } from '../../../../lib/requests/database';

const TABLE_LABEL_KEYS: Record<string, string> = {
  feed: 'tables.feed.label',
  feed_takedown_reason: 'tables.feed_takedown_reason.label',
};

export type TableBrowserPageClientProps = {
  tableName: string;
};

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortField(field);
      setSortDir('ASC');
    }
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatDate = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' && value.includes('T')) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  const tableLabel = TABLE_LABEL_KEYS[tableName] ? t(TABLE_LABEL_KEYS[tableName]) : tableName;
  const paginationText =
    total === 1
      ? t('paginationSummarySingular', { total, page, totalPages })
      : t('paginationSummary', { total, page, totalPages });

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
      {loading && !meta && <LoadingText>{tc('loading')}</LoadingText>}
      {error && <Alert>{error}</Alert>}
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
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  {meta.fields.map((field) => (
                    <th key={field.name} scope="col" onClick={() => handleSort(field.name)}>
                      {field.name}
                      {sortField === field.name
                        ? sortDir === 'ASC'
                          ? ` ${SORT_ARROW_ASC}`
                          : ` ${SORT_ARROW_DESC}`
                        : ''}
                    </th>
                  ))}
                  <Table.HeaderCell>{tc('actions')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {rows.map((row, idx) => (
                  <Table.Row key={String(row[meta.primaryKeyField] ?? idx)}>
                    {meta.fields.map((field) => (
                      <Table.Cell key={field.name}>{formatDate(row[field.name])}</Table.Cell>
                    ))}
                    <Table.Cell>
                      <ActionLink
                        href={`/database/${tableName}/${row[meta.primaryKeyField]}`}
                        variant="inline"
                        LinkComponent={Link}
                      >
                        {tc('view')}
                      </ActionLink>
                    </Table.Cell>
                  </Table.Row>
                ))}
                {rows.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={meta.fields.length + 1} style={{ textAlign: 'center' }}>
                      {tc('noDataFound')}
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>
          <FlexBetween>
            <PaginationSummaryLine>{paginationText}</PaginationSummaryLine>
            <PageHeaderActions>
              <Button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                type="button"
                variant="secondary"
              >
                {tc('previous')}
              </Button>
              <Button
                disabled={page >= totalPages || total === 0}
                onClick={() => setPage((p) => p + 1)}
                type="button"
                variant="secondary"
              >
                {tc('next')}
              </Button>
            </PageHeaderActions>
          </FlexBetween>
        </>
      )}
    </ManagementPageShell>
  );
}
