'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ADMIN_ACCOUNT_CREDENTIALS_USERNAME_MAX_LENGTH } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  Button,
  CopyToClipboardButton,
  FormGroup,
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
  emptyPermissionState,
  type PermissionState,
} from '../../../../components/admins/adminPermissionModel';
import { AdminPermissionsSection } from '../../../../components/admins/AdminPermissionsSection';
import { createAdmin, type CreateAdminResponse } from '../../../../lib/requests/admins';

const ADMIN_USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function NewAdminPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<PermissionState>(emptyPermissionState());
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [permSectionKey, setPermSectionKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const t = useTranslations('admins');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const tu = useTranslations('users');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setInviteUrl(null);

    const trimmedPassword = password.trim();
    if (trimmedPassword.length > 0 && trimmedPassword.length < 8) {
      setError(tu('passwordMinLength'));
      setLoading(false);
      return;
    }

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
      const payload: Parameters<typeof createAdmin>[0] = {};
      if (trimmedEmail !== '') {
        payload.email = trimmedEmail;
      }
      if (trimmedUsername !== '') {
        payload.username = trimmedUsername;
      }
      if (trimmedPassword.length > 0) {
        payload.password = trimmedPassword;
      }

      const useRoleTemplate =
        selectedRoleId !== CUSTOM_ROLE_SELECTION_ID &&
        selectedRoleId !== CREATE_ROLE_NAV_ID &&
        selectedRoleId !== '';
      if (useRoleTemplate) {
        payload.role_id = selectedRoleId;
      } else {
        payload.permissions = permissions;
      }

      const result: CreateAdminResponse = await createAdmin(payload);
      if (result.set_password_url !== undefined && result.set_password_url.length > 0) {
        setInviteUrl(result.set_password_url);
        setSuccessMessage(t('createdWithLink'));
        setEmail('');
        setUsername('');
        setPassword('');
        setPermissions(emptyPermissionState());
        setSelectedRoleId('');
        setPermissionsReady(false);
        setPermSectionKey((k) => k + 1);
      } else {
        router.push('/admins');
        router.refresh();
      }
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      const message = typeof raw === 'string' && raw.length > 0 ? raw : t('failedToCreate');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagementPageShell
      title={t('createAdmin')}
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/dashboard', label: tNav('dashboard') },
            { href: '/admins', label: t('title') },
            { label: tc('new') },
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
            eyebrow={t('passwordOptional')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormHintText>{t('passwordInviteHint')}</FormHintText>
          <AdminPermissionsSection
            key={permSectionKey}
            bootstrapHighestRole
            createRoleReturnUrl="/admins/new"
            matchInitialPermissions={undefined}
            onPermissionsChange={setPermissions}
            onRolesReadyChange={setPermissionsReady}
            onSelectedRoleIdChange={setSelectedRoleId}
            permissions={permissions}
            selectedRoleId={selectedRoleId}
            showRolePicker
          />
          <Alert>{error}</Alert>
          {successMessage !== null ? <Alert variant="success">{successMessage}</Alert> : null}
          {inviteUrl !== null ? (
            <FormGroup layout="inStack">
              <div
                style={{
                  alignItems: 'flex-end',
                  display: 'flex',
                  gap: 'var(--spacing-base)',
                }}
              >
                <TextInput
                  eyebrow={tu('inviteLinkLabel')}
                  id="admin-invite-link"
                  readOnly
                  style={{ flex: 1, minWidth: 0 }}
                  type="text"
                  value={inviteUrl}
                />
                <CopyToClipboardButton
                  copiedLabel={tu('linkCopied')}
                  idleLabel={tu('copyLink')}
                  textToCopy={inviteUrl}
                />
              </div>
            </FormGroup>
          ) : null}
          <FormPrimaryActions>
            <Button type="button" variant="secondary" onClick={() => router.push('/admins')}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !permissionsReady}>
              {loading ? tc('creating') : t('createAdmin')}
            </Button>
          </FormPrimaryActions>
        </StackForm>
      </FormMaxWidth>
    </ManagementPageShell>
  );
}
