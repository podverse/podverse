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
  Checkbox,
  CopyToClipboardButton,
  Fieldset,
  FormGroup,
  FormHintText,
  FormMaxWidth,
  FormPrimaryActions,
  ManagementPageShell,
  StackForm,
  Table,
  TextInput,
} from '@podverse/ui';

import { createAdmin, type CreateAdminResponse } from '../../../../lib/requests/admins';

const RESOURCE_KEYS = [
  'feeds_crud',
  'feed_takedown_reasons_crud',
  'admins_crud',
  'stats_crud',
  'bucket_crud',
] as const;

const CRUD_BITS = [
  { bit: 1, labelKey: 'create' },
  { bit: 2, labelKey: 'read' },
  { bit: 4, labelKey: 'update' },
  { bit: 8, labelKey: 'deletePerm' },
] as const;

type PermissionState = {
  feeds_crud: number;
  feed_takedown_reasons_crud: number;
  admins_crud: number;
  stats_crud: number;
  bucket_crud: number;
};

const RESOURCE_LABEL_KEYS: Record<(typeof RESOURCE_KEYS)[number], string> = {
  feeds_crud: 'feeds',
  feed_takedown_reasons_crud: 'takedownReasons',
  admins_crud: 'admins',
  stats_crud: 'stats',
  bucket_crud: 'bucket',
};

const ADMIN_USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function NewAdminPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<PermissionState>({
    feeds_crud: 0,
    feed_takedown_reasons_crud: 0,
    admins_crud: 0,
    stats_crud: 0,
    bucket_crud: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const t = useTranslations('admins');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const tu = useTranslations('users');
  const tp = useTranslations('admins.permissions');

  const toggleCrudBit = (resource: keyof PermissionState, bit: number) => {
    setPermissions((prev) => ({
      ...prev,
      [resource]: prev[resource] ^ bit,
    }));
  };

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
      const payload: {
        permissions: PermissionState;
        email?: string;
        username?: string;
        password?: string;
      } = { permissions };
      if (trimmedEmail !== '') {
        payload.email = trimmedEmail;
      }
      if (trimmedUsername !== '') {
        payload.username = trimmedUsername;
      }
      if (trimmedPassword.length > 0) {
        payload.password = trimmedPassword;
      }

      const result: CreateAdminResponse = await createAdmin(payload);
      if (result.set_password_url !== undefined && result.set_password_url.length > 0) {
        setInviteUrl(result.set_password_url);
        setSuccessMessage(t('createdWithLink'));
        setEmail('');
        setUsername('');
        setPassword('');
        setPermissions({
          feeds_crud: 0,
          feed_takedown_reasons_crud: 0,
          admins_crud: 0,
          stats_crud: 0,
          bucket_crud: 0,
        });
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
          <Fieldset legend={tp('legend')}>
            <Table.ScrollContainer>
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.HeaderCell>{tp('resource')}</Table.HeaderCell>
                    {CRUD_BITS.map((check) => (
                      <Table.HeaderCell key={check.bit}>{tp(check.labelKey)}</Table.HeaderCell>
                    ))}
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {RESOURCE_KEYS.map((key) => (
                    <Table.Row key={key}>
                      <Table.Cell>{tp(RESOURCE_LABEL_KEYS[key])}</Table.Cell>
                      {CRUD_BITS.map((check) => (
                        <Table.Cell key={check.bit}>
                          <Checkbox
                            aria-label={`${tp(RESOURCE_LABEL_KEYS[key])}, ${tp(check.labelKey)}`}
                            checked={(permissions[key] & check.bit) !== 0}
                            onChange={() => {
                              toggleCrudBit(key, check.bit);
                            }}
                          />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Table.ScrollContainer>
          </Fieldset>
          <Alert>{error}</Alert>
          {successMessage !== null ? <Alert variant="success">{successMessage}</Alert> : null}
          {inviteUrl !== null ? (
            <FormGroup layout="inStack">
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-base)',
                  alignItems: 'flex-end',
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
            <Button type="submit" disabled={loading}>
              {loading ? tc('creating') : t('createAdmin')}
            </Button>
          </FormPrimaryActions>
        </StackForm>
      </FormMaxWidth>
    </ManagementPageShell>
  );
}
