'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  ActionLink,
  Alert,
  Breadcrumbs,
  Button,
  Checkbox,
  Fieldset,
  FormContainer,
  FormGroup,
  FormPrimaryActions,
  Input,
  Label,
  ManagementPageShell,
  Table,
} from '@podverse/ui';

import { createAdmin } from '../../../../lib/requests/admins';

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

export function NewAdminPageClient() {
  const [email, setEmail] = useState('');
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
  const [success, setSuccess] = useState(false);
  const t = useTranslations('admins');
  const tc = useTranslations('common');
  const ta = useTranslations('auth');
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
    setSuccess(false);

    try {
      await createAdmin({ email, password, permissions });
      setSuccess(true);
      setEmail('');
      setPassword('');
      setPermissions({
        feeds_crud: 0,
        feed_takedown_reasons_crud: 0,
        admins_crud: 0,
        stats_crud: 0,
        bucket_crud: 0,
      });
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
      headerChildren={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: '/admins', label: t('title') }, { label: tc('new') }]}
        />
      }
    >
      <FormContainer onSubmit={(e) => void handleSubmit(e)}>
        <FormGroup>
          <Label htmlFor="email">{ta('email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="password">{ta('password')}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </FormGroup>
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
        {error && <Alert>{error}</Alert>}
        {success && <Alert variant="success">{t('createdSuccessfully')}</Alert>}
        <FormPrimaryActions>
          <ActionLink href="/admins" variant="subtle" LinkComponent={Link}>
            {tc('cancel')}
          </ActionLink>
          <Button type="submit" disabled={loading}>
            {loading ? tc('creating') : t('createAdmin')}
          </Button>
        </FormPrimaryActions>
      </FormContainer>
    </ManagementPageShell>
  );
}
