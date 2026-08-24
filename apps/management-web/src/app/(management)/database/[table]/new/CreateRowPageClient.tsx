'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  Alert,
  Breadcrumbs,
  Button,
  FormMaxWidth,
  FormPrimaryActions,
  ManagementPageShell,
  StackForm,
  TextInput,
} from '@podverse/ui';

import {
  createTableRow,
  getTableMeta,
  type TableFieldMeta,
  type TableMeta,
} from '../../../../../lib/requests/database';
import { buildDatabaseRowPath, buildDatabaseTablePath, ROUTES } from '../../../../../lib/routes';

const TABLE_SINGULAR_LABEL_KEYS: Record<string, string> = {
  feed: 'tables.feed.labelSingular',
  feed_takedown_reason: 'tables.feed_takedown_reason.labelSingular',
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
  const tNav = useTranslations('nav');

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
      const rowIdRaw = result[meta?.primaryKeyField ?? 'id'];
      if (typeof rowIdRaw === 'string' || typeof rowIdRaw === 'number') {
        router.push(buildDatabaseRowPath(tableName, rowIdRaw));
      }
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
    <ManagementPageShell
      title={t('createRowTitle', { table: tableSingularLabel })}
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.DATABASE, label: t('title') },
            { href: buildDatabaseTablePath(tableName), label: tableName },
            { label: tc('new') },
          ]}
        />
      }
    >
      {meta && (
        <FormMaxWidth>
          <StackForm onSubmit={(e) => void handleSubmit(e)}>
            {settableFields.map((field: TableFieldMeta) => (
              <TextInput
                key={field.name}
                id={field.name}
                eyebrow={`${field.name}${!field.nullable ? ' *' : ''}`}
                type="text"
                value={String(formData[field.name] ?? '')}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                required={!field.nullable}
                placeholder={field.type}
              />
            ))}
            <Alert>{error}</Alert>
            <FormPrimaryActions>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(buildDatabaseTablePath(tableName))}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tc('creating') : tc('create')}
              </Button>
            </FormPrimaryActions>
          </StackForm>
        </FormMaxWidth>
      )}
    </ManagementPageShell>
  );
}
