'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  ActionLink,
  Alert,
  LoadingText,
  ManagementPageShell,
  PageHeaderActions,
  StatusBadge,
  Table,
} from '@podverse/ui';

import { type AdminAccount, listAdmins } from '../../../lib/requests/admins';
import { type CurrentUser } from '../../../lib/requests/auth';

const CRUD_LABELS: Record<number, string> = {
  0: 'None',
  1: 'C',
  2: 'R',
  3: 'CR',
  4: 'U',
  5: 'CU',
  6: 'RU',
  7: 'CRU',
  8: 'D',
  9: 'CD',
  10: 'RD',
  11: 'CRD',
  12: 'UD',
  13: 'CUD',
  14: 'RUD',
  15: 'CRUD',
};

function crudLabel(value: number): string {
  return CRUD_LABELS[value] ?? String(value);
}

export type AdminsListPageClientProps = {
  initialUser: CurrentUser;
};

export function AdminsListPageClient({ initialUser }: AdminsListPageClientProps) {
  const [user] = useState<CurrentUser>(initialUser);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('admins');
  const tc = useTranslations('common');

  const isSuperuser = user.role === 'superuser';
  const canCreate = isSuperuser;

  useEffect(() => {
    let cancelled = false;

    const loadAdmins = async () => {
      try {
        const list = await listAdmins();
        if (!cancelled) {
          setAdmins(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('failedToLoad'));
          console.error('Error loading admins:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAdmins();

    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <ManagementPageShell
      title={t('title')}
      headerChildren={
        <PageHeaderActions>
          {canCreate && (
            <ActionLink href="/admins/new" variant="primary" LinkComponent={Link}>
              {t('createAdmin')}
            </ActionLink>
          )}
        </PageHeaderActions>
      }
    >
      {loading && <LoadingText>{tc('loading')}</LoadingText>}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && (
        <Table.ScrollContainer>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>{t('tableHeaders.id')}</Table.HeaderCell>
                <Table.HeaderCell>{t('tableHeaders.email')}</Table.HeaderCell>
                <Table.HeaderCell>{t('tableHeaders.role')}</Table.HeaderCell>
                <Table.HeaderCell>{t('tableHeaders.feeds')}</Table.HeaderCell>
                <Table.HeaderCell>{t('tableHeaders.takedownReasons')}</Table.HeaderCell>
                <Table.HeaderCell>{t('tableHeaders.admins')}</Table.HeaderCell>
                <Table.HeaderCell>{t('tableHeaders.stats')}</Table.HeaderCell>
                <Table.HeaderCell>{t('tableHeaders.bucket')}</Table.HeaderCell>
                <Table.HeaderCell>{tc('actions')}</Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {admins.map((admin) => (
                <Table.Row key={admin.id}>
                  <Table.Cell>{admin.id_text}</Table.Cell>
                  <Table.Cell>{admin.email ?? '-'}</Table.Cell>
                  <Table.Cell>
                    <StatusBadge variant={admin.role === 'superuser' ? 'success' : 'neutral'}>
                      {admin.role}
                    </StatusBadge>
                  </Table.Cell>
                  <Table.Cell>{crudLabel(admin.permissions?.feeds_crud ?? 0)}</Table.Cell>
                  <Table.Cell>
                    {crudLabel(admin.permissions?.feed_takedown_reasons_crud ?? 0)}
                  </Table.Cell>
                  <Table.Cell>{crudLabel(admin.permissions?.admins_crud ?? 0)}</Table.Cell>
                  <Table.Cell>{crudLabel(admin.permissions?.stats_crud ?? 0)}</Table.Cell>
                  <Table.Cell>{crudLabel(admin.permissions?.bucket_crud ?? 0)}</Table.Cell>
                  <Table.Cell>
                    {admin.role !== 'superuser' && isSuperuser && (
                      <ActionLink
                        href={`/admins/${admin.id}/edit`}
                        variant="inline"
                        LinkComponent={Link}
                      >
                        {tc('edit')}
                      </ActionLink>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Table.ScrollContainer>
      )}
    </ManagementPageShell>
  );
}
