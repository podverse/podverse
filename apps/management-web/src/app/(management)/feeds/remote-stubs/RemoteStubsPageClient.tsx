'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { formatDateTimeAbbrev } from '@podverse/helpers';
import type { SortDirection } from '@podverse/ui';
import {
  Alert,
  Breadcrumbs,
  EllipsisText,
  ManagementPageShell,
  ResourceTableWithFilter,
  Table,
} from '@podverse/ui';

import { ManagementProbeChromeGate } from '../../../../components/ManagementProbeChromeGate/ManagementProbeChromeGate';
import { useManagementTableChrome } from '../../../../components/Table/managementTableChrome';
import { ManagementIconButtonLink } from '../../../../lib/ManagementIconButtonLink';
import { canDeleteFeeds } from '../../../../lib/managementPermissions';
import { managementSearchParamsObject } from '../../../../lib/managementTableUrl';
import type { CurrentUser } from '../../../../lib/requests/auth';
import type {
  RemoteStubListOrder,
  RemoteStubListRow,
  RemoteStubListSort,
  RemoteStubPendingAction,
} from '../../../../lib/requests/feeds';
import { deleteRemoteStub, listRemoteStubs } from '../../../../lib/requests/feeds';
import { buildFeedRemoteStubPath, ROUTES } from '../../../../lib/routes';
import { resolveManagementTableEmptyState } from '../../../../lib/tableEmptyState';

const PAGE_SIZE = 25;

const COLUMN_IDS = [
  'title',
  'provider_feed_id',
  'medium',
  'feed_url',
  'item_stub_count',
  'resolved_at',
  'pending_action',
] as const;

const SORTABLE_COLUMN_IDS = [
  'title',
  'provider_feed_id',
  'item_stub_count',
  'resolved_at',
] as const;

type RemoteStubsPageClientProps = {
  user: CurrentUser;
};

