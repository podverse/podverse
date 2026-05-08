'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { NavCard } from '@podverse/ui';
import { Alert, ManagementPageShell, NavCardGrid } from '@podverse/ui';

import { ManagementLoadingSpinnerOverlayStatus } from '../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { getDatabaseTables, type TableMeta } from '../../../lib/requests/database';

import dataSurfaceBusyStyles from '../../../styles/managementDataSurfaceBusy.module.scss';

const TABLE_DESCRIPTION_KEYS: Record<string, string> = {
  feed: 'tables.feed.description',
  feed_takedown_reason: 'tables.feed_takedown_reason.description',
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

  const cards: NavCard[] = tables.map((table) => {
    const metaParts: string[] = [];
    if (table.readOnly) {
      metaParts.push(tc('readOnly'));
    }
    metaParts.push(t('fieldCount', { count: table.fields.length }));
    metaParts.push(getTableDescription(table.tableName));
    return {
      href: `/database/${table.tableName}`,
      title: table.tableName,
      description: metaParts.join(' · '),
    };
  });

  return (
    <ManagementPageShell title={t('title')}>
      <ManagementLoadingSpinnerOverlayStatus isLoading={loading} message={t('loadingTables')} />
      <Alert>{error}</Alert>
      {!error && (
        <div
          aria-busy={loading ? true : undefined}
          className={loading ? dataSurfaceBusyStyles.dataSurfaceBusy : undefined}
        >
          <NavCardGrid cards={cards} LinkComponent={Link} />
        </div>
      )}
    </ManagementPageShell>
  );
}
