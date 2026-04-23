'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import type { StatsBarChartDatum } from '@podverse/ui';
import { StatsBarChart } from '@podverse/ui';

import { type CurrentUser, getCurrentUser } from '../../../lib/requests/auth';
import {
  type EntityType,
  reqStatsDetail,
  reqStatsSearch,
  reqStatsTop,
  type StatsRange,
  type StatsRow,
} from '../../../lib/requests/stats';

import styles from './page.module.scss';

const ENTITY_TYPES: { key: EntityType; label: string }[] = [
  { key: 'channel', label: 'Channels' },
  { key: 'item', label: 'Items' },
  { key: 'clip', label: 'Clips' },
  { key: 'playlist', label: 'Playlists' },
  { key: 'account', label: 'Accounts' },
];

const RANGES: { key: StatsRange; label: string }[] = [
  { key: 'day', label: '1 day' },
  { key: '7day', label: '7 day' },
  { key: '30day', label: '30 day' },
  { key: '1year', label: '1 year' },
  { key: 'all-time', label: 'All-time' },
];

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
      setError('Failed to load stats.');
    } finally {
      setLoading(false);
    }
  }, [entityType, range, page, isSearching, searchQuery]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleEntityTypeChange = (newType: EntityType) => {
    setEntityType(newType);
    setPage(1);
    setDetail(null);
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleRangeChange = (newRange: StatsRange) => {
    setRange(newRange);
    setPage(1);
  };

  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setIsSearching(false);
      setPage(1);
      return;
    }
    setIsSearching(true);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setPage(1);
  };

  const handleRowClick = async (row: StatsRow) => {
    setDetailLoading(true);
    try {
      const data = await reqStatsDetail(entityType, row.id);
      const dayBuckets: StatsBarChartDatum[] = [
        { label: 'Today', value: data.day_current_count },
        { label: 'Day 1', value: data.day_1_count },
        { label: 'Day 2', value: data.day_2_count },
        { label: 'Day 3', value: data.day_3_count },
        { label: 'Day 4', value: data.day_4_count },
        { label: 'Day 5', value: data.day_5_count },
        { label: 'Day 6', value: data.day_6_count },
        { label: 'Day 7', value: data.day_7_count },
        { label: 'Day 8', value: data.day_8_count },
      ];
      const weekBuckets: StatsBarChartDatum[] = [
        { label: 'This week', value: data.week_current_count },
        { label: 'Week 1', value: data.week_1_count },
        { label: 'Week 2', value: data.week_2_count },
        { label: 'Week 3', value: data.week_3_count },
        { label: 'Week 4', value: data.week_4_count },
      ];
      const overview = [
        { label: 'Today', value: data.day_current_count },
        { label: 'This week', value: data.week_current_count },
        { label: 'This month', value: data.month_current_count },
        { label: 'All-time', value: data.all_time_count },
      ];
      setDetail({ id: data.id, title: data.title, dayBuckets, weekBuckets, overview });
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const chartData: StatsBarChartDatum[] = rows.slice(0, 10).map((row) => ({
    label: truncateTitle(row.title ?? `ID ${row.id}`, 20),
    value: row.range_count,
  }));

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? range;

  if (!user) {
    return null;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Stats</h1>
        <div className={styles.breadcrumbs}>
          <Link href="/dashboard" className={styles.breadcrumbLink}>
            Dashboard
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>Stats</span>
        </div>
      </div>

      <main>
        {/* Entity type tabs */}
        <div className={styles.tabs}>
          {ENTITY_TYPES.map((et) => (
            <button
              key={et.key}
              className={`${styles.tab} ${entityType === et.key ? styles.tabActive : ''}`}
              onClick={() => handleEntityTypeChange(et.key)}
            >
              {et.label}
            </button>
          ))}
        </div>

        {/* Range toggle + search */}
        <div className={styles.toolbar}>
          <div className={styles.rangeToggle}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                className={`${styles.rangeButton} ${range === r.key ? styles.rangeButtonActive : ''}`}
                onClick={() => handleRangeChange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <input
            className={styles.searchInput}
            type="text"
            placeholder={`Search ${ENTITY_TYPES.find((et) => et.key === entityType)?.label ?? ''} by title...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <button className={styles.rangeButton} onClick={handleSearch}>
            Search
          </button>
          {isSearching && (
            <button className={styles.rangeButton} onClick={handleClearSearch}>
              Clear
            </button>
          )}
        </div>

        {/* Chart */}
        <div className={styles.chartSection}>
          <h3 style={{ marginBottom: '0.5rem' }}>
            Top 10 {ENTITY_TYPES.find((et) => et.key === entityType)?.label ?? ''} ({rangeLabel})
          </h3>
          <StatsBarChart
            data={chartData}
            loading={loading}
            emptyMessage={error ?? 'No stats data available for this range.'}
            valueLabel="Views"
          />
        </div>

        {/* Table */}
        {loading && <div className={styles.loadingText}>Loading...</div>}
        {error && !loading && <div className={styles.errorText}>{error}</div>}
        {!loading && !error && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.statsTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>{rangeLabel} views</th>
                    <th>All-time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                        No data found.
                      </td>
                    </tr>
                  )}
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`${styles.rowClickable} ${detail?.id === row.id ? styles.rowSelected : ''}`}
                      onClick={() => void handleRowClick(row)}
                    >
                      <td>{(page - 1) * pageSize + idx + 1}</td>
                      <td>{row.title ?? `ID ${row.id}`}</td>
                      <td>{row.range_count.toLocaleString()}</td>
                      <td>{row.all_time_count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span>
                  {total} result{total !== 1 ? 's' : ''} - Page {page} of {totalPages}
                </span>
                <div className={styles.paginationButtons}>
                  <button
                    className={styles.paginationButton}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className={styles.paginationButton}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detail panel */}
        {detailLoading && <div className={styles.loadingText}>Loading detail...</div>}
        {detail && !detailLoading && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h3 className={styles.detailTitle}>{detail.title ?? `ID ${detail.id}`}</h3>
              <button className={styles.detailClose} onClick={() => setDetail(null)}>
                Close
              </button>
            </div>

            <div className={styles.detailStats}>
              {detail.overview.map((stat) => (
                <div key={stat.label} className={styles.detailStat}>
                  <span className={styles.detailStatLabel}>{stat.label}</span>
                  <span className={styles.detailStatValue}>{stat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <h4 style={{ marginBottom: '0.5rem' }}>Daily breakdown</h4>
            <StatsBarChart data={detail.dayBuckets} valueLabel="Views" />

            <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Weekly breakdown</h4>
            <StatsBarChart data={detail.weekBuckets} valueLabel="Views" />
          </div>
        )}
      </main>
    </div>
  );
}

function truncateTitle(title: string, maxLen: number): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + '\u2026';
}
