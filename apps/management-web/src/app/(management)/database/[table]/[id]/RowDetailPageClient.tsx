'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  ActionLink,
  Alert,
  Breadcrumbs,
  Button,
  DescriptionList,
  DescriptionListRow,
  FormContainer,
  FormGroup,
  FormPrimaryActions,
  FormStack,
  Input,
  Label,
  ManagementPageShell,
  PageHeaderActions,
  StatusBadge,
} from '@podverse/ui';

import {
  deleteTableRow,
  getTableMeta,
  type TableFieldMeta,
  type TableMeta,
  updateTableRow,
} from '../../../../../lib/requests/database';

const TABLE_SINGULAR_LABEL_KEYS: Record<string, string> = {
  feed: 'tables.feed.labelSingular',
  feed_takedown_reason: 'tables.feed_takedown_reason.labelSingular',
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
    <ManagementPageShell
      title={t('rowDetailTitle', { table: tableSingularLabel, id: rowId })}
      headerChildren={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/database', label: t('title') },
            { href: `/database/${tableName}`, label: tableName },
            { label: `#${rowId}` },
          ]}
        />
      }
    >
      <FormStack>
        {error && <Alert>{error}</Alert>}
        {success && <Alert variant="success">{t('rowUpdatedSuccessfully')}</Alert>}

        {!editing ? (
          <>
            <DescriptionList variant="rows">
              {displayFields.map((field: TableFieldMeta) => (
                <DescriptionListRow
                  key={field.name}
                  detail={formatDate(row[field.name])}
                  term={field.name}
                />
              ))}
            </DescriptionList>
            <PageHeaderActions>
              {!meta?.readOnly && updatableFields.length > 0 && (
                <Button onClick={startEditing} disabled={loading}>
                  {tc('edit')}
                </Button>
              )}
              {!meta?.readOnly && (
                <Button
                  onClick={() => {
                    void handleDelete();
                  }}
                  variant="danger"
                  disabled={loading}
                >
                  {tc('delete')}
                </Button>
              )}
              {meta?.readOnly && <StatusBadge variant="warning">{tc('readOnlyTable')}</StatusBadge>}
              <ActionLink href={`/database/${tableName}`} variant="subtle" LinkComponent={Link}>
                {tc('back')}
              </ActionLink>
            </PageHeaderActions>
          </>
        ) : (
          <FormContainer onSubmit={(e) => void handleUpdate(e)}>
            {updatableFields.map((field: TableFieldMeta) => (
              <FormGroup key={field.name}>
                <Label htmlFor={`edit-${field.name}`}>
                  {field.name}
                  {!field.nullable ? <span aria-hidden="true"> *</span> : null}
                </Label>
                <Input
                  id={`edit-${field.name}`}
                  type="text"
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={!field.nullable}
                  placeholder={field.type}
                />
              </FormGroup>
            ))}
            <FormPrimaryActions>
              <Button type="button" onClick={cancelEditing} variant="link">
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tc('saving') : tc('saveChanges')}
              </Button>
            </FormPrimaryActions>
          </FormContainer>
        )}
      </FormStack>
    </ManagementPageShell>
  );
}
