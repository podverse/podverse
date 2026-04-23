'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  deleteTableRow,
  getTableMeta,
  type TableFieldMeta,
  type TableMeta,
  updateTableRow,
} from '../../../../../lib/requests/database';

import styles from '../../page.module.scss';

const TABLE_SINGULAR_LABEL_KEYS: Record<string, string> = {
  feed: 'tables.feed.labelSingular',
  feed_flag_status: 'tables.feed_flag_status.labelSingular',
  feed_flag_status_reason: 'tables.feed_flag_status_reason.labelSingular',
};

export type RowDetailPageClientProps = {
  tableName: string;
  rowId: number;
  initialRow: Record<string, unknown>;
};

export function RowDetailPageClient({ tableName, rowId, initialRow }: RowDetailPageClientProps) {
  const router = useRouter();
  const [meta, setMeta] = useState<TableMeta | null>(null);
  const [row, setRow] = useState<Record<string, unknown>>(initialRow);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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

  const startEditing = () => {
    setFormData({ ...row });
    setEditing(true);
    setError(null);
    setSuccess(false);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFormData({});
    setError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const data: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== row[key]) {
          data[key] = value === '' ? null : value;
        }
      }
      if (Object.keys(data).length > 0) {
        const updated = await updateTableRow(tableName, rowId, data);
        setRow(updated);
      }
      setEditing(false);
      setSuccess(true);
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      setError(typeof raw === 'string' && raw.length > 0 ? raw : t('failedToUpdateRow'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await deleteTableRow(tableName, rowId);
      router.push(`/database/${tableName}`);
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      setError(typeof raw === 'string' && raw.length > 0 ? raw : t('failedToDeleteRow'));
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value || null }));
  };

  const formatDate = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' && value.includes('T')) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  const updatableFields = meta ? meta.fields.filter((f) => f.updatable) : [];

  const displayFields = meta ? meta.fields.filter((f) => !editing || f.updatable) : [];

  const tableSingularLabel = TABLE_SINGULAR_LABEL_KEYS[tableName]
    ? t(TABLE_SINGULAR_LABEL_KEYS[tableName])
    : tableName;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">
          {t('rowDetailTitle', { table: tableSingularLabel, id: rowId })}
        </h1>
        <div className={styles.breadcrumbs}>
          <Link href="/database" className={styles.breadcrumbLink}>
            {t('title')}
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <Link href={`/database/${tableName}`} className={styles.breadcrumbLink}>
            {tableName}
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>#{rowId}</span>
        </div>
      </div>
      <main>
        {error && <p className={styles.errorText}>{error}</p>}
        {success && <p className={styles.successText}>{t('rowUpdatedSuccessfully')}</p>}

        {!editing ? (
          <>
            <table className={styles.dataTable}>
              <tbody>
                {displayFields.map((field: TableFieldMeta) => (
                  <tr key={field.name}>
                    <th style={{ width: '200px' }}>{field.name}</th>
                    <td>{formatDate(row[field.name])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.formActions} style={{ marginTop: '1rem' }}>
              {!meta?.readOnly && updatableFields.length > 0 && (
                <button onClick={startEditing} className={styles.submitButton} disabled={loading}>
                  {tc('edit')}
                </button>
              )}
              {!meta?.readOnly && (
                <button onClick={handleDelete} className={styles.deleteButton} disabled={loading}>
                  {tc('delete')}
                </button>
              )}
              {meta?.readOnly && (
                <span className={`${styles.tableCardBadge} ${styles.readOnlyBadge}`}>
                  {tc('readOnlyTable')}
                </span>
              )}
              <Link href={`/database/${tableName}`} className={styles.cancelLink}>
                {tc('back')}
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleUpdate} className={styles.form}>
            {updatableFields.map((field: TableFieldMeta) => (
              <div key={field.name} className={styles.formGroup}>
                <label className={styles.label} htmlFor={`edit-${field.name}`}>
                  {field.name}
                  {!field.nullable && <span style={{ color: '#c33' }}> *</span>}
                </label>
                <input
                  id={`edit-${field.name}`}
                  type="text"
                  className={styles.input}
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={!field.nullable}
                  placeholder={field.type}
                />
              </div>
            ))}
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? tc('saving') : tc('saveChanges')}
              </button>
              <button type="button" onClick={cancelEditing} className={styles.cancelLink}>
                {tc('cancel')}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
