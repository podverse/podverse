'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

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
  CUSTOM_ROLE_SELECTION_ID,
  emptyPermissionState,
  type PermissionState,
} from '../../../../../components/admins/adminPermissionModel.js';
import { AdminPermissionsSection } from '../../../../../components/admins/AdminPermissionsSection.js';
import { createManagementAdminRole } from '../../../../../lib/requests/adminRoles.js';

export function AdminRoleTemplatePageClient({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<PermissionState>(emptyPermissionState());
  const [, setSelectedRoleId] = useState(CUSTOM_ROLE_SELECTION_ID);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('admins.roleTemplates');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const tAdmins = useTranslations('admins');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') {
      setError(t('nameRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createManagementAdminRole({
        name: trimmed,
        feeds_crud: permissions.feeds_crud,
        feed_takedown_reasons_crud: permissions.feed_takedown_reasons_crud,
        admins_crud: permissions.admins_crud,
        stats_crud: permissions.stats_crud,
        billing_prices_crud: permissions.billing_prices_crud,
        bucket_crud: permissions.bucket_crud,
      });
      router.push(returnUrl);
      router.refresh();
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      const message = typeof raw === 'string' && raw.length > 0 ? raw : t('createFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagementPageShell
      title={t('pageTitle')}
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/dashboard', label: tNav('dashboard') },
            { href: '/admins', label: tAdmins('title') },
            { label: t('pageTitle') },
          ]}
        />
      }
    >
      <FormMaxWidth>
        <StackForm onSubmit={(e) => void handleSubmit(e)}>
          <TextInput
            autoComplete="off"
            eyebrow={t('templateName')}
            id="admin-role-template-name"
            onChange={(e) => setName(e.target.value)}
            type="text"
            value={name}
          />
          <AdminPermissionsSection
            bootstrapHighestRole={false}
            createRoleReturnUrl={returnUrl}
            matchInitialPermissions={undefined}
            onPermissionsChange={setPermissions}
            onSelectedRoleIdChange={setSelectedRoleId}
            permissions={permissions}
            selectedRoleId={CUSTOM_ROLE_SELECTION_ID}
            showRolePicker={false}
          />
          <Alert>{error}</Alert>
          <FormPrimaryActions>
            <Button type="button" variant="secondary" onClick={() => router.push(returnUrl)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? tc('creating') : t('saveTemplate')}
            </Button>
          </FormPrimaryActions>
        </StackForm>
      </FormMaxWidth>
    </ManagementPageShell>
  );
}
