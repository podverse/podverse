'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { FormDropdownOption } from '@podverse/ui';
import {
  ActionLink,
  Alert,
  Breadcrumbs,
  Button,
  ButtonTabs,
  CheckboxField,
  CheckboxFieldList,
  DescriptionList,
  FormContinuationSection,
  FormDropdown,
  FormGroup,
  FormHintText,
  FormTextArea,
  LeadParagraph,
  LookupFieldGrid,
  lookupFieldGridButtonClass,
  lookupFieldGridControlClass,
  lookupFieldGridFormBlockClass,
  ManagementPageShell,
  Modal,
  ModalActions,
  MutedBreakableText,
  PageSection,
  ResourceTableWithFilter,
  RestrictedNotice,
  SectionHeading,
  StatusBadge,
  Table,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { ManagementProbeChromeGate } from '../../../../components/ManagementProbeChromeGate/ManagementProbeChromeGate';
import { useManagementTableChrome } from '../../../../components/Table/managementTableChrome';
import { ManagementIconButtonLink } from '../../../../lib/ManagementIconButtonLink';
import {
  canUpdateFeeds,
  feedOperationsRequireConfirm,
  LIFECYCLE_TAKEDOWN_KEY,
} from '../../../../lib/managementPermissions';
import { managementSearchParamsObject } from '../../../../lib/managementTableUrl';
import type { CurrentUser } from '../../../../lib/requests/auth';
import {
  applyFeedPolicyState,
  type FeedOperationsListSortKey,
  type FeedOperationsLookup,
  type FeedOperationsOptionsResponse,
  getFeedOperationOptions,
  listFeedOperations,
  lookupFeed,
  probeFeedOperationsDirectoryHasFeeds,
} from '../../../../lib/requests/feeds';
import { resolveManagementTableEmptyState } from '../../../../lib/tableEmptyState';

import dataSurfaceBusyStyles from '../../../../styles/managementDataSurfaceBusy.module.scss';

type FlagStatusPageClientProps = {
  user: CurrentUser;
};

type SearchMode = 'podcast_index_id' | 'feed_id' | 'url';
type FlagStatusSection = 'searchFeeds' | 'findFeed';

const DIRECTORY_PAGE_SIZE = 25;

const FEED_FLAG_STATUS_SECTION_IDS = {
  directory: 'feed-flag-status-directory',
  findFeed: 'feed-flag-status-find-feed',
  thisFeed: 'feed-flag-status-this-feed',
} as const;

function directoryLifecycleBadgeVariant(
  lifecycleKey: string
): 'danger' | 'neutral' | 'success' | 'warning' {
  if (lifecycleKey === 'active') {
    return 'success';
  }
  if (lifecycleKey.includes('takedown')) {
    return 'danger';
  }
  return 'neutral';
}

function buildConditionChecked(
  types: { condition_key: string }[],
  activeKeys: string[]
): Record<string, boolean> {
  const active = new Set(activeKeys);
  const next: Record<string, boolean> = {};
  for (const t of types) {
    next[t.condition_key] = active.has(t.condition_key);
  }
  return next;
}

export function FlagStatusPageClient({ user }: FlagStatusPageClientProps) {
  const t = useTranslations('feedFlagStatus');
  const tc = useTranslations('common');
  const td = useTranslations('database');
  const tNav = useTranslations('nav');
  const canUpdate = canUpdateFeeds(user);
  const [selectedSection, setSelectedSection] = useState<FlagStatusSection>('searchFeeds');
  const [options, setOptions] = useState<FeedOperationsOptionsResponse | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('podcast_index_id');
  const [searchText, setSearchText] = useState('');
  const [feed, setFeed] = useState<FeedOperationsLookup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [lifecycleStateKey, setLifecycleStateKey] = useState('');
  const [conditionChecked, setConditionChecked] = useState<Record<string, boolean>>({});
  const [takedownReasonKey, setTakedownReasonKey] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [spamItemLimitOverrideInput, setSpamItemLimitOverrideInput] = useState('');
  const [maxResponseBodyBytesOverrideInput, setMaxResponseBodyBytesOverrideInput] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [directoryFeeds, setDirectoryFeeds] = useState<FeedOperationsLookup[]>([]);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directorySortField, setDirectorySortField] = useState<FeedOperationsListSortKey>('id');
  const [directorySortDir, setDirectorySortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [directoryLifecycleFilter, setDirectoryLifecycleFilter] = useState('');
  /** Start true so the first paint after options load does not treat directoryTotal 0 as loaded (FOUC system-empty / tools). */
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [directoryRefresh, setDirectoryRefresh] = useState(0);
  const [directoryProbeHasFeeds, setDirectoryProbeHasFeeds] = useState<boolean | undefined>(
    undefined
  );

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chrome = useManagementTableChrome();
  const basePath = pathname !== null && pathname !== '' ? pathname : '/feeds/flag-status';
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );

  useEffect(() => {
    let c = false;
    const run = async () => {
      try {
        const o = await getFeedOperationOptions();
        if (!c) {
          setOptions(o);
        }
      } catch {
        if (!c) {
          setOptionsError(t('optionsLoadError'));
        }
      } finally {
        if (!c) {
          setOptionsLoading(false);
        }
      }
    };
    void run();
    return () => {
      c = true;
    };
  }, [t]);

  useEffect(() => {
    if (optionsLoading) {
      return;
    }
    let cancelled = false;
    const loadDirectory = async () => {
      setDirectoryLoading(true);
      setDirectoryError(null);
      try {
        const qRaw = searchParams.get('search') ?? '';
        const res = await listFeedOperations({
          page: directoryPage,
          limit: DIRECTORY_PAGE_SIZE,
          sort: directorySortField,
          order: directorySortDir === 'ASC' ? 'asc' : 'desc',
          q: qRaw.trim() !== '' ? qRaw.trim() : undefined,
          lifecycle:
            directoryLifecycleFilter.trim() !== '' ? directoryLifecycleFilter.trim() : undefined,
        });
        if (!cancelled) {
          setDirectoryFeeds(res.feeds);
          setDirectoryTotal(res.pagination.total);
        }
      } catch {
        if (!cancelled) {
          setDirectoryError(t('directoryLoadError'));
        }
      } finally {
        if (!cancelled) {
          setDirectoryLoading(false);
        }
      }
    };
    void loadDirectory();
    return () => {
      cancelled = true;
    };
  }, [
    optionsLoading,
    directoryPage,
    directorySortField,
    directorySortDir,
    directoryLifecycleFilter,
    directoryRefresh,
    searchParams,
    t,
  ]);

  const setFeedStateFromLookup = useCallback(
    (nextFeed: FeedOperationsLookup, conditionTypes: { condition_key: string }[]) => {
      setFeed(nextFeed);
      setSelectedSection('findFeed');
      setLifecycleStateKey(nextFeed.lifecycle_state_key ?? '');
      setConditionChecked(
        buildConditionChecked(conditionTypes, nextFeed.active_condition_keys ?? [])
      );
      setTakedownReasonKey(nextFeed.lifecycle_reason ?? '');
      setTransitionNote('');
      setConditionNote('');
      setSpamItemLimitOverrideInput(
        nextFeed.spam_item_limit_override !== null &&
          nextFeed.spam_item_limit_override !== undefined
          ? String(nextFeed.spam_item_limit_override)
          : ''
      );
      setMaxResponseBodyBytesOverrideInput(
        nextFeed.max_response_body_bytes_override !== null &&
          nextFeed.max_response_body_bytes_override !== undefined
          ? String(nextFeed.max_response_body_bytes_override)
          : ''
      );
    },
    []
  );

  const openFeedFromDirectoryRow = useCallback(
    (row: FeedOperationsLookup) => {
      setLoadError(null);
      setApplyMessage(null);
      setApplyError(null);
      setFeedStateFromLookup(row, options?.condition_types ?? []);
    },
    [options?.condition_types, setFeedStateFromLookup]
  );

  const performLookup = useCallback(async () => {
    setLoadError(null);
    setApplyMessage(null);
    setApplyError(null);
    setFeed(null);
    setLookupLoading(true);
    try {
      const conditionTypes = options?.condition_types ?? [];
      if (searchMode === 'url') {
        if (!searchText.trim()) {
          setLoadError(t('lookupErrorEnterUrl'));
          return;
        }
        const { feed: f } = await lookupFeed({ url: searchText.trim() });
        setFeedStateFromLookup(f, conditionTypes);
        return;
      }
      const n = parseInt(searchText.trim(), 10);
      if (Number.isNaN(n) || n <= 0) {
        setLoadError(t('lookupErrorPositiveNumber'));
        return;
      }
      if (searchMode === 'podcast_index_id') {
        const { feed: f } = await lookupFeed({ podcast_index_id: n });
        setFeedStateFromLookup(f, conditionTypes);
        return;
      }
      const { feed: f } = await lookupFeed({ feed_id: n });
      setFeedStateFromLookup(f, conditionTypes);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setLoadError(
        message !== null && message !== undefined && message !== ''
          ? String(message)
          : t('lookupErrorGeneric')
      );
    } finally {
      setLookupLoading(false);
    }
  }, [options?.condition_types, searchMode, searchText, setFeedStateFromLookup, t]);

  const selectedActiveConditionKeys = useMemo(() => {
    if (!options?.condition_types) {
      return [];
    }
    return options.condition_types
      .map((c) => c.condition_key)
      .filter((key) => conditionChecked[key] === true);
  }, [conditionChecked, options?.condition_types]);

  const needsConfirm = useMemo(() => {
    return feedOperationsRequireConfirm({
      lifecycleStateKey,
      activeConditionKeys: selectedActiveConditionKeys,
    });
  }, [lifecycleStateKey, selectedActiveConditionKeys]);

  const runApply = useCallback(async () => {
    if (!feed || !canUpdate || !options) {
      return;
    }
    if (!lifecycleStateKey) {
      setApplyError(t('applyErrorSelectLifecycle'));
      return;
    }
    if (lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY) {
      const hasReason = takedownReasonKey.trim().length > 0;
      const hasTransition = transitionNote.trim().length > 0;
      if (!hasReason && !hasTransition) {
        setApplyError(t('applyErrorTakedownDoc'));
        return;
      }
    }
    const spamOverrideRaw = spamItemLimitOverrideInput.trim();
    let spamItemLimitOverride: number | null = null;
    if (spamOverrideRaw.length > 0) {
      const parsedSpamOverride = parseInt(spamOverrideRaw, 10);
      if (Number.isNaN(parsedSpamOverride) || parsedSpamOverride <= 0) {
        setApplyError(t('applyErrorSpamOverride'));
        return;
      }
      spamItemLimitOverride = parsedSpamOverride;
    }
    const maxResponseOverrideRaw = maxResponseBodyBytesOverrideInput.trim();
    let maxResponseBodyBytesOverride: number | null = null;
    if (maxResponseOverrideRaw.length > 0) {
      const parsedMaxResponseOverride = parseInt(maxResponseOverrideRaw, 10);
      if (Number.isNaN(parsedMaxResponseOverride) || parsedMaxResponseOverride <= 0) {
        setApplyError(t('applyErrorMaxResponseBytesOverride'));
        return;
      }
      maxResponseBodyBytesOverride = parsedMaxResponseOverride;
    }
    setApplyLoading(true);
    setApplyError(null);
    setApplyMessage(null);
    try {
      const transitionTrim = transitionNote.trim();
      const conditionTrim = conditionNote.trim();
      await applyFeedPolicyState({
        feed_id: feed.id,
        lifecycle_state_key: lifecycleStateKey,
        active_condition_keys: selectedActiveConditionKeys,
        lifecycle_reason_key:
          lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY && takedownReasonKey.trim().length > 0
            ? takedownReasonKey.trim()
            : null,
        transition_note: transitionTrim.length > 0 ? transitionTrim : null,
        condition_note: conditionTrim.length > 0 ? conditionTrim : null,
        spam_item_limit_override: spamItemLimitOverride,
        max_response_body_bytes_override: maxResponseBodyBytesOverride,
      });
      setApplyMessage(t('applySuccess'));
      setConfirmOpen(false);
      setFeed((prev) =>
        prev
          ? {
              ...prev,
              lifecycle_state_key: lifecycleStateKey,
              lifecycle_reason:
                lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY && takedownReasonKey.trim().length > 0
                  ? takedownReasonKey.trim()
                  : prev.lifecycle_reason,
              active_condition_keys: selectedActiveConditionKeys,
              spam_item_limit_override: spamItemLimitOverride,
              max_response_body_bytes_override: maxResponseBodyBytesOverride,
            }
          : null
      );
      setDirectoryRefresh((n) => n + 1);
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setApplyError(message ? String(message) : t('applyErrorGeneric'));
    } finally {
      setApplyLoading(false);
    }
  }, [
    feed,
    canUpdate,
    options,
    lifecycleStateKey,
    takedownReasonKey,
    transitionNote,
    conditionNote,
    selectedActiveConditionKeys,
    spamItemLimitOverrideInput,
    maxResponseBodyBytesOverrideInput,
    t,
  ]);

  const handleClickApply = useCallback(() => {
    if (!feed || !canUpdate) {
      return;
    }
    if (!lifecycleStateKey) {
      setApplyError(t('applyErrorSelectLifecycle'));
      return;
    }
    if (lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY) {
      const hasReason = takedownReasonKey.trim().length > 0;
      const hasTransition = transitionNote.trim().length > 0;
      if (!hasReason && !hasTransition) {
        setApplyError(t('applyErrorTakedownDoc'));
        return;
      }
    }
    if (needsConfirm) {
      setConfirmOpen(true);
    } else {
      void runApply();
    }
  }, [
    feed,
    canUpdate,
    lifecycleStateKey,
    takedownReasonKey,
    transitionNote,
    needsConfirm,
    runApply,
    t,
  ]);

  const directoryTotalPages = useMemo(
    () => Math.max(1, Math.ceil(directoryTotal / DIRECTORY_PAGE_SIZE)),
    [directoryTotal]
  );

  const directoryPaginationText = useMemo(() => {
    if (directoryTotal === 1) {
      return td('paginationSummarySingular', {
        total: directoryTotal,
        page: directoryPage,
        totalPages: directoryTotalPages,
      });
    }
    return td('paginationSummary', {
      total: directoryTotal,
      page: directoryPage,
      totalPages: directoryTotalPages,
    });
  }, [directoryPage, directoryTotal, directoryTotalPages, td]);

  const feedDirectoryLifecycleOptions = useMemo<FormDropdownOption[]>(() => {
    const allOption: FormDropdownOption = { value: '', label: t('filterLifecycleAll') };
    if (!options?.lifecycle_states?.length) {
      return [allOption];
    }
    return [
      allOption,
      ...options.lifecycle_states.map((s) => ({
        value: s.state_key,
        label: t('selectOptionLifecycle', { state: s.state_key }),
      })),
    ];
  }, [options?.lifecycle_states, t]);

  const feedLookupSearchModeOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: 'podcast_index_id', label: t('searchModePodcastIndexId') },
      { value: 'feed_id', label: t('searchModeFeedId') },
      { value: 'url', label: t('searchModeUrl') },
    ],
    [t]
  );

  const applyLifecycleOptions = useMemo<FormDropdownOption[]>(() => {
    const placeholder: FormDropdownOption = {
      value: '',
      label: t('selectLifecyclePlaceholder'),
    };
    if (!options?.lifecycle_states?.length) {
      return [placeholder];
    }
    return [
      placeholder,
      ...options.lifecycle_states.map((s) => ({
        value: s.state_key,
        label: t('selectOptionLifecycle', { state: s.state_key }),
      })),
    ];
  }, [options?.lifecycle_states, t]);

  const takedownReasonDropdownOptions = useMemo<FormDropdownOption[]>(() => {
    const placeholder: FormDropdownOption = {
      value: '',
      label: t('takedownReasonPlaceholder'),
    };
    if (!options?.takedown_reasons?.length) {
      return [placeholder];
    }
    return [
      placeholder,
      ...options.takedown_reasons.map((r) => ({
        value: r.reason,
        label: r.reason,
      })),
    ];
  }, [options?.takedown_reasons, t]);

  const directoryUrlSearchTrim = (searchParams.get('search') ?? '').trim();
  const directoryHasFilters =
    directoryUrlSearchTrim !== '' || directoryLifecycleFilter.trim() !== '';

  useEffect(() => {
    setDirectoryProbeHasFeeds(undefined);
  }, [directoryUrlSearchTrim, directoryLifecycleFilter]);

  useEffect(() => {
    if (directoryLoading || directoryError !== null) {
      return;
    }
    if (!directoryHasFilters) {
      setDirectoryProbeHasFeeds(undefined);
      return;
    }
    if (directoryFeeds.length > 0) {
      setDirectoryProbeHasFeeds(true);
      return;
    }
    let cancelled = false;
    void probeFeedOperationsDirectoryHasFeeds({
      order: directorySortDir === 'ASC' ? 'asc' : 'desc',
      sort: directorySortField,
    }).then((has) => {
      if (!cancelled) {
        setDirectoryProbeHasFeeds(has);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    directoryLoading,
    directoryError,
    directoryHasFilters,
    directoryFeeds.length,
    directorySortField,
    directorySortDir,
  ]);

  const directoryHasDataInSystem =
    directoryLoading || directoryError !== null
      ? undefined
      : !directoryHasFilters
        ? directoryTotal > 0
        : directoryProbeHasFeeds;

  const directoryTableEmptyState = resolveManagementTableEmptyState({
    filteredEmptyMessage: t('directoryEmpty'),
    hasDataInSystem: directoryHasDataInSystem,
    hasVisibleRows: directoryFeeds.length > 0,
    systemEmptyMessage: chrome.systemEmptyMessage,
  });

  const feedOpsDirectorySystemEmpty =
    directoryTableEmptyState?.mode === 'system-empty' &&
    directoryError === null &&
    optionsError === null;

  const directoryProbingExistence =
    !directoryLoading &&
    directoryError === null &&
    directoryHasFilters &&
    directoryFeeds.length === 0 &&
    directoryProbeHasFeeds === undefined;

  const directoryColumns = useMemo(
    () => [
      {
        header: t('tableFeedId'),
        id: 'id',
        label: t('tableFeedId'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableFeedId'))),
        sortKey: 'id',
      },
      {
        header: t('tableChannelTitle'),
        id: 'channel_title',
        label: t('tableChannelTitle'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableChannelTitle'))),
        sortKey: 'channel_title',
      },
      {
        header: t('tablePodcastIndexId'),
        id: 'podcast_index_id',
        label: t('tablePodcastIndexId'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tablePodcastIndexId'))),
        sortKey: 'podcast_index_id',
      },
      {
        header: t('tableLifecycle'),
        id: 'lifecycle_state_key',
        label: t('tableLifecycle'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableLifecycle'))),
        sortKey: 'lifecycle_state_key',
      },
      {
        header: t('tableUrl'),
        id: 'url',
        label: t('tableUrl'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('tableUrl'))),
        sortKey: 'url',
      },
    ],
    [chrome, t]
  );

  useEffect(() => {
    const raw = searchParams.get('openFeedId');
    if (raw === null || raw === '' || options === null) {
      return;
    }
    const id = Number.parseInt(raw, 10);
    if (Number.isNaN(id)) {
      return;
    }
    const row = directoryFeeds.find((f) => f.id === id);
    if (row !== undefined) {
      openFeedFromDirectoryRow(row);
    }
  }, [directoryFeeds, openFeedFromDirectoryRow, options, searchParams]);

  const sectionButtonTabs = useMemo(
    () => [
      {
        key: 'searchFeeds',
        label: t('sectionTabSearchFeeds'),
        onClick: () => {
          setSelectedSection('searchFeeds');
        },
      },
      {
        key: 'findFeed',
        label: t('sectionTabFindFeed'),
        onClick: () => {
          setSelectedSection('findFeed');
        },
      },
    ],
    [t]
  );

  if (optionsLoading) {
    return (
      <ManagementPageShell title={t('pageTitle')}>
        <ManagementLoadingSpinnerOverlay isLoading />
      </ManagementPageShell>
    );
  }

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/dashboard', label: tNav('dashboard') },
            { href: '/feeds', label: t('breadcrumbFeeds') },
            { label: t('breadcrumbCurrent') },
          ]}
        />
      }
      title={t('pageTitle')}
    >
      {feedOpsDirectorySystemEmpty ? (
        <p role="status">{chrome.systemEmptyMessage}</p>
      ) : (
        <ManagementProbeChromeGate
          bypassWhileError={directoryError !== null || optionsError !== null}
          loading={directoryLoading}
          probingExistence={directoryProbingExistence}
        >
          <>
            <LeadParagraph>{t('pageSubtitle')}</LeadParagraph>

            {optionsError && <Alert variant="error">{optionsError}</Alert>}

            <ButtonTabs buttonTabs={sectionButtonTabs} selectedKey={selectedSection} />

            {selectedSection === 'searchFeeds' && (
              <PageSection
                aria-busy={directoryLoading ? true : undefined}
                aria-label={t('sectionDirectoryAria')}
                id={FEED_FLAG_STATUS_SECTION_IDS.directory}
              >
                <SectionHeading level={2}>{t('sectionTabSearchFeeds')}</SectionHeading>
                {directoryError && <Alert variant="error">{directoryError}</Alert>}
                {!directoryError && (
                  <div
                    className={directoryLoading ? dataSurfaceBusyStyles.dataSurfaceBusy : undefined}
                  >
                    <ResourceTableWithFilter<FeedOperationsLookup>
                    actions={{
                      LinkComponent: ManagementIconButtonLink,
                      labels: {
                        delete: tc('delete'),
                        edit: tc('edit'),
                        view: t('openFeedRow'),
                      },
                      viewHref: (row) => {
                        const p = new URLSearchParams(searchParams.toString());
                        p.set('openFeedId', String(row.id));
                        const qs = p.toString();
                        return qs !== ''
                          ? `${basePath}?${qs}`
                          : `${basePath}?openFeedId=${String(row.id)}`;
                      },
                    }}
                    allColumnIds={[
                      'id',
                      'channel_title',
                      'podcast_index_id',
                      'lifecycle_state_key',
                      'url',
                    ]}
                    basePath={basePath}
                    columns={directoryColumns}
                    currentQueryParams={currentQueryParams}
                    deleteConfirm={{
                      cancelLabel: chrome.deleteConfirmLabels.cancelLabel,
                      closeButtonAriaLabel: chrome.deleteConfirmLabels.closeButtonAriaLabel,
                      confirmLabel: chrome.deleteConfirmLabels.confirmLabel,
                      message: () => '',
                      modalAriaLabel: chrome.deleteConfirmLabels.modalAriaLabel,
                    }}
                    emptyState={directoryTableEmptyState}
                    filterableColumnIds={[
                      'id',
                      'channel_title',
                      'podcast_index_id',
                      'lifecycle_state_key',
                      'url',
                    ]}
                    getRowActions={() => ({
                      delete: 'hidden',
                      edit: 'hidden',
                      view: 'enabled',
                    })}
                    getRowKey={(row) => String(row.id)}
                    initialColumns={[
                      'id',
                      'channel_title',
                      'podcast_index_id',
                      'lifecycle_state_key',
                      'url',
                    ]}
                    initialSearch={searchParams.get('search') ?? ''}
                    labels={{
                      ...chrome.filterLabels,
                      actionsColumn: tc('actions'),
                    }}
                    pagination={{
                      currentPage: directoryPage,
                      nextLabel: tc('paginationNextButton'),
                      onPageChange: () => {},
                      pageIndicatorLabel: directoryPaginationText,
                      prevLabel: tc('paginationPrevButton'),
                      refreshOnPage: (newPage) => {
                        setDirectoryPage(newPage);
                      },
                      totalPages: directoryTotalPages,
                    }}
                    paginationMode="page"
                    renderCells={(row) => (
                      <>
                        <Table.Cell>{row.id}</Table.Cell>
                        <Table.Cell>{row.channel_title ?? t('emptyValue')}</Table.Cell>
                        <Table.Cell>{row.podcast_index_id}</Table.Cell>
                        <Table.Cell>
                          <StatusBadge
                            variant={directoryLifecycleBadgeVariant(row.lifecycle_state_key)}
                          >
                            {t('lifecycleDisplay', { state: row.lifecycle_state_key })}
                          </StatusBadge>
                        </Table.Cell>
                        <Table.Cell>
                          <MutedBreakableText>{row.url}</MutedBreakableText>
                        </Table.Cell>
                      </>
                    )}
                    rows={directoryFeeds}
                    searchSyncParams={{ page: '1' }}
                    sortBy={directorySortField}
                    sortOrder={directorySortDir === 'ASC' ? 'asc' : 'desc'}
                    sortableColumnIds={[
                      'id',
                      'channel_title',
                      'podcast_index_id',
                      'lifecycle_state_key',
                      'url',
                    ]}
                    trailingToolbar={
                      <div style={{ minWidth: 'min(100%, 220px)' }}>
                        <FormDropdown
                          eyebrow={t('filterLifecycleLabel')}
                          id="feed-directory-lifecycle"
                          options={feedDirectoryLifecycleOptions}
                          value={directoryLifecycleFilter}
                          onChange={(v) => {
                            setDirectoryLifecycleFilter(v);
                            setDirectoryPage(1);
                          }}
                        />
                      </div>
                    }
                    onSortChange={(sortKey, order) => {
                      setDirectorySortField(sortKey as FeedOperationsListSortKey);
                      setDirectorySortDir(order === 'asc' ? 'ASC' : 'DESC');
                      setDirectoryPage(1);
                    }}
                    />
                  </div>
                )}
              </PageSection>
            )}

            {selectedSection === 'findFeed' && (
              <PageSection
                aria-label={t('sectionFindAria')}
                id={FEED_FLAG_STATUS_SECTION_IDS.findFeed}
              >
                <SectionHeading level={2}>{t('sectionTabFindFeed')}</SectionHeading>
                <LookupFieldGrid variant="inlineEyebrow">
                <div className={lookupFieldGridControlClass}>
                  <FormDropdown
                    eyebrow={t('searchByLabel')}
                    id="feed-flag-lookup-mode"
                    options={feedLookupSearchModeOptions}
                    value={searchMode}
                    onChange={(v) => {
                      if (v === 'podcast_index_id' || v === 'feed_id' || v === 'url') {
                        setSearchMode(v);
                      }
                    }}
                  />
                </div>
                <TextInput
                  autoComplete="off"
                  className={lookupFieldGridControlClass}
                  eyebrow={searchMode === 'url' ? t('searchValueLabelUrl') : t('searchValueLabel')}
                  id="feed-flag-lookup-value"
                  name="q"
                  placeholder={searchMode === 'url' ? t('placeholderUrl') : t('placeholderNumber')}
                  type={searchMode === 'url' ? 'text' : 'number'}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <Button
                  className={lookupFieldGridButtonClass}
                  disabled={lookupLoading}
                  onClick={() => {
                    void performLookup();
                  }}
                  type="button"
                  variant="primary"
                >
                  {lookupLoading ? t('lookupLoading') : t('lookupButton')}
                </Button>
                </LookupFieldGrid>
                {loadError && <Alert variant="error">{loadError}</Alert>}
              </PageSection>
            )}

            {selectedSection === 'findFeed' && feed && (
              <PageSection
                aria-label={t('sectionFeedAria')}
                id={FEED_FLAG_STATUS_SECTION_IDS.thisFeed}
              >
                <SectionHeading level={2}>{t('thisFeedHeading')}</SectionHeading>
                <SectionHeading level={4}>{t('onRecordHeading')}</SectionHeading>
                <DescriptionList variant="flat">
                  {feed.channel_title && (
                    <>
                      <dt>{t('dtChannelTitle')}</dt>
                      <dd>{feed.channel_title}</dd>
                    </>
                  )}
                  <dt>{t('dtUrl')}</dt>
                  <dd>
                    <MutedBreakableText>{feed.url}</MutedBreakableText>
                  </dd>
                  <dt>{t('dtInternalFeedId')}</dt>
                  <dd>{feed.id}</dd>
                  <dt>{t('dtPodcastIndexId')}</dt>
                  <dd>{feed.podcast_index_id}</dd>
                  <dt>{t('dtLifecycle')}</dt>
                  <dd>{t('lifecycleDisplay', { state: feed.lifecycle_state_key })}</dd>
                  <dt>{t('dtActiveConditions')}</dt>
                  <dd>
                    {feed.active_condition_keys?.length
                      ? feed.active_condition_keys.join(', ')
                      : t('emptyValue')}
                  </dd>
                  <dt>{t('dtEffectivePolicy')}</dt>
                  <dd>
                    {t('effectivePolicyDisplay', {
                      parse: feed.parse_allowed ? t('boolYes') : t('boolNo'),
                      public: feed.public_visible ? t('boolYes') : t('boolNo'),
                      add: feed.add_allowed ? t('boolYes') : t('boolNo'),
                      reason: feed.primary_block_reason ?? t('emptyValue'),
                    })}
                  </dd>
                  <dt>{t('dtSpamOverride')}</dt>
                  <dd>{feed.spam_item_limit_override ?? t('emptyValue')}</dd>
                  <dt>{t('dtMaxResponseBytesOverride')}</dt>
                  <dd>{feed.max_response_body_bytes_override ?? t('emptyValue')}</dd>
                  <dt>{t('dtLifecycleReason')}</dt>
                  <dd>{feed.lifecycle_reason ?? t('emptyValue')}</dd>
                  <dt>{t('dtUpdatedSource')}</dt>
                  <dd>{feed.updated_source}</dd>
                </DescriptionList>
                <p>
                  <ActionLink
                    href={`/database/feed/${String(feed.id)}`}
                    LinkComponent={Link}
                    variant="inline"
                  >
                    {t('openInDatabase')}
                  </ActionLink>
                </p>

                {canUpdate && options && (
                  <FormContinuationSection>
                    <SectionHeading level={4}>{t('newValuesHeading')}</SectionHeading>
                    <div className={lookupFieldGridFormBlockClass}>
                      <FormGroup>
                        <FormDropdown
                          id="feed-apply-lifecycle"
                          eyebrow={t('labelLifecycleRequired')}
                          options={applyLifecycleOptions}
                          value={lifecycleStateKey}
                          onChange={(v) => {
                            setLifecycleStateKey(v);
                          }}
                        />
                      </FormGroup>

                      <FormGroup>
                        <CheckboxFieldList eyebrow={t('labelActiveConditions')}>
                          {options.condition_types.map((c) => (
                            <CheckboxField
                              key={c.condition_key}
                              label={c.condition_key}
                              checked={conditionChecked[c.condition_key] === true}
                              onChange={(checked) => {
                                setConditionChecked((prev) => ({
                                  ...prev,
                                  [c.condition_key]: checked,
                                }));
                              }}
                            />
                          ))}
                        </CheckboxFieldList>
                      </FormGroup>

                      {lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY && (
                        <FormGroup>
                          <FormDropdown
                            id="feed-apply-takedown-reason"
                            eyebrow={t('labelTakedownReasonOptional')}
                            options={takedownReasonDropdownOptions}
                            value={takedownReasonKey}
                            onChange={(v) => {
                              setTakedownReasonKey(v);
                            }}
                          />
                        </FormGroup>
                      )}

                      <FormTextArea
                        eyebrow={t('labelTransitionNote')}
                        maxLength={10000}
                        name="transition-note"
                        placeholder={t('transitionNotePlaceholder')}
                        rows={3}
                        value={transitionNote}
                        onChange={(e) => setTransitionNote(e.target.value)}
                      />

                      <FormTextArea
                        eyebrow={t('labelConditionNote')}
                        maxLength={10000}
                        name="condition-note"
                        placeholder={t('conditionNotePlaceholder')}
                        rows={3}
                        value={conditionNote}
                        onChange={(e) => setConditionNote(e.target.value)}
                      />

                      <TextInput
                        eyebrow={t('labelSpamOverride')}
                        info={t('spamOverrideHint')}
                        min={1}
                        name="spam-item-limit-override"
                        placeholder={t('spamOverridePlaceholder')}
                        step={1}
                        type="number"
                        value={spamItemLimitOverrideInput}
                        onChange={(e) => setSpamItemLimitOverrideInput(e.target.value)}
                      />
                      <TextInput
                        eyebrow={t('labelMaxResponseBytesOverride')}
                        min={1}
                        name="max-response-body-bytes-override"
                        placeholder={t('maxResponseBytesOverridePlaceholder')}
                        step={1}
                        type="number"
                        value={maxResponseBodyBytesOverrideInput}
                        onChange={(e) => setMaxResponseBodyBytesOverrideInput(e.target.value)}
                      />
                      {applyError && <Alert variant="error">{applyError}</Alert>}
                      {applyMessage && <Alert variant="default">{applyMessage}</Alert>}

                      <Modal
                        ariaLabel={t('confirmDialogAria')}
                        closeButtonAriaLabel={tc('closeModalAria')}
                        isOpen={confirmOpen}
                        onClose={() => {
                          setConfirmOpen(false);
                        }}
                      >
                        <p>{t('confirmDialogBody')}</p>
                        <ModalActions>
                          <Button
                            type="button"
                            onClick={() => {
                              setConfirmOpen(false);
                            }}
                            variant="secondary"
                          >
                            {tc('cancel')}
                          </Button>
                          <Button
                            type="button"
                            disabled={applyLoading}
                            onClick={() => {
                              void runApply();
                            }}
                            variant="primary"
                          >
                            {applyLoading ? t('confirmApplying') : tc('confirm')}
                          </Button>
                        </ModalActions>
                      </Modal>

                      {!confirmOpen && (
                        <>
                          <Button
                            disabled={applyLoading}
                            onClick={handleClickApply}
                            type="button"
                            variant="primary"
                          >
                            {applyLoading
                              ? t('confirmApplying')
                              : needsConfirm
                                ? t('continueToConfirm')
                                : t('applyButton')}
                          </Button>
                          {needsConfirm && (
                            <FormHintText variant="block">{t('confirmHint')}</FormHintText>
                          )}
                        </>
                      )}
                    </div>
                  </FormContinuationSection>
                )}

                {!canUpdate && (
                  <RestrictedNotice>
                    <FormHintText variant="block">
                      {t.rich('readonlyHint', {
                        feedsCode: (chunks: ReactNode) => <code>{chunks}</code>,
                      })}
                    </FormHintText>
                  </RestrictedNotice>
                )}
              </PageSection>
            )}
          </>
        </ManagementProbeChromeGate>
      )}
    </ManagementPageShell>
  );
}
