'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ADMIN_ACCOUNT_CREDENTIALS_USERNAME_MAX_LENGTH } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  Button,
  FormHintText,
  FormMaxWidth,
  FormPrimaryActions,
  ManagementPageShell,
  StackForm,
  TextInput,
} from '@podverse/ui';

import {
  CREATE_ROLE_NAV_ID,
  CUSTOM_ROLE_SELECTION_ID,
  type PermissionState,
  permissionStatesEqual,
} from '../../../../../components/admins/adminPermissionModel';
import { AdminPermissionsSection } from '../../../../../components/admins/AdminPermissionsSection';
import {
  type AdminAccount,
  updateAdmin,
  type UpdateAdminParams,
} from '../../../../../lib/requests/admins';
import { buildAdminEditPath, ROUTES } from '../../../../../lib/routes';

const ADMIN_USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

function permissionsFromAdmin(admin: AdminAccount): PermissionState {
  const p = admin.permissions;
  return {
    feeds_crud: p?.feeds_crud ?? 0,
    feed_takedown_reasons_crud: p?.feed_takedown_reasons_crud ?? 0,
    admins_crud: p?.admins_crud ?? 0,
    stats_crud: p?.stats_crud ?? 0,
    billing_prices_crud: p?.billing_prices_crud ?? 0,
    bucket_crud: p?.bucket_crud ?? 0,
    embed_demo_crud: p?.embed_demo_crud ?? 0,
    notifications_crud: p?.notifications_crud ?? 0,
  };
}

export type EditAdminPageClientProps = {
  admin: AdminAccount;
};

export function EditAdminPageClient({ admin }: EditAdminPageClientProps) {
  const router = useRouter();
  const initialPermissionsMatch = useMemo(() => permissionsFromAdmin(admin), [admin]);
  const [email, setEmail] = useState(admin.email ?? '');
  const [username, setUsername] = useState(admin.username ?? '');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<PermissionState>(initialPermissionsMatch);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const t = useTranslations('admins');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const ta = useTranslations('auth');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    if (trimmedEmail === '' && trimmedUsername === '') {
      setError(t('emailOrUsernameRequired'));
      setLoading(false);
      return;
    }
    if (trimmedUsername !== '') {
      if (
        trimmedUsername.length > ADMIN_ACCOUNT_CREDENTIALS_USERNAME_MAX_LENGTH ||
        !ADMIN_USERNAME_PATTERN.test(trimmedUsername)
      ) {
        setError(t('invalidAdminUsername'));
        setLoading(false);
        return;
      }
    }

    try {
      const updateData: UpdateAdminParams = {};
      const prevEmail = (admin.email ?? '').trim();
      const prevUsername = (admin.username ?? '').trim();
      if (trimmedEmail !== prevEmail) {
        updateData.email = trimmedEmail;
      }
      if (trimmedUsername !== prevUsername) {
        updateData.username = trimmedUsername;
      }
      if (password) {
        updateData.password = password;
      }

      const currentPerms = permissionsFromAdmin(admin);
      const permsChanged = !permissionStatesEqual(permissions, currentPerms);

      if (permsChanged) {
        const useRoleTemplate =
          selectedRoleId !== CUSTOM_ROLE_SELECTION_ID &&
          selectedRoleId !== '' &&
          selectedRoleId !== CREATE_ROLE_NAV_ID;
        if (useRoleTemplate) {
          updateData.role_id = selectedRoleId;
        } else {
          updateData.permissions = permissions;
        }
      }

      await updateAdmin(admin.id, updateData);
      setSuccess(true);
      router.push(ROUTES.ADMINS);
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      const message = typeof raw === 'string' && raw.length > 0 ? raw : t('failedToUpdate');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagementPageShell
      title={t('editAdmin')}
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.ADMINS, label: t('title') },
            {
              label: t('editAdminItem', {
                identifier: admin.email ?? admin.username ?? admin.id_text,
              }),
            },
          ]}
        />
      }
    >
      <FormMaxWidth>
        <StackForm onSubmit={(e) => void handleSubmit(e)}>
          <TextInput
            id="email"
            eyebrow={t('emailOptional')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextInput
            id="admin-username"
            eyebrow={t('usernameOptional')}
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <FormHintText>{t('emailOrUsernameHint')}</FormHintText>
          <TextInput
            id="password"
            eyebrow={ta('newPassword')}
            minLength={8}
            placeholder={ta('leaveBlankToKeepCurrent')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <AdminPermissionsSection
            bootstrapHighestRole={false}
            createRoleReturnUrl={buildAdminEditPath(admin.id)}
            matchInitialPermissions={initialPermissionsMatch}
            onPermissionsChange={setPermissions}
            onRolesReadyChange={setPermissionsReady}
            onSelectedRoleIdChange={setSelectedRoleId}
            permissions={permissions}
            selectedRoleId={selectedRoleId}
            showRolePicker
          />
          <Alert>{error}</Alert>
          {success ? <Alert variant="success">{t('updatedSuccessfully')}</Alert> : null}
          <FormPrimaryActions>
            <Button type="button" variant="secondary" onClick={() => router.push(ROUTES.ADMINS)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !permissionsReady}>
              {loading ? tc('saving') : tc('saveChanges')}
            </Button>
          </FormPrimaryActions>
        </StackForm>
      </FormMaxWidth>
    </ManagementPageShell>
  );
}
