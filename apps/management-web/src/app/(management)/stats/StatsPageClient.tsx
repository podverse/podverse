'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { StatsBarChartDatum } from '@podverse/ui';
import {
  Alert,
  Breadcrumbs,
  Button,
  ButtonTabs,
  Card,
  FlexBetween,
  ManagementPageShell,
  SectionBlock,
  SectionHeading,
  type SortDirection,
  StatsBarChart,
  StatSummaryGrid,
  Table,
  TableWithFilter,
  useTableFilterState,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlayStatus } from '../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { ManagementProbeChromeGate } from '../../../components/ManagementProbeChromeGate/ManagementProbeChromeGate';
import { useManagementTableChrome } from '../../../components/Table/managementTableChrome';
import { managementSearchParamsObject } from '../../../lib/managementTableUrl';
import { type CurrentUser, getCurrentUser } from '../../../lib/requests/auth';
import {
  type EntityType,
  reqStatsDetail,
  reqStatsSearch,
  reqStatsTop,
  type StatsRange,
  type StatsRow,
} from '../../../lib/requests/stats';
import { resolveManagementTableEmptyState } from '../../../lib/tableEmptyState';

function entityTypeLabel(t: (key: string) => string, et: EntityType): string {
  if (et === 'channel') {
    return t('entityTypes.channel');
  }
  if (et === 'item') {
    return t('entityTypes.item');
  }
  if (et === 'clip') {
    return t('entityTypes.clip');
  }
  if (et === 'playlist') {
    return t('entityTypes.playlist');
  }
  return t('entityTypes.account');
}

function rangeLabel(t: (key: string) => string, r: StatsRange): string {
  if (r === 'day') {
    return t('ranges.day');
  }
  if (r === '7day') {
    return t('ranges.day7');
  }
  if (r === '30day') {
    return t('ranges.day30');
  }
  if (r === '1year') {
    return t('ranges.year1');
  }
  return t('ranges.allTime');
}

function parseEntityParam(value: string | null): EntityType {
  if (
    value === 'channel' ||
    value === 'item' ||
    value === 'clip' ||
    value === 'playlist' ||
    value === 'account'
  ) {
    return value;
  }
  return 'channel';
}

function parseRangeParam(value: string | null): StatsRange {
  if (
    value === 'day' ||
    value === '7day' ||
    value === '30day' ||
    value === '1year' ||
    value === 'all-time'
  ) {
    return value;
  }
  return 'all-time';
}

const ENTITY_TYPES: EntityType[] = ['channel', 'item', 'clip', 'playlist', 'account'];

const RANGES: StatsRange[] = ['day', '7day', '30day', '1year', 'all-time'];

const STATS_COLUMN_IDS = ['title', 'range_count', 'all_time_count'] as const;

function sortStatsRows(rows: StatsRow[], sortKey: string, order: SortDirection): StatsRow[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === 'range_count') {
      const va = a.range_count;
      const vb = b.range_count;
      return va > vb ? dir : va < vb ? -dir : 0;
    }
    if (sortKey === 'all_time_count') {
      const va = a.all_time_count;
      const vb = b.all_time_count;
      return va > vb ? dir : va < vb ? -dir : 0;
    }
    const av = a.title ?? '';
    const bv = b.title ?? '';
    return av.localeCompare(bv) * dir;
  });
}

type DetailData = {
  id: number;
  title: string | null;
  dayBuckets: StatsBarChartDatum[];
  weekBuckets: StatsBarChartDatum[];
  overview: { label: string; value: number }[];
};

export type StatsPageClientProps = {
  initialUser: CurrentUser;
};

