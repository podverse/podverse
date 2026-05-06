'use client';

import Link from 'next/link';
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
  Input,
  LoadingText,
  ManagementPageShell,
  Pagination,
  PaginationSummaryLine,
  SectionBlock,
  SectionHeading,
  StatsBarChart,
  StatSummaryGrid,
  Table,
  TableEmptyCell,
  ToolbarCluster,
} from '@podverse/ui';

import { type CurrentUser, getCurrentUser } from '../../../lib/requests/auth';
import {
  type EntityType,
  reqStatsDetail,
  reqStatsSearch,
  reqStatsTop,
  type StatsRange,
  type StatsRow,
} from '../../../lib/requests/stats';

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

const ENTITY_TYPES: EntityType[] = ['channel', 'item', 'clip', 'playlist', 'account'];

const RANGES: StatsRange[] = ['day', '7day', '30day', '1year', 'all-time'];

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
  const ts = useTranslations('statsPage');
  const [user, setUser] = useState<CurrentUser>(initialUser);
  const [entityType, setEntityType] = useState<EntityType>('channel');
  const [range, setRange] = useState<StatsRange>('all-time');
  const [rows, setRows] = useState<StatsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const pageSize = 25;

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const result = isSearching
        ? await reqStatsSearch(entityType, searchQuery, range, page, pageSize)
        : await reqStatsTop(entityType, range, page, pageSize);
      setRows(result.rows);
      setTotal(result.total);
    } catch {
      setError(ts('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [entityType, isSearching, page, range, searchQuery, ts]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleEntityTypeChange = useCallback((newType: EntityType) => {
    setEntityType(newType);
    setPage(1);
    setDetail(null);
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  const handleRangeChange = useCallback((newRange: StatsRange) => {
    setRange(newRange);
    setPage(1);
  }, []);

  const handleSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setIsSearching(false);
      setPage(1);
      return;
    }
    setIsSearching(true);
    setPage(1);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
    setPage(1);
  }, []);

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

  const totalPages = Math.ceil(total / pageSize);

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

  if (!user) {
    return null;
  }

  return (
    <ManagementPageShell
      title={ts('title')}
      headerChildren={
        <Breadcrumbs
          LinkComponent={Link}
          marginBottom="lg"
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: '/dashboard', label: ts('breadcrumbDashboard') }, { label: ts('title') }]}
        />
      }
    >
      <SectionBlock>
        <ButtonTabs buttonTabs={entityButtonTabs} selectedKey={entityType} />
      </SectionBlock>

      <ToolbarCluster>
        <ButtonTabs buttonTabs={rangeButtonTabs} selectedKey={range} />
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <Input
            type="text"
            placeholder={ts('searchPlaceholder', { entity: selectedEntityLabel })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            style={{ width: '100%' }}
          />
        </div>
        <Button type="button" variant="mini" onClick={handleSearch}>
          {tc('search')}
        </Button>
        {isSearching && (
          <Button type="button" variant="mini" onClick={handleClearSearch}>
            {ts('clear')}
          </Button>
        )}
      </ToolbarCluster>

      <SectionBlock>
        <SectionHeading level={3}>
          {ts('topChartHeading', { entity: selectedEntityLabel, range: rangeLabelResolved })}
        </SectionHeading>
        <StatsBarChart
          data={chartData}
          loading={loading}
          emptyMessage={error ?? ts('noStatsDataForRange')}
          valueLabel={ts('views')}
        />
      </SectionBlock>

      {loading && <LoadingText>{tc('loading')}</LoadingText>}
      {error && !loading && <Alert>{error}</Alert>}
      {!loading && !error && (
        <>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>#</Table.HeaderCell>
                  <Table.HeaderCell>{ts('table.title')}</Table.HeaderCell>
                  <Table.HeaderCell>
                    {ts('table.rangeViews', { range: rangeLabelResolved })}
                  </Table.HeaderCell>
                  <Table.HeaderCell>{ts('ranges.allTime')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {rows.length === 0 && (
                  <Table.Row>
                    <TableEmptyCell colSpan={4}>{tc('noDataFound')}</TableEmptyCell>
                  </Table.Row>
                )}
                {rows.map((row, idx) => (
                  <Table.Row
                    key={row.id}
                    selected={detail?.id === row.id}
                    onClick={() => void handleRowClick(row)}
                  >
                    <Table.Cell>{(page - 1) * pageSize + idx + 1}</Table.Cell>
                    <Table.Cell>{row.title ?? ts('idValue', { id: row.id })}</Table.Cell>
                    <Table.Cell>{row.range_count.toLocaleString()}</Table.Cell>
                    <Table.Cell>{row.all_time_count.toLocaleString()}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>

          {totalPages > 1 && (
            <>
              <PaginationSummaryLine>
                {total === 1
                  ? ts('paginationSummarySingular', { total, page, totalPages })
                  : ts('paginationSummary', { total, page, totalPages })}
              </PaginationSummaryLine>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </>
      )}

      {detailLoading && <LoadingText>{ts('loadingDetail')}</LoadingText>}
      {detail && !detailLoading && (
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
            <StatsBarChart data={detail.dayBuckets} valueLabel={ts('views')} />

            <SectionHeading level={4} spacedTop>
              {ts('detail.weeklyBreakdown')}
            </SectionHeading>
            <StatsBarChart data={detail.weekBuckets} valueLabel={ts('views')} />
          </Card>
        </div>
      )}
    </ManagementPageShell>
  );
}

function truncateTitle(title: string, maxLen: number): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + '\u2026';
}
