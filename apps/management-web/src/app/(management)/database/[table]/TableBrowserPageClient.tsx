'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { SORT_ARROW_ASC, SORT_ARROW_DESC } from '../../../../lib/constants/sortIndicators';
import { getTableMeta, queryTable, type TableMeta } from '../../../../lib/requests/database';

import styles from '../page.module.scss';

const TABLE_LABEL_KEYS: Record<string, string> = {
  feed: 'tables.feed.label',
  feed_flag_status: 'tables.feed_flag_status.label',
  feed_flag_status_reason: 'tables.feed_flag_status_reason.label',
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
          console.error('Error loading data:', err);
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

  const totalPages = Math.ceil(total / pageSize);

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
      ? t('paginationSummarySingular', { total, page, totalPages: totalPages || 1 })
      : t('paginationSummary', { total, page, totalPages: totalPages || 1 });

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{tableLabel}</h1>
        <div className={styles.breadcrumbs}>
          <Link href="/database" className={styles.breadcrumbLink}>
            {t('title')}
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>{tableName}</span>
        </div>
      </div>
      <main>
        {loading && !meta && <p className={styles.loadingText}>{tc('loading')}</p>}
        {error && <p className={styles.errorText}>{error}</p>}
        {meta && (
          <>
            <div className={styles.actions}>
              {!meta.readOnly && (
                <Link href={`/database/${tableName}/new`} className={styles.actionLink}>
                  {tc('createNew')}
                </Link>
              )}
              {meta.readOnly && (
                <span className={`${styles.tableCardBadge} ${styles.readOnlyBadge}`}>
                  {tc('readOnlyTable')}
                </span>
              )}
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {meta.fields.map((field) => (
                      <th key={field.name} onClick={() => handleSort(field.name)}>
                        {field.name}
                        {sortField === field.name
                          ? sortDir === 'ASC'
                            ? ` ${SORT_ARROW_ASC}`
                            : ` ${SORT_ARROW_DESC}`
                          : ''}
                      </th>
                    ))}
                    <th>{tc('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={String(row[meta.primaryKeyField] ?? idx)}>
                      {meta.fields.map((field) => (
                        <td key={field.name}>{formatDate(row[field.name])}</td>
                      ))}
                      <td>
                        <Link
                          href={`/database/${tableName}/${row[meta.primaryKeyField]}`}
                          className={styles.actionLink}
                        >
                          {tc('view')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={meta.fields.length + 1} style={{ textAlign: 'center' }}>
                        {tc('noDataFound')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>{paginationText}</span>
              <div className={styles.paginationButtons}>
                <button
                  className={styles.paginationButton}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {tc('previous')}
                </button>
                <button
                  className={styles.paginationButton}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('next')}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
