'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { getDatabaseTables, type TableMeta } from '../../../lib/requests/database';

import styles from './page.module.scss';

const TABLE_DESCRIPTION_KEYS: Record<string, string> = {
  feed: 'tables.feed.description',
  feed_flag_status: 'tables.feed_flag_status.description',
  feed_flag_status_reason: 'tables.feed_flag_status_reason.description',
};

export function DatabaseIndexPageClient() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('database');
  const tc = useTranslations('common');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await getDatabaseTables();
        if (!cancelled) {
          setTables(result.tables);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('failedToLoadTables'));
          console.error('Error loading tables:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const getTableDescription = (tableName: string): string => {
    const key = TABLE_DESCRIPTION_KEYS[tableName];
    return key ? t(key) : t('manageTableData');
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('title')}</h1>
      </div>
      <main>
        {loading && <p className={styles.loadingText}>{t('loadingTables')}</p>}
        {error && <p className={styles.errorText}>{error}</p>}
        {!loading && !error && (
          <div className={styles.tableList}>
            {tables.map((table) => (
              <Link
                key={table.tableName}
                href={`/database/${table.tableName}`}
                className={styles.tableCard}
              >
                <div className={styles.tableCardHeader}>
                  <h2 className={styles.tableCardTitle}>{table.tableName}</h2>
                  <div className={styles.tableCardBadges}>
                    {table.readOnly && (
                      <span className={`${styles.tableCardBadge} ${styles.readOnlyBadge}`}>
                        {tc('readOnly')}
                      </span>
                    )}
                    <span className={styles.tableCardBadge}>
                      {t('fieldCount', { count: table.fields.length })}
                    </span>
                  </div>
                </div>
                <p className={styles.tableCardDesc}>{getTableDescription(table.tableName)}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
