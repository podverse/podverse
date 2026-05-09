'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { ExtensionConfigFieldMeta, ExtensionKind } from '@podverse/extensions-sdk';
import {
  Alert,
  Breadcrumbs,
  Button,
  FormMaxWidth,
  FormPrimaryActions,
  ManagementPageShell,
  showToast,
  StackForm,
  SwitchButton,
  TextInput,
} from '@podverse/ui';

import { AutoConfigForm } from '../../../../lib/extensions/AutoConfigForm';
import {
  type ExtensionDetail,
  type ExtensionsUpdateBody,
  reqExtensionsUpdate,
} from '../../../../lib/requests/extensions';

import styles from './ExtensionDetailPageClient.module.scss';

type ValidationErrors = Record<string, string>;

type ExtensionDetailManifest = {
  id: string;
  name: string;
  description: string;
  kind: ExtensionKind;
  configSchema: {
    fields: Record<string, ExtensionConfigFieldMeta>;
    describe: unknown;
  };
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredFieldMap(manifest: ExtensionDetailManifest): Record<string, boolean> {
  const describeValue = manifest.configSchema.describe;
  if (!isObjectRecord(describeValue) || !isObjectRecord(describeValue.keys)) {
    return {};
  }

  const result: Record<string, boolean> = {};
  for (const [fieldName, fieldDescribeValue] of Object.entries(describeValue.keys)) {
    const flagsValue = isObjectRecord(fieldDescribeValue) ? fieldDescribeValue.flags : undefined;
    const presenceValue = isObjectRecord(flagsValue) ? flagsValue.presence : undefined;
    result[fieldName] = presenceValue === 'required';
  }
  return result;
}

function buildUpdateConfig(
  manifest: ExtensionDetailManifest,
  config: Record<string, unknown>
): Record<string, unknown> {
  const requiredMap = requiredFieldMap(manifest);
  const result: Record<string, unknown> = {};

  for (const [fieldName, fieldMeta] of Object.entries(manifest.configSchema.fields)) {
    if (!fieldMeta.userEditable) {
      continue;
    }

    const rawValue = config[fieldName];
    if (rawValue === undefined) {
      continue;
    }

    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (fieldMeta.secret && trimmed === '') {
        continue;
      }
      if (trimmed === '' && requiredMap[fieldName] !== true) {
        continue;
      }
      result[fieldName] = rawValue;
      continue;
    }

    result[fieldName] = rawValue;
  }

  return result;
}

export type ExtensionDetailPageClientProps = {
  extension: ExtensionDetail;
  manifest: ExtensionDetailManifest;
};

export function ExtensionDetailPageClient({ extension, manifest }: ExtensionDetailPageClientProps) {
  const router = useRouter();

  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const t = useTranslations('extensions');

  const [enabled, setEnabled] = useState<boolean>(extension.enabled);
  const [config, setConfig] = useState<Record<string, unknown>>(
    extension.config ?? extension.resolved.config
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidationErrors = useMemo(
    () => Object.keys(validationErrors).length > 0,
    [validationErrors]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (hasValidationErrors) {
      setError(t('fixValidationErrors'));
      showToast(t('saveErrorToast'), 'error');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const body: ExtensionsUpdateBody = {
        enabled,
        config: buildUpdateConfig(manifest, config),
      };

      await reqExtensionsUpdate(extension.id, body);

      showToast(t('saveSuccessToast'), 'success');
      router.push('/extensions');
    } catch {
      setError(t('saveError'));
      showToast(t('saveErrorToast'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/dashboard', label: tNav('dashboard') },
            { href: '/extensions', label: t('title') },
            { label: extension.name },
          ]}
        />
      }
      title={extension.name}
    >
      <div className={styles.detailPage}>
        <section className={styles.metaSection}>
          <h2 className={styles.sectionTitle}>{t('manifestSectionTitle')}</h2>
          <div className={styles.metaGrid}>
            <div>
              <div className={styles.metaTerm}>{t('meta.id')}</div>
              <div className={styles.metaValue}>{extension.id}</div>
            </div>
            <div>
              <div className={styles.metaTerm}>{t('meta.kind')}</div>
              <div className={styles.metaValue}>{extension.kind}</div>
            </div>
            <div>
              <div className={styles.metaTerm}>{t('meta.description')}</div>
              <div className={styles.metaValue}>{extension.description || '—'}</div>
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>{t('configurationSectionTitle')}</h2>
          <p className={styles.formIntro}>{t('configurationSectionDescription')}</p>

          <FormMaxWidth>
            <StackForm onSubmit={(event) => void handleSubmit(event)}>
              <SwitchButton
                checked={enabled}
                label={t('enabledFieldLabel')}
                stateOffLabel={t('disabled')}
                stateOnLabel={t('enabled')}
                onChange={setEnabled}
              />

              <AutoConfigForm
                configSchemaFields={manifest.configSchema.fields}
                rootSchemaDescription={manifest.configSchema.describe}
                extensionId={manifest.id}
                value={config}
                onChange={setConfig}
                onValidationChange={setValidationErrors}
              />

              {hasValidationErrors ? (
                <TextInput
                  aria-label={t('validationSummaryLabel')}
                  infoError={t('fixValidationErrors')}
                  readOnly
                  value=""
                />
              ) : null}

              <Alert>{error}</Alert>

              <FormPrimaryActions>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/extensions')}
                >
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={isSaving || hasValidationErrors}>
                  {isSaving ? tc('saving') : tc('saveChanges')}
                </Button>
              </FormPrimaryActions>
            </StackForm>
          </FormMaxWidth>
        </section>
      </div>
    </ManagementPageShell>
  );
}
