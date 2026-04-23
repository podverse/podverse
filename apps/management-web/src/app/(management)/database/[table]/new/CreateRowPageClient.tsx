'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  createTableRow,
  getTableMeta,
  type TableFieldMeta,
  type TableMeta,
} from '../../../../../lib/requests/database';

import styles from '../../page.module.scss';

const TABLE_SINGULAR_LABEL_KEYS: Record<string, string> = {
  feed: 'tables.feed.labelSingular',
  feed_flag_status: 'tables.feed_flag_status.labelSingular',
  feed_flag_status_reason: 'tables.feed_flag_status_reason.labelSingular',
};

export type CreateRowPageClientProps = {
  tableName: string;
};

export function CreateRowPageClient({ tableName }: CreateRowPageClientProps) {
  const router = useRouter();
  const [meta, setMeta] = useState<TableMeta | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
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
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('failedToLoadMeta'));
          console.error('Error:', err);
        }
      }
    };

    void loadMeta();

    return () => {
      cancelled = true;
    };
  }, [tableName, t]);

  const settableFields = meta
    ? meta.fields.filter(
        (f) => f.name !== meta.primaryKeyField && f.name !== 'created_at' && f.name !== 'updated_at'
      )
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== '' && value !== undefined) {
          data[key] = value;
        }
      }
      const result = await createTableRow(tableName, data);
      router.push(`/database/${tableName}/${result[meta?.primaryKeyField ?? 'id']}`);
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      setError(typeof raw === 'string' && raw.length > 0 ? raw : t('failedToCreateRow'));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value || null }));
  };

  const tableSingularLabel = TABLE_SINGULAR_LABEL_KEYS[tableName]
    ? t(TABLE_SINGULAR_LABEL_KEYS[tableName])
    : tableName;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('createRowTitle', { table: tableSingularLabel })}</h1>
        <div className={styles.breadcrumbs}>
          <Link href="/database" className={styles.breadcrumbLink}>
            {t('title')}
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <Link href={`/database/${tableName}`} className={styles.breadcrumbLink}>
            {tableName}
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>{tc('new')}</span>
        </div>
      </div>
      <main>
        {meta && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {settableFields.map((field: TableFieldMeta) => (
              <div key={field.name} className={styles.formGroup}>
                <label className={styles.label} htmlFor={field.name}>
                  {field.name}
                  {!field.nullable && <span style={{ color: '#c33' }}> *</span>}
                </label>
                <input
                  id={field.name}
                  type="text"
                  className={styles.input}
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={!field.nullable}
                  placeholder={field.type}
                />
              </div>
            ))}
            {error && <p className={styles.errorText}>{error}</p>}
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? tc('creating') : tc('create')}
              </button>
              <Link href={`/database/${tableName}`} className={styles.cancelLink}>
                {tc('cancel')}
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
