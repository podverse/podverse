'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AdminNotificationCampaignStatusEnum } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  Button,
  DescriptionList,
  DescriptionListRow,
  ManagementPageShell,
  PageHeaderActions,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import type { NotificationCampaign } from '../../../../lib/requests/notificationCampaigns';
import {
  cancelNotificationCampaign,
  getNotificationCampaign,
} from '../../../../lib/requests/notificationCampaigns';
import { ROUTES } from '../../../../lib/routes';

type NotificationCampaignDetailPageClientProps = {
  campaignIdText: string;
  canCancel: boolean;
};

export function NotificationCampaignDetailPageClient({
  campaignIdText,
  canCancel,
}: NotificationCampaignDetailPageClientProps) {
  const router = useRouter();
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const [campaign, setCampaign] = useState<NotificationCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await getNotificationCampaign(campaignIdText);
        if (!cancelled) {
          setCampaign(response.data);
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
  }, [campaignIdText, t]);

  const handleCancel = async () => {
    if (campaign === null) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const result = await cancelNotificationCampaign(campaign.id_text);
      setCampaign(result.data);
    } catch {
      setError(t('failedToCancel'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.NOTIFICATIONS, label: t('title') },
            { label: campaignIdText },
          ]}
        />
      }
      title={t('detailTitle')}
      headerChildren={
        <PageHeaderActions>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(ROUTES.NOTIFICATIONS)}
          >
            {t('backToList')}
          </Button>
          {canCancel && campaign?.status === AdminNotificationCampaignStatusEnum.Scheduled ? (
            <Button
              type="button"
              variant="danger"
              isLoading={actionLoading}
              onClick={() => void handleCancel()}
            >
              {t('cancelCampaign')}
            </Button>
          ) : null}
        </PageHeaderActions>
      }
    >
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      <Alert>{error}</Alert>
      {!loading && campaign !== null ? (
        <DescriptionList variant="rows">
          <DescriptionListRow term={t('table.id')} detail={campaign.id_text} />
          <DescriptionListRow term={t('table.title')} detail={campaign.title} />
          <DescriptionListRow term={t('fields.body')} detail={campaign.body ?? '-'} />
          <DescriptionListRow term={t('fields.linkPath')} detail={campaign.link_path ?? '-'} />
          <DescriptionListRow term={t('table.category')} detail={campaign.category} />
          <DescriptionListRow term={t('table.status')} detail={campaign.status} />
          <DescriptionListRow
            term={t('table.scheduledAt')}
            detail={campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : '-'}
          />
          <DescriptionListRow
            term={t('table.sentAt')}
            detail={campaign.sent_at ? new Date(campaign.sent_at).toLocaleString() : '-'}
          />
          <DescriptionListRow
            term={t('fields.sendPush')}
            detail={campaign.send_push ? tc('yes') : tc('no')}
          />
        </DescriptionList>
      ) : null}
    </ManagementPageShell>
  );
}
