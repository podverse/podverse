'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { formatDateTimeAbbrev, formatHHMMSS, isIndexProviderId } from '@podverse/helpers';
import {
  ActionLink,
  Alert,
  Breadcrumbs,
  Button,
  DescriptionList,
  DescriptionListRow,
  FormPrimaryActions,
  FormStack,
  ManagementPageShell,
  Modal,
  ModalActions,
  ModalBody,
  PageSection,
  SectionHeading,
  StatusBadge,
  Table,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { getConfig } from '../../../../../config';
import {
  canCreateFeeds,
  canDeleteFeeds,
  canUpdateFeeds,
} from '../../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../../lib/requests/auth';
import type {
  RemoteStubAlias,
  RemoteStubDetail,
  RemoteStubHistoryJob,
  RemoteStubItemStub,
  RemoteStubPendingAction,
} from '../../../../../lib/requests/feeds';
import {
  deleteRemoteStub,
  getRemoteStub,
  promoteRemoteStub,
  recheckRemoteStub,
  repointRemoteStub,
} from '../../../../../lib/requests/feeds';
import { ROUTES } from '../../../../../lib/routes';

type RemoteStubDetailPageClientProps = {
  stubId: number;
  user: CurrentUser;
};

type RateLimitCopy = {
  generic: string;
  minutes: (count: number) => string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

function readRequestMessage(error: unknown): string | null {
  if (!isAxiosError(error)) {
    return null;
  }
  const data: unknown = error.response?.data;
  if (!isRecord(data)) {
    return null;
  }
  const message = data.message;
  return typeof message === 'string' && message.trim() !== '' ? message : null;
}

function rateLimitMessageFromError(error: unknown, copy: RateLimitCopy): string | null {
  if (!isAxiosError(error) || error.response?.status !== 429) {
    return null;
  }
  const data: unknown = error.response.data;
  const record = isRecord(data) ? data : undefined;
  const minutesRemaining = record?.minutesRemaining;
  const retryAfterSeconds = record?.retry_after_seconds;
  const fallbackMinutes = typeof retryAfterSeconds === 'number' ? retryAfterSeconds / 60 : null;
  const rateLimitMinutes =
    typeof minutesRemaining === 'number' ? minutesRemaining : fallbackMinutes;
  if (typeof rateLimitMinutes === 'number' && Number.isFinite(rateLimitMinutes)) {
    return copy.minutes(Math.max(1, Math.ceil(rateLimitMinutes)));
  }
  return copy.generic;
}

export function RemoteStubDetailPageClient({ stubId, user }: RemoteStubDetailPageClientProps) {
  const t = useTranslations('feedRemoteStubs');
  const tc = useTranslations('common');
  const tHub = useTranslations('feedsHub');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const canUpdate = canUpdateFeeds(user);
  const canCreate = canCreateFeeds(user);
  const canDelete = canDeleteFeeds(user);
  const mutationLock = useRef(false);

  const [stub, setStub] = useState<RemoteStubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [repointOpen, setRepointOpen] = useState(false);
  const [repointId, setRepointId] = useState('');
  const [repointError, setRepointError] = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rateLimitCopy = useCallback((): RateLimitCopy => {
    return {
      generic: t('rateLimitGeneric'),
      minutes: (count) =>
        count === 1
          ? t('rateLimitMinute', { minutes: count })
          : t('rateLimitMinutes', { minutes: count }),
    };
  }, [t]);

  const failureMessage = useCallback(
    (error: unknown): string => {
      return (
        rateLimitMessageFromError(error, rateLimitCopy()) ??
        readRequestMessage(error) ??
        t('actionError')
      );
    },
    [rateLimitCopy, t]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setMissing(false);
      try {
        const result = await getRemoteStub(stubId);
        if (!cancelled) {
          setStub(result.remote_stub);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        setStub(null);
        if (isNotFound(error)) {
          setMissing(true);
        } else {
          setLoadError(rateLimitMessageFromError(error, rateLimitCopy()) ?? t('loadError'));
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
  }, [rateLimitCopy, stubId, t]);

  const beginMutation = (): boolean => {
    if (mutationLock.current) {
      return false;
    }
    mutationLock.current = true;
    setBusy(true);
    setActionError(null);
    return true;
  };

  const endMutation = () => {
    mutationLock.current = false;
    setBusy(false);
  };

  const markMissing = () => {
    setMissing(true);
    setStub(null);
    setNotice(null);
    setRepointOpen(false);
    setPromoteOpen(false);
    setDeleteOpen(false);
  };

  const reloadAfterQueue = async (queuedNotice: string) => {
    const result = await getRemoteStub(stubId);
    setStub(result.remote_stub);
    setNotice(queuedNotice);
  };

  const runRecheck = async () => {
    if (stub === null || stub.pending_action !== null || !beginMutation()) {
      return;
    }
    try {
      await recheckRemoteStub(stub.id);
      await reloadAfterQueue(t('recheckQueued'));
    } catch (error: unknown) {
      if (isNotFound(error)) {
        markMissing();
        return;
      }
      setActionError(failureMessage(error));
    } finally {
      endMutation();
    }
  };

  const submitRepoint = async (event: FormEvent) => {
    event.preventDefault();
    if (stub === null || stub.pending_action !== null || !beginMutation()) {
      return;
    }
    setRepointError(null);
    try {
      await repointRemoteStub(stub.id, { provider_feed_id: repointId.trim() });
      setRepointOpen(false);
      setRepointId('');
      await reloadAfterQueue(t('repointQueued'));
    } catch (error: unknown) {
      if (isNotFound(error)) {
        markMissing();
        return;
      }
      if (isAxiosError(error) && error.response?.status === 400) {
        setRepointError(readRequestMessage(error) ?? t('actionError'));
        return;
      }
      setRepointError(failureMessage(error));
    } finally {
      endMutation();
    }
  };

  const runPromote = async () => {
    if (stub === null || stub.pending_action !== null || !beginMutation()) {
      return;
    }
    try {
      await promoteRemoteStub(stub.id);
      setPromoteOpen(false);
      await reloadAfterQueue(t('promoteQueued'));
    } catch (error: unknown) {
      if (isNotFound(error)) {
        markMissing();
        return;
      }
      setActionError(failureMessage(error));
    } finally {
      endMutation();
    }
  };

  const runDelete = async () => {
    if (stub === null || !beginMutation()) {
      return;
    }
    try {
      await deleteRemoteStub(stub.id);
      router.push(ROUTES.FEEDS_REMOTE_STUBS);
      router.refresh();
    } catch (error: unknown) {
      if (isNotFound(error)) {
        markMissing();
        return;
      }
      setDeleteError(failureMessage(error));
    } finally {
      endMutation();
    }
  };

  const pendingText = (action: RemoteStubPendingAction | null): string | null => {
    switch (action) {
      case null:
        return null;
      case 'recheck':
        return t('pendingRecheck');
      case 'repoint':
        return t('pendingRepoint');
      case 'promote':
        return t('pendingPromote');
      default: {
        const unrecognized: never = action;
        return unrecognized;
      }
    }
  };

  const providerText = (indexProvider: string): string => {
    if (!isIndexProviderId(indexProvider)) {
      return indexProvider;
    }
    switch (indexProvider) {
      case 'podcast_index':
        return t('providerPodcastIndex');
      default: {
        const unrecognized: never = indexProvider;
        return unrecognized;
      }
    }
  };

  const mediumText = (value: string | null): string => {
    if (value === null || value === '') {
      return t('emptyValue');
    }
    switch (value) {
      case 'podcast':
        return t('mediumPodcast');
      case 'music':
        return t('mediumMusic');
      case 'video':
        return t('mediumVideo');
      default:
        return value;
    }
  };

  const aliasKindText = (kind: RemoteStubAlias['key_kind']): string => {
    switch (kind) {
      case 'feed_guid':
        return t('fieldFeedGuid');
      case 'feed_url':
        return t('columnFeedUrl');
      default: {
        const unrecognized: never = kind;
        return unrecognized;
      }
    }
  };

  const jobActionText = (jobType: string): string => {
    switch (jobType) {
      case 'remote-stub-recheck':
        return t('actionRecheck');
      case 'remote-stub-repoint':
        return t('actionRepoint');
      case 'remote-stub-promote':
        return t('actionPromote');
      default:
        return jobType;
    }
  };

  const jobStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return t('statusPending');
      case 'running':
        return t('statusRunning');
      case 'completed':
        return t('statusCompleted');
      case 'cancelled':
        return t('statusCancelled');
      case 'failed':
        return t('statusFailed');
      default:
        return status;
    }
  };

  const textOrEmpty = (value: string | null): string => {
    if (value === null || value === '') {
      return t('emptyValue');
    }
    return value;
  };

  const displayTitle =
    stub === null
      ? t('pageTitle')
      : stub.title !== null && stub.title !== ''
        ? stub.title
        : stub.provider_feed_id;
  const pendingLabel = stub === null ? null : pendingText(stub.pending_action);
  const queueDisabled = busy || (stub !== null && stub.pending_action !== null);
  const showActions = canDelete || canUpdate || canCreate;

  const breadcrumbs = (
    <Breadcrumbs
      LinkComponent={Link}
      navAriaLabel={tc('breadcrumbNav')}
      items={
        stub === null
          ? [
              { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
              { href: ROUTES.FEEDS, label: tHub('pageTitle') },
              { label: t('pageTitle') },
            ]
          : [
              { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
              { href: ROUTES.FEEDS, label: tHub('pageTitle') },
              { href: ROUTES.FEEDS_REMOTE_STUBS, label: t('pageTitle') },
              { label: displayTitle },
            ]
      }
    />
  );

  return (
    <>
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      {!loading ? (
        <ManagementPageShell
          headerBreadcrumbs={breadcrumbs}
          title={
            <>
              {displayTitle}
              {pendingLabel !== null ? (
                <>
                  {' '}
                  <StatusBadge variant="warning">{pendingLabel}</StatusBadge>
                </>
              ) : null}
            </>
          }
        >
          {missing ? (
            <FormStack>
              <Alert>{t('notFound')}</Alert>
              <ActionLink href={ROUTES.FEEDS_REMOTE_STUBS} LinkComponent={Link}>
                {t('backToList')}
              </ActionLink>
            </FormStack>
          ) : null}
          {!missing && loadError !== null ? <Alert>{loadError}</Alert> : null}
          {!missing && stub !== null ? (
            <>
              {notice !== null || actionError !== null ? (
                <div role="status">
                  {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
                  {actionError !== null ? (
                    <div role="alert">
                      <Alert>{actionError}</Alert>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <PageSection aria-label={t('sectionSummary')}>
                <FormStack>
                  <SectionHeading level={2}>{t('sectionSummary')}</SectionHeading>
                  <DescriptionList variant="rows">
                    <DescriptionListRow detail={displayTitle} term={t('columnTitle')} />
                    <DescriptionListRow detail={textOrEmpty(stub.author)} term={t('fieldAuthor')} />
                    <DescriptionListRow
                      detail={providerText(stub.index_provider)}
                      term={t('fieldProvider')}
                    />
                    <DescriptionListRow
                      detail={stub.provider_feed_id}
                      term={t('columnProviderFeedId')}
                    />
                    <DescriptionListRow
                      detail={textOrEmpty(stub.feed_guid)}
                      term={t('fieldFeedGuid')}
                    />
                    <DescriptionListRow
                      detail={textOrEmpty(stub.feed_url)}
                      term={t('columnFeedUrl')}
                    />
                    <DescriptionListRow
                      detail={mediumText(stub.medium_value)}
                      term={t('columnMedium')}
                    />
                    <DescriptionListRow
                      detail={formatDateTimeAbbrev(stub.resolved_at, locale)}
                      term={t('columnLastResolved')}
                    />
                    <DescriptionListRow
                      detail={formatDateTimeAbbrev(stub.created_at, locale)}
                      term={t('fieldCreated')}
                    />
                  </DescriptionList>
                </FormStack>
              </PageSection>
              <PageSection aria-label={t('sectionAliases')}>
                <FormStack>
                  <SectionHeading level={2}>{t('sectionAliases')}</SectionHeading>
                  <AliasTable aliases={stub.aliases} kindText={aliasKindText} t={t} />
                </FormStack>
              </PageSection>
              <PageSection aria-label={t('sectionItems')}>
                <FormStack>
                  <SectionHeading level={2}>{t('sectionItems')}</SectionHeading>
                  {stub.item_stub_count > 50 ? (
                    <p>{t('itemsNewestNote', { count: stub.item_stub_count })}</p>
                  ) : null}
                  <ItemTable
                    emptyValue={t('emptyValue')}
                    items={stub.item_stubs}
                    locale={locale}
                    t={t}
                  />
                </FormStack>
              </PageSection>
              <PageSection aria-label={t('sectionJobs')}>
                <FormStack>
                  <SectionHeading level={2}>{t('sectionJobs')}</SectionHeading>
                  <JobTable
                    emptyValue={t('emptyValue')}
                    jobActionText={jobActionText}
                    jobStatusText={jobStatusText}
                    jobs={stub.jobs}
                    locale={locale}
                    t={t}
                  />
                </FormStack>
              </PageSection>
              {showActions ? (
                <FormPrimaryActions>
                  {canDelete ? (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteOpen(true);
                      }}
                      type="button"
                      variant="danger"
                    >
                      {t('actionDelete')}
                    </Button>
                  ) : null}
                  {canUpdate ? (
                    <Button
                      disabled={queueDisabled}
                      onClick={() => {
                        setRepointError(null);
                        setRepointId('');
                        setRepointOpen(true);
                      }}
                      type="button"
                      variant="secondary"
                    >
                      {t('actionRepoint')}
                    </Button>
                  ) : null}
                  {canCreate ? (
                    <Button
                      disabled={queueDisabled}
                      onClick={() => {
                        setPromoteOpen(true);
                      }}
                      type="button"
                      variant="secondary"
                    >
                      {t('actionPromote')}
                    </Button>
                  ) : null}
                  {canUpdate ? (
                    <Button
                      disabled={queueDisabled}
                      onClick={() => {
                        void runRecheck();
                      }}
                      type="button"
                      variant="primary"
                    >
                      {t('actionRecheck')}
                    </Button>
                  ) : null}
                </FormPrimaryActions>
              ) : null}
              <Modal
                ariaLabel={t('repointTitle')}
                closeButtonAriaLabel={tc('closeModalAria')}
                header={t('repointTitle')}
                isOpen={repointOpen}
                onClose={() => {
                  if (!busy) {
                    setRepointOpen(false);
                  }
                }}
              >
                <form
                  onSubmit={(event) => {
                    void submitRepoint(event);
                  }}
                >
                  <ModalBody>
                    <TextInput
                      aria-invalid={repointError !== null ? true : undefined}
                      autoComplete="off"
                      eyebrow={t('columnProviderFeedId')}
                      id="remote-stub-repoint-provider-feed-id"
                      info={t('repointHelp')}
                      placeholder={t('repointPlaceholder')}
                      value={repointId}
                      onChange={(event) => {
                        setRepointId(event.target.value);
                      }}
                    />
                    {repointError !== null ? (
                      <div role="alert">
                        <Alert>{repointError}</Alert>
                      </div>
                    ) : null}
                  </ModalBody>
                  <ModalActions>
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setRepointOpen(false);
                      }}
                      type="button"
                      variant="secondary"
                    >
                      {tc('cancel')}
                    </Button>
                    <Button disabled={busy} isLoading={busy} type="submit" variant="primary">
                      {t('actionRepoint')}
                    </Button>
                  </ModalActions>
                </form>
              </Modal>
              <Modal
                ariaLabel={t('promoteTitle')}
                closeButtonAriaLabel={tc('closeModalAria')}
                header={t('promoteTitle')}
                isOpen={promoteOpen}
                onClose={() => {
                  if (!busy) {
                    setPromoteOpen(false);
                  }
                }}
              >
                <ModalBody>
                  <p>
                    {t('promoteBody', {
                      brand_name: getConfig().public.brand.name ?? 'Management',
                    })}
                  </p>
                </ModalBody>
                <ModalActions>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setPromoteOpen(false);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    {tc('cancel')}
                  </Button>
                  <Button
                    disabled={busy}
                    isLoading={busy}
                    onClick={() => {
                      void runPromote();
                    }}
                    type="button"
                    variant="primary"
                  >
                    {tc('confirm')}
                  </Button>
                </ModalActions>
              </Modal>
              <Modal
                ariaLabel={t('deleteConfirmAria')}
                closeButtonAriaLabel={tc('closeModalAria')}
                header={t('deleteTitle')}
                isOpen={deleteOpen}
                onClose={() => {
                  if (!busy) {
                    setDeleteOpen(false);
                  }
                }}
              >
                <ModalBody>
                  <p>{t('deleteBody')}</p>
                  {deleteError !== null ? (
                    <div role="alert">
                      <Alert>{deleteError}</Alert>
                    </div>
                  ) : null}
                </ModalBody>
                <ModalActions>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setDeleteOpen(false);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    {tc('cancel')}
                  </Button>
                  <Button
                    disabled={busy}
                    isLoading={busy}
                    onClick={() => {
                      void runDelete();
                    }}
                    type="button"
                    variant="danger"
                  >
                    {tc('confirm')}
                  </Button>
                </ModalActions>
              </Modal>
            </>
          ) : null}
        </ManagementPageShell>
      ) : null}
    </>
  );
}

type Copy = ReturnType<typeof useTranslations<'feedRemoteStubs'>>;

function AliasTable({
  aliases,
  kindText,
  t,
}: {
  aliases: RemoteStubAlias[];
  kindText: (kind: RemoteStubAlias['key_kind']) => string;
  t: Copy;
}) {
  return (
    <Table.ScrollContainer>
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>{t('columnKind')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnValue')}</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {aliases.map((alias) => (
            <Table.Row key={`${alias.key_kind}:${alias.key_value}`}>
              <Table.Cell>{kindText(alias.key_kind)}</Table.Cell>
              <Table.Cell>{alias.key_value}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Table.ScrollContainer>
  );
}

function ItemTable({
  emptyValue,
  items,
  locale,
  t,
}: {
  emptyValue: string;
  items: RemoteStubItemStub[];
  locale: string;
  t: Copy;
}) {
  return (
    <Table.ScrollContainer>
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>{t('columnTitle')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnItemGuid')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnPublished')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnDuration')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnLastResolved')}</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {items.map((item) => (
            <Table.Row key={item.item_guid}>
              <Table.Cell>
                {item.title !== null && item.title !== '' ? item.title : emptyValue}
              </Table.Cell>
              <Table.Cell>{item.item_guid}</Table.Cell>
              <Table.Cell>
                {item.pub_date !== null ? formatDateTimeAbbrev(item.pub_date, locale) : emptyValue}
              </Table.Cell>
              <Table.Cell>
                {item.duration_seconds !== null ? formatHHMMSS(item.duration_seconds) : emptyValue}
              </Table.Cell>
              <Table.Cell>{formatDateTimeAbbrev(item.resolved_at, locale)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Table.ScrollContainer>
  );
}

function JobTable({
  emptyValue,
  jobActionText,
  jobStatusText,
  jobs,
  locale,
  t,
}: {
  emptyValue: string;
  jobActionText: (jobType: string) => string;
  jobStatusText: (status: string) => string;
  jobs: RemoteStubHistoryJob[];
  locale: string;
  t: Copy;
}) {
  return (
    <Table.ScrollContainer>
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>{t('columnAction')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnStatus')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnAttempts')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnRunAfter')}</Table.HeaderCell>
            <Table.HeaderCell>{t('columnLastError')}</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {jobs.map((job) => (
            <Table.Row key={`${job.job_type}:${job.updated_at}:${job.run_after}`}>
              <Table.Cell>{jobActionText(job.job_type)}</Table.Cell>
              <Table.Cell>{jobStatusText(job.status)}</Table.Cell>
              <Table.Cell>
                {job.attempts}/{job.max_attempts}
              </Table.Cell>
              <Table.Cell>{formatDateTimeAbbrev(job.run_after, locale)}</Table.Cell>
              <Table.Cell>
                {job.last_error !== null && job.last_error !== '' ? job.last_error : emptyValue}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Table.ScrollContainer>
  );
}