export function StatsPageClient({ initialUser }: StatsPageClientProps) {
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const ts = useTranslations('statsPage');
  const tsTable = useTranslations('tableShared');
  const chrome = useManagementTableChrome();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = pathname !== null && pathname !== '' ? pathname : '/stats';

  const entityType = parseEntityParam(searchParams.get('entity'));
  const range = parseRangeParam(searchParams.get('range'));
  const pageNum = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
  const urlSearch = searchParams.get('search') ?? '';

  const [user, setUser] = useState<CurrentUser>(initialUser);
  const [rows, setRows] = useState<StatsRow[]>([]);
  const [total, setTotal] = useState(0);
  /** Start true so first paint does not treat total 0 / empty rows as definitive system-empty before reqStatsTop runs. */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [probeStatsUnscopedExist, setProbeStatsUnscopedExist] = useState<boolean | undefined>(
    undefined
  );

  const [sortBy, setSortBy] = useState<string>('range_count');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');

  const pageSize = 25;

  const currentQueryParams = useMemo(
    () => managementSearchParamsObject(searchParams),
    [searchParams]
  );

  const filter = useTableFilterState({
    allColumnIds: [...STATS_COLUMN_IDS],
    basePath,
    currentQueryParams,
    initialColumns: [...STATS_COLUMN_IDS],
    initialSearch: urlSearch,
    searchSyncParams: { page: '1' },
  });

  const replaceUrlParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '') {
          p.delete(k);
        } else {
          p.set(k, v);
        }
      }
      const qs = p.toString();
      router.push(qs !== '' ? `${basePath}?${qs}` : basePath);
    },
    [basePath, router, searchParams]
  );

  useEffect(() => {
    const needsEntity = searchParams.get('entity') === null;
    const needsRange = searchParams.get('range') === null;
    if (needsEntity || needsRange) {
      const p = new URLSearchParams(searchParams.toString());
      if (needsEntity) {
        p.set('entity', 'channel');
      }
      if (needsRange) {
        p.set('range', 'all-time');
      }
      router.replace(`${basePath}?${p.toString()}`);
    }
  }, [basePath, router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!cancelled && currentUser) {
          setUser(currentUser);
        }
      } catch {
        // Session fallback will redirect via layout
      }
    };
    void verify();
    return () => {
      cancelled = true;
    };
  }, []);

  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    const entity = parseEntityParam(searchParams.get('entity'));
    const rangeResolved = parseRangeParam(searchParams.get('range'));
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
    const search = searchParams.get('search') ?? '';
    const searching = search.trim() !== '';

    const run = async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const result = searching
          ? await reqStatsSearch(entity, search.trim(), rangeResolved, page, pageSize)
          : await reqStatsTop(entity, rangeResolved, page, pageSize);
        if (!cancelled) {
          setRows(result.rows);
          setTotal(result.total);
        }
      } catch {
        if (!cancelled) {
          setError(ts('failedToLoad'));
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
  }, [pageSize, searchParams, searchParamsKey, ts]);

  useEffect(() => {
    if (loading || error !== null) {
      return;
    }
    const search = urlSearch.trim();
    if (search === '') {
      setProbeStatsUnscopedExist(undefined);
      return;
    }
    if (rows.length > 0) {
      setProbeStatsUnscopedExist(true);
      return;
    }
    let cancelled = false;
    void reqStatsTop(entityType, range, 1, 1).then((r) => {
      if (!cancelled) {
        setProbeStatsUnscopedExist(r.total > 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loading, error, entityType, range, urlSearch, rows.length]);

  const handleEntityTypeChange = useCallback(
    (newType: EntityType) => {
      replaceUrlParams({ entity: newType, page: '1' });
    },
    [replaceUrlParams]
  );

  const handleRangeChange = useCallback(
    (newRange: StatsRange) => {
      replaceUrlParams({ range: newRange, page: '1' });
    },
    [replaceUrlParams]
  );

  const handleRowClick = async (row: StatsRow) => {
    setDetailLoading(true);
    try {
      const data = await reqStatsDetail(entityType, row.id);
      const dayBuckets: StatsBarChartDatum[] = [
        { label: ts('detail.dayToday'), value: data.day_current_count },
        { label: ts('detail.dayN', { count: 1 }), value: data.day_1_count },
        { label: ts('detail.dayN', { count: 2 }), value: data.day_2_count },
        { label: ts('detail.dayN', { count: 3 }), value: data.day_3_count },
        { label: ts('detail.dayN', { count: 4 }), value: data.day_4_count },
        { label: ts('detail.dayN', { count: 5 }), value: data.day_5_count },
        { label: ts('detail.dayN', { count: 6 }), value: data.day_6_count },
        { label: ts('detail.dayN', { count: 7 }), value: data.day_7_count },
        { label: ts('detail.dayN', { count: 8 }), value: data.day_8_count },
      ];
      const weekBuckets: StatsBarChartDatum[] = [
        { label: ts('detail.weekCurrent'), value: data.week_current_count },
        { label: ts('detail.weekN', { count: 1 }), value: data.week_1_count },
        { label: ts('detail.weekN', { count: 2 }), value: data.week_2_count },
        { label: ts('detail.weekN', { count: 3 }), value: data.week_3_count },
        { label: ts('detail.weekN', { count: 4 }), value: data.week_4_count },
      ];
      const overview = [
        { label: ts('detail.dayToday'), value: data.day_current_count },
        { label: ts('detail.weekCurrent'), value: data.week_current_count },
        { label: ts('detail.monthCurrent'), value: data.month_current_count },
        { label: ts('ranges.allTime'), value: data.all_time_count },
      ];
      setDetail({ id: data.id, title: data.title, dayBuckets, weekBuckets, overview });
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const entityButtonTabs = useMemo(
    () =>
      ENTITY_TYPES.map((et) => ({
        key: et,
        label:
          et === 'channel'
            ? ts('entityTypes.channel')
            : et === 'item'
              ? ts('entityTypes.item')
              : et === 'clip'
                ? ts('entityTypes.clip')
                : et === 'playlist'
                  ? ts('entityTypes.playlist')
                  : ts('entityTypes.account'),
        onClick: () => {
          handleEntityTypeChange(et);
        },
      })),
    [handleEntityTypeChange, ts]
  );

  const rangeButtonTabs = useMemo(
    () =>
      RANGES.map((r) => ({
        key: r,
        label:
          r === 'day'
            ? ts('ranges.day')
            : r === '7day'
              ? ts('ranges.day7')
              : r === '30day'
                ? ts('ranges.day30')
                : r === '1year'
                  ? ts('ranges.year1')
                  : ts('ranges.allTime'),
        onClick: () => {
          handleRangeChange(r);
        },
      })),
    [handleRangeChange, ts]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const chartData: StatsBarChartDatum[] = rows.slice(0, 10).map((row) => ({
    label: truncateTitle(row.title ?? ts('idValue', { id: row.id }), 20),
    value: row.range_count,
  }));

  const selectedEntityLabel = entityTypeLabel(ts, entityType);
  const rangeLabelResolved = rangeLabel(ts, range);

  const detailSummaryItems = useMemo(() => {
    if (!detail) {
      return [];
    }
    return detail.overview.map((stat) => ({
      label: stat.label,
      value: stat.value.toLocaleString(),
    }));
  }, [detail]);

  const sortedRows = useMemo(
    () => sortStatsRows(rows, sortBy, sortOrder),
    [rows, sortBy, sortOrder]
  );

  const hasStatsDataInSystem =
    loading || error !== null
      ? undefined
      : urlSearch.trim() === ''
        ? total > 0
        : probeStatsUnscopedExist === undefined
          ? undefined
          : probeStatsUnscopedExist;

  const probingStatsExistence =
    !loading &&
    error === null &&
    urlSearch.trim() !== '' &&
    rows.length === 0 &&
    probeStatsUnscopedExist === undefined;

  const statsSystemEmpty =
    !loading && error === null && sortedRows.length === 0 && hasStatsDataInSystem === false;

  const statsTableEmptyState = resolveManagementTableEmptyState({
    filteredEmptyMessage: tsTable('noResults'),
    hasDataInSystem: hasStatsDataInSystem,
    hasVisibleRows: sortedRows.length > 0,
    systemEmptyMessage: chrome.systemEmptyMessage,
  });

  const columns = useMemo(
    () => [
      {
        header: '#',
        id: 'rank',
        label: '#',
        sortable: false,
      },
      {
        header: ts('table.title'),
        id: 'title',
        label: ts('table.title'),
        sortAriaLabel: chrome.sortAriaForColumn(String(ts('table.title'))),
        sortKey: 'title',
      },
      {
        header: ts('table.rangeViews', { range: rangeLabelResolved }),
        id: 'range_count',
        label: ts('table.rangeViews', { range: rangeLabelResolved }),
        sortAriaLabel: chrome.sortAriaForColumn(
          String(ts('table.rangeViews', { range: rangeLabelResolved }))
        ),
        sortKey: 'range_count',
      },
      {
        header: ts('ranges.allTime'),
        id: 'all_time_count',
        label: ts('ranges.allTime'),
        sortAriaLabel: chrome.sortAriaForColumn(String(ts('ranges.allTime'))),
        sortKey: 'all_time_count',
      },
    ],
    [chrome, rangeLabelResolved, ts]
  );

  if (!user) {
    return null;
  }

  return (
    <ManagementPageShell
      title={ts('title')}
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: '/dashboard', label: tNav('dashboard') }, { label: ts('title') }]}
        />
      }
    >
      {statsSystemEmpty ? (
        <p role="status">{chrome.systemEmptyMessage}</p>
      ) : (
        <ManagementProbeChromeGate
          bypassWhileError={error !== null}
          loading={loading}
          probingExistence={probingStatsExistence}
        >
          <>
            <SectionBlock>
              <ButtonTabs buttonTabs={entityButtonTabs} selectedKey={entityType} />
            </SectionBlock>

            <SectionBlock>
              <ButtonTabs buttonTabs={rangeButtonTabs} selectedKey={range} />
            </SectionBlock>

            <SectionBlock>
              <SectionHeading level={3}>
                {ts('topChartHeading', { entity: selectedEntityLabel, range: rangeLabelResolved })}
              </SectionHeading>
              <StatsBarChart
                data={chartData}
                emptyMessage={error ?? ts('noStatsDataForRange')}
                loading={loading}
                loadingLabel={ts('loadingChart')}
                valueLabel={ts('views')}
              />
            </SectionBlock>

            <ManagementLoadingSpinnerOverlayStatus
              isLoading={detailLoading}
              message={ts('loadingDetail')}
            />
            {error !== null && <Alert>{error}</Alert>}
            {error === null && (
              <TableWithFilter<StatsRow>
                columns={columns}
                emptyState={statsTableEmptyState}
                filter={filter}
                filterableColumnIds={[...STATS_COLUMN_IDS]}
                getRowKey={(row) => String(row.id)}
                labels={chrome.filterLabels}
                pagination={{
                  currentPage: pageNum,
                  nextLabel: tc('paginationNextButton'),
                  onPageChange: (newPage) => {
                    replaceUrlParams({ page: String(newPage) });
                  },
                  pageIndicatorLabel: tc('paginationPageOf', {
                    currentPage: pageNum,
                    totalPages,
                  }),
                  prevLabel: tc('paginationPrevButton'),
                  totalPages,
                }}
                paginationMode="page"
                renderCells={(row, index) => (
                  <>
                    <Table.Cell>{(pageNum - 1) * pageSize + index + 1}</Table.Cell>
                    <Table.Cell>{row.title ?? ts('idValue', { id: row.id })}</Table.Cell>
                    <Table.Cell>{row.range_count.toLocaleString()}</Table.Cell>
                    <Table.Cell>{row.all_time_count.toLocaleString()}</Table.Cell>
                  </>
                )}
                rows={sortedRows}
                selectedRowKey={detail !== null ? String(detail.id) : undefined}
                sortBy={sortBy}
                sortOrder={sortOrder}
                sortableColumnIds={[...STATS_COLUMN_IDS]}
                onRowClick={(row) => {
                  void handleRowClick(row);
                }}
                onSortChange={(key, order) => {
                  setSortBy(key);
                  setSortOrder(order);
                }}
              />
            )}
            {detail !== null && !detailLoading ? (
              <div style={{ marginTop: 'var(--spacing-2xl)' }}>
                <Card variant="bordered">
                  <FlexBetween>
                    <SectionHeading level={3}>
                      {detail.title ?? ts('idValue', { id: detail.id })}
                    </SectionHeading>
                    <Button type="button" variant="mini" onClick={() => setDetail(null)}>
                      {ts('close')}
                    </Button>
                  </FlexBetween>

                  <StatSummaryGrid items={detailSummaryItems} />

                  <SectionHeading level={4}>{ts('detail.dailyBreakdown')}</SectionHeading>
                  <StatsBarChart
                    data={detail.dayBuckets}
                    emptyMessage={ts('noStatsDataForRange')}
                    loadingLabel={ts('loadingChart')}
                    valueLabel={ts('views')}
                  />

                  <SectionHeading level={4} spacedTop>
                    {ts('detail.weeklyBreakdown')}
                  </SectionHeading>
                  <StatsBarChart
                    data={detail.weekBuckets}
                    emptyMessage={ts('noStatsDataForRange')}
                    loadingLabel={ts('loadingChart')}
                    valueLabel={ts('views')}
                  />
                </Card>
              </div>
            ) : null}
          </>
        </ManagementProbeChromeGate>
      )}
    </ManagementPageShell>
  );
}

function truncateTitle(title: string, maxLen: number): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + '\u2026';
}
