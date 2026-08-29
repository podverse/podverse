'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  ActionLink,
  Alert,
  Breadcrumbs,
  ManagementPageShell,
  PageHeaderActions,
  Table,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { canCreateNotifications } from '../../../lib/managementPermissions';
import type { CurrentUser } from '../../../lib/requests/auth';
import type { NotificationCampaign } from '../../../lib/requests/notificationCampaigns';
import { listNotificationCampaigns } from '../../../lib/requests/notificationCampaigns';
import { buildNotificationCampaignPath, ROUTES } from '../../../lib/routes';

export type NotificationsListPageClientProps = {
  initialUser: CurrentUser;
};

export function NotificationsListPageClient({ initialUser }: NotificationsListPageClientProps) {
  const [user] = useState(initialUser);
  const [rows, setRows] = useState<NotificationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await listNotificationCampaigns({ page: 1, limit: 50 });
        if (!cancelled) {
          setRows(result.data);
        }
      } catch {
        if (!cancelled) {
          setError(t('failedToLoad'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: ROUTES.DASHBOARD, label: tNav('dashboard') }, { label: t('title') }]}
        />
      }
      title={t('title')}
      headerChildren={
        canCreateNotifications(user) ? (
          <PageHeaderActions>
            <ActionLink href={ROUTES.NOTIFICATIONS_NEW} variant="primary" LinkComponent={Link}>
              {t('create')}
            </ActionLink>
          </PageHeaderActions>
        ) : null
      }
    >
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      <Alert>{error}</Alert>
      {!loading && error === null ? (
        <Table.ScrollContainer>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>{t('table.id')}</Table.HeaderCell>
                <Table.HeaderCell>{t('table.title')}</Table.HeaderCell>
                <Table.HeaderCell>{t('table.category')}</Table.HeaderCell>
                <Table.HeaderCell>{t('table.status')}</Table.HeaderCell>
                <Table.HeaderCell>{t('table.scheduledAt')}</Table.HeaderCell>
                <Table.HeaderCell>{t('table.sentAt')}</Table.HeaderCell>
                <Table.HeaderCell>{tc('actions')}</Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row.id_text}>
                  <Table.Cell>{row.id_text}</Table.Cell>
                  <Table.Cell>{row.title}</Table.Cell>
                  <Table.Cell>{row.category}</Table.Cell>
                  <Table.Cell>{row.status}</Table.Cell>
                  <Table.Cell>
                    {row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '-'}
                  </Table.Cell>
                  <Table.Cell>
                    {row.sent_at ? new Date(row.sent_at).toLocaleString() : '-'}
                  </Table.Cell>
                  <Table.Cell>
                    <ActionLink
                      href={buildNotificationCampaignPath(row.id_text)}
                      LinkComponent={Link}
                      variant="inline"
                    >
                      {tc('view')}
                    </ActionLink>
                  </Table.Cell>
                </Table.Row>
              ))}
              {rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={7}>{t('empty')}</Table.Cell>
                </Table.Row>
              ) : null}
            </Table.Body>
          </Table>
        </Table.ScrollContainer>
      ) : null}
    </ManagementPageShell>
  );
}
