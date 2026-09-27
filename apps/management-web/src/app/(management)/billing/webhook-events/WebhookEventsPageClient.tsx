'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { FormDropdownOption } from '@podverse/ui';
import { Alert, Breadcrumbs, Button, FormDropdown, ManagementPageShell, Table } from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { canReplayBillingWebhookEvents } from '../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../lib/requests/auth';
import type { BillingWebhookEvent } from '../../../../lib/requests/billing';
import {
  listBillingWebhookEvents,
  replayBillingWebhookEvent,
} from '../../../../lib/requests/billing';
import { ROUTES } from '../../../../lib/routes';

export type WebhookEventsPageClientProps = {
  initialUser: CurrentUser;
};

const PROCESSORS = ['paypal', 'apple', 'google_play', 'test'] as const;
const STATUSES = ['pending', 'processed', 'failed'] as const;

function isWebhookStatus(value: string): value is (typeof STATUSES)[number] {
  return STATUSES.some((status) => status === value);
}

function isProcessor(value: string): value is (typeof PROCESSORS)[number] {
  return PROCESSORS.some((processor) => processor === value);
}

export function WebhookEventsPageClient({ initialUser }: WebhookEventsPageClientProps) {
  const [user] = useState(initialUser);
  const [events, setEvents] = useState<BillingWebhookEvent[]>([]);
  const [status, setStatus] = useState('failed');
  const [processor, setProcessor] = useState('');
  const [loading, setLoading] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const canReplay = canReplayBillingWebhookEvents(user);

  const statusOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: '', label: t('events.allStatuses') },
      { value: 'pending', label: t('events.statusPending') },
      { value: 'processed', label: t('events.statusProcessed') },
      { value: 'failed', label: t('events.statusFailed') },
    ],
    [t]
  );
  const processorOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: '', label: t('events.allProcessors') },
      ...PROCESSORS.map((value) => ({ value, label: value })),
    ],
    [t]
  );

  const load = useCallback(async () => {
    const result = await listBillingWebhookEvents({
      ...(isWebhookStatus(status) ? { status } : {}),
      ...(isProcessor(processor) ? { processor_id: processor } : {}),
    });
    setEvents(result.data);
  }, [processor, status]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch {
        if (!cancelled) {
          setError(t('events.failedToLoad'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  const replay = async (event: BillingWebhookEvent) => {
    setReplayingId(event.id);
    setError(null);
    setNotice(null);
    try {
      await replayBillingWebhookEvent(event.id);
      await load();
      setNotice(t('events.replayed'));
    } catch {
      setError(t('events.failedToReplay'));
    } finally {
      setReplayingId(null);
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
            { href: ROUTES.BILLING, label: t('pageTitle') },
            { label: t('events.title') },
          ]}
        />
      }
      title={t('events.title')}
    >
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      <Alert>{error}</Alert>
      {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
      <FormDropdown
        id="webhook-events-status"
        eyebrow={t('events.statusLabel')}
        options={statusOptions}
        value={status}
        onChange={setStatus}
      />
      <FormDropdown
        id="webhook-events-processor"
        eyebrow={t('events.processorLabel')}
        options={processorOptions}
        value={processor}
        onChange={setProcessor}
      />
      {!loading && error === null ? (
        <Table.ScrollContainer>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>{t('events.table.received')}</Table.HeaderCell>
                <Table.HeaderCell>{t('events.table.processor')}</Table.HeaderCell>
                <Table.HeaderCell>{t('events.table.event')}</Table.HeaderCell>
                <Table.HeaderCell>{t('events.table.status')}</Table.HeaderCell>
                <Table.HeaderCell>{t('events.table.attempts')}</Table.HeaderCell>
                <Table.HeaderCell>{t('events.table.error')}</Table.HeaderCell>
                {canReplay ? <Table.HeaderCell>{tc('actions')}</Table.HeaderCell> : null}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {events.map((event) => (
                <Table.Row key={event.id}>
                  <Table.Cell>{new Date(event.received_at).toLocaleString()}</Table.Cell>
                  <Table.Cell>{event.processor_id}</Table.Cell>
                  <Table.Cell>{event.external_event_id}</Table.Cell>
                  <Table.Cell>{event.status}</Table.Cell>
                  <Table.Cell>{event.attempts}</Table.Cell>
                  <Table.Cell>{event.process_error ?? tc('none')}</Table.Cell>
                  {canReplay ? (
                    <Table.Cell>
                      <Button
                        type="button"
                        onClick={() => void replay(event)}
                        disabled={replayingId === event.id || event.status === 'processed'}
                      >
                        {t('events.replay')}
                      </Button>
                    </Table.Cell>
                  ) : null}
                </Table.Row>
              ))}
              {events.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={canReplay ? 7 : 6}>{t('events.empty')}</Table.Cell>
                </Table.Row>
              ) : null}
            </Table.Body>
          </Table>
        </Table.ScrollContainer>
      ) : null}
    </ManagementPageShell>
  );
}