type RateLimitCopy = {
  generic: string;
  minutes: (count: number) => string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRemoteStubListSort(value: string | null): value is RemoteStubListSort {
  return (
    value === 'title' ||
    value === 'provider_feed_id' ||
    value === 'item_stub_count' ||
    value === 'resolved_at' ||
    value === 'created_at'
  );
}

function isRemoteStubListOrder(value: string | null): value is RemoteStubListOrder {
  return value === 'asc' || value === 'desc';
}

function defaultOrder(sort: RemoteStubListSort): RemoteStubListOrder {
  if (sort === 'resolved_at' || sort === 'created_at') {
    return 'desc';
  }
  return 'asc';
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

export function RemoteStubsPageClient({ user }: RemoteStubsPageClientProps) {
  const t = useTranslations('feedRemoteStubs');
  const tc = useTranslations('common');
  const tHub = useTranslations('feedsHub');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const chrome = useManagementTableChrome();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canDelete = canDeleteFeeds(user);
  const deleteLock = useRef(false);

  const basePath = pathname !== null && pathname !== '' ? pathname : ROUTES.FEEDS_REMOTE_STUBS;
  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );
  const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const pageFromUrl = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const urlSearch = searchParams.get('search') ?? '';
  const urlSortRaw = searchParams.get('sort');
  const sort = isRemoteStubListSort(urlSortRaw) ? urlSortRaw : undefined;
  const urlOrderRaw = searchParams.get('order');
  const order =
    sort === undefined
      ? undefined
      : isRemoteStubListOrder(urlOrderRaw)
        ? urlOrderRaw
        : defaultOrder(sort);
  const sortBy = sort === undefined || sort === 'created_at' ? undefined : sort;
  const sortOrder: SortDirection = order ?? 'desc';

  const [rows, setRows] = useState<RemoteStubListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(pageFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [probeExists, setProbeExists] = useState<boolean | undefined>(undefined);

  const rateLimitCopy = useCallback((): RateLimitCopy => {
    return {
      generic: t('rateLimitGeneric'),
      minutes: (count) =>
        count === 1
          ? t('rateLimitMinute', { minutes: count })
          : t('rateLimitMinutes', { minutes: count }),
    };
  }, [t]);

  const loadStubs = useCallback(
    async (nextPage: number, search: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listRemoteStubs({
          limit: PAGE_SIZE,
          page: nextPage,
          ...(search.trim() !== '' ? { q: search.trim() } : {}),
          ...(sort !== undefined && order !== undefined ? { order, sort } : {}),
        });
        setRows(result.remote_stubs);
        setListTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
        setPage(result.pagination.page);
      } catch (loadError: unknown) {
        setRows([]);
        setListTotal(0);
        setError(rateLimitMessageFromError(loadError, rateLimitCopy()) ?? t('loadError'));
      } finally {
        setLoading(false);
      }
    },
    [order, rateLimitCopy, sort, t]
  );

  useEffect(() => {
    void loadStubs(pageFromUrl, urlSearch);
  }, [loadStubs, pageFromUrl, urlSearch]);

  useEffect(() => {
    if (loading || error !== null) {
      return;
    }
    if (urlSearch.trim() === '') {
      setProbeExists(undefined);
      return;
    }
    if (rows.length > 0) {
      setProbeExists(true);
      return;
    }
    let cancelled = false;
    void listRemoteStubs({ limit: 1, page: 1 }).then(
      (result) => {
        if (!cancelled) {
          setProbeExists(result.pagination.total > 0);
        }
      },
      () => {
        if (!cancelled) {
          setProbeExists(true);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [error, loading, rows.length, urlSearch]);

  const pushPageToUrl = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage));
      }
      const query = params.toString();
      router.push(query === '' ? basePath : `${basePath}?${query}`);
    },
    [basePath, router, searchParams]
  );

  const onSortChange = useCallback(
    (key: string, nextOrder: SortDirection) => {
      if (!isRemoteStubListSort(key)) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      if (key === 'created_at' && nextOrder === 'desc') {
        params.delete('sort');
        params.delete('order');
      } else {
        params.set('sort', key);
        params.set('order', nextOrder);
      }
      const query = params.toString();
      router.push(query === '' ? basePath : `${basePath}?${query}`);
    },
    [basePath, router, searchParams]
  );

  const pendingText = useCallback(
    (action: RemoteStubPendingAction | null): string => {
      switch (action) {
        case null:
          return '';
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
    },
    [t]
  );

  const mediumText = useCallback(
    (value: string | null): string => {
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
    },
    [t]
  );

  const columns = useMemo(
    () => [
      {
        defaultSortOrder: 'asc' as const,
        header: t('columnTitle'),
        id: 'title',
        label: t('columnTitle'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('columnTitle'))),
        sortKey: 'title',
      },
      {
        defaultSortOrder: 'asc' as const,
        header: t('columnProviderFeedId'),
        id: 'provider_feed_id',
        label: t('columnProviderFeedId'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('columnProviderFeedId'))),
        sortKey: 'provider_feed_id',
      },
      {
        header: t('columnMedium'),
        id: 'medium',
        label: t('columnMedium'),
      },
      {
        header: t('columnFeedUrl'),
        id: 'feed_url',
        label: t('columnFeedUrl'),
      },
      {
        defaultSortOrder: 'asc' as const,
        header: t('columnItems'),
        id: 'item_stub_count',
        label: t('columnItems'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('columnItems'))),
        sortKey: 'item_stub_count',
      },
      {
        defaultSortOrder: 'desc' as const,
        header: t('columnLastResolved'),
        id: 'resolved_at',
        label: t('columnLastResolved'),
        sortAriaLabel: chrome.sortAriaForColumn(String(t('columnLastResolved'))),
        sortKey: 'resolved_at',
      },
      {
        header: t('columnPending'),
        id: 'pending_action',
        label: t('columnPending'),
      },
    ],
    [chrome, t]
  );

  const hasDataInSystem = loading
    ? undefined
    : urlSearch.trim() === ''
      ? listTotal > 0
      : probeExists === undefined
        ? undefined
        : probeExists;

  const emptyState = resolveManagementTableEmptyState({
    filteredEmptyMessage: t('noResults'),
    hasDataInSystem,
    hasVisibleRows: rows.length > 0,
    systemEmptyMessage: t('empty'),
  });

  const probingExistence =
    !loading &&
    error === null &&
    urlSearch.trim() !== '' &&
    rows.length === 0 &&
    probeExists === undefined;

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.FEEDS, label: tHub('pageTitle') },
            { label: t('pageTitle') },
          ]}
        />
      }
      title={t('pageTitle')}
    >
      <ManagementProbeChromeGate
        bypassWhileError={error !== null}
        loading={loading}
        probingExistence={probingExistence}
      >
        <>
          {error !== null ? <Alert>{error}</Alert> : null}
          {actionError !== null ? (
            <div role="alert">
              <Alert>{actionError}</Alert>
            </div>
          ) : null}
          {error === null ? (
            <ResourceTableWithFilter<RemoteStubListRow>
              actions={{
                LinkComponent: ManagementIconButtonLink,
                labels: {
                  delete: tc('delete'),
                  edit: tc('edit'),
                  view: tc('view'),
                },
                viewHref: (row) => buildFeedRemoteStubPath(row.id),
                ...(canDelete
                  ? {
                      onDelete: async (row: RemoteStubListRow) => {
                        if (deleteLock.current) {
                          return;
                        }
                        deleteLock.current = true;
                        try {
                          await deleteRemoteStub(row.id);
                          setActionError(null);
                          await loadStubs(pageFromUrl, urlSearch);
                        } catch (deleteError: unknown) {
                          setActionError(
                            rateLimitMessageFromError(deleteError, rateLimitCopy()) ??
                              t('deleteError')
                          );
                        } finally {
                          deleteLock.current = false;
                        }
                      },
                    }
                  : {}),
              }}
              allColumnIds={[...COLUMN_IDS]}
              basePath={basePath}
              columns={columns}
              currentQueryParams={currentQueryParams}
              deleteConfirm={{
                ...chrome.deleteConfirmLabels,
                message: () => t('deleteBody'),
                modalAriaLabel: t('deleteConfirmAria'),
              }}
              emptyState={emptyState}
              filterableColumnIds={[...COLUMN_IDS]}
              getRowActions={() => ({
                delete: canDelete ? 'enabled' : 'hidden',
                edit: 'hidden',
                view: 'enabled',
              })}
              getRowKey={(row) => String(row.id)}
              initialColumns={[...COLUMN_IDS]}
              initialSearch={urlSearch}
              labels={{
                ...chrome.filterLabels,
                actionsColumn: tc('actions'),
                searchPlaceholder: t('searchPlaceholder'),
              }}
              pagination={{
                currentPage: page,
                nextLabel: tc('paginationNextButton'),
                onPageChange: (newPage) => {
                  pushPageToUrl(newPage);
                },
                pageIndicatorLabel: tc('paginationPageOf', {
                  currentPage: page,
                  totalPages,
                }),
                prevLabel: tc('paginationPrevButton'),
                totalPages,
              }}
              paginationMode="page"
              renderCells={(row) => (
                <>
                  <Table.Cell>
                    {row.title !== null && row.title !== '' ? row.title : row.provider_feed_id}
                  </Table.Cell>
                  <Table.Cell>{row.provider_feed_id}</Table.Cell>
                  <Table.Cell>{mediumText(row.medium_value)}</Table.Cell>
                  <Table.Cell>
                    {row.feed_url !== null && row.feed_url !== '' ? (
                      <EllipsisText maxWidth="18rem" title={row.feed_url}>
                        {row.feed_url}
                      </EllipsisText>
                    ) : (
                      t('emptyValue')
                    )}
                  </Table.Cell>
                  <Table.Cell>{row.item_stub_count}</Table.Cell>
                  <Table.Cell>{formatDateTimeAbbrev(row.resolved_at, locale)}</Table.Cell>
                  <Table.Cell>{pendingText(row.pending_action)}</Table.Cell>
                </>
              )}
              rows={rows}
              searchSyncParams={{ page: '1' }}
              sortBy={sortBy}
              sortOrder={sortOrder}
              sortableColumnIds={[...SORTABLE_COLUMN_IDS]}
              onSortChange={onSortChange}
            />
          ) : null}
        </>
      </ManagementProbeChromeGate>
    </ManagementPageShell>
  );
}
