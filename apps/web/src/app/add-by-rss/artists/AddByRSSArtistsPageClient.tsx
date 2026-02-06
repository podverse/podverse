'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PAGINATION } from '@podverse/helpers';

import { AddByRSSListHeader } from '../../../components/AddByRSS/List/AddByRSSListHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import Dropdown from '../../../components/Dropdown/Dropdown';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import Pagination from '../../../components/Pagination/Pagination';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { AddByRSSArtistNodes } from '../../../components/AddByRSS/Artist/AddByRSSArtistNodes';
import { applyAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import {
  getAddByRSSFeedsByResourceType,
  getAllAddByRSSFeeds,
} from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord, AddByRSSParsedFeed } from '../../../utils/addByRSS/types';
import { isMusicMediumId, parseMediumId } from '../../../utils/addByRSS/mediumHelpers';
import { runAddByRSSParseAll } from '../../../utils/addByRSS/parseAll';
import styles from '../../../styles/components/Common/List/Podcasts/ListPodcasts.module.scss';
import { dismissToast, showToast, showToastLoading } from '../../../components/Toast/Toast';

type SortOption = 'recent' | 'oldest';

const toSortOption = (value: string | null): SortOption =>
  value === 'oldest' ? 'oldest' : 'recent';

const getFeedLastPubDateMs = (feed: AddByRSSFeedRecord): number => {
  const raw = feed.mappedFeed?.channel?.about?.last_pub_date ?? null;
  if (!raw) {
    return 0;
  }
  if (raw instanceof Date) {
    return raw.getTime();
  }
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const AddByRSSArtistsPageClient: React.FC = () => {
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { viewSelected, setViewSelected } = useLocalSettings();
  const searchParams = useSearchParams();

  const initialPage = useMemo(() => {
    const value = parseInt(searchParams.get('page') ?? '1', 10);
    return Number.isNaN(value) || value < 1 ? 1 : value;
  }, [searchParams]);

  const initialSort = useMemo(() => toSortOption(searchParams.get('sort')), [searchParams]);

  const [page, setPage] = useState(initialPage);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [feeds, setFeeds] = useState<AddByRSSFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const startDelayedLoadingToast = () => {
    let toastId: string | null = null;
    const timer = setTimeout(() => {
      toastId = showToastLoading(tMisc('loading'));
    }, 250);

    return () => {
      clearTimeout(timer);
      if (toastId) {
        dismissToast(toastId);
      }
    };
  };

  useEffect(() => {
    if (searchParams.has('page') || searchParams.has('sort')) {
      setPage(initialPage);
      setSort(initialSort);
    }
  }, [initialPage, initialSort, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const records = await getAddByRSSFeedsByResourceType('artists');
      if (cancelled) {
        return;
      }
      const musicFeeds = records.filter((feed) => {
        const mediumId = parseMediumId(feed.mappedFeed?.channel?.channel?.medium_id);
        return isMusicMediumId(mediumId);
      });
      setFeeds(musicFeeds);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedFeeds = useMemo(() => {
    const next = [...feeds];
    next.sort((a, b) => {
      const aDate = getFeedLastPubDateMs(a);
      const bDate = getFeedLastPubDateMs(b);
      if (aDate === bDate) {
        return (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl);
      }
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
    return next;
  }, [feeds, sort]);

  const pageSize = PAGINATION.DEFAULT_LIMIT;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedFeeds.length / pageSize)),
    [pageSize, sortedFeeds.length]
  );
  const pagedFeeds = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedFeeds.slice(startIndex, startIndex + pageSize);
  }, [page, pageSize, sortedFeeds]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const sortMenuItems = useMemo(
    () => [
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.oldest'), param: 'sort', value: 'oldest' },
    ],
    [tFilters]
  );

  const handleSortChange = (value: string) => {
    setSort(toSortOption(value));
    setPage(1);
  };

  const headerTitle = `${tFeatures('add_by_rss.label')} · ${tMedia('music.artists')}`;

  const handleParseStatus = useCallback(
    async (
      feedUrl: string,
      parsedFeed: AddByRSSParsedFeed | undefined,
      status: AddByRSSFeedRecord['status'],
      cache?: AddByRSSFeedRecord['cache']
    ) => {
      await applyAddByRSSParseStatus({
        feedUrl,
        parsedFeed,
        status,
        cache,
      });
    },
    []
  );

  const handleCheckForUpdates = useCallback(async () => {
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
      return;
    }

    setIsUpdating(true);
    const stopLoadingToast = startDelayedLoadingToast();

    const runUpdates = async () => {
      const allFeeds = await getAllAddByRSSFeeds();
      const result = await runAddByRSSParseAll({
        feeds: allFeeds,
        onQueued: async (feedUrl) => handleParseStatus(feedUrl, undefined, 'queued'),
        onStatusUpdate: async (feedUrl, statusResponse) =>
          handleParseStatus(
            feedUrl,
            statusResponse.payload,
            statusResponse.status,
            statusResponse.cache
          ),
      });

      // Reload artist feeds after updates
      const records = await getAddByRSSFeedsByResourceType('artists');
      const musicFeeds = records.filter((feed) => {
        const mediumId = parseMediumId(feed.mappedFeed?.channel?.channel?.medium_id);
        return isMusicMediumId(mediumId);
      });
      setFeeds(musicFeeds);

      return result;
    };

    try {
      const result = await runUpdates();
      if (result.dedupedFeedUrls.length > 0 && result.dedupeTtlSeconds) {
        const minutes = Math.max(1, Math.ceil(result.dedupeTtlSeconds / 60));
        const waitKey =
          minutes === 1 ? 'add_by_rss.wait_to_retry_minute' : 'add_by_rss.wait_to_retry_minutes';
        showToast(tFeatures(waitKey, { minutes }), 'warning');
      } else {
        showToast(tMisc('done'), 'success');
      }
    } catch (error) {
      showToast(tFeatures('add_by_rss.status_failed'), 'error');
      console.error(error);
    } finally {
      stopLoadingToast();
      setIsUpdating(false);
    }
  }, [handleParseStatus, loggedInAccount, setModalAuthLogin, tFeatures, tMisc]);

  return (
    <>
      <AddByRSSListHeader
        title={headerTitle}
        isUpdating={isUpdating}
        onCheckUpdates={handleCheckForUpdates}
        checkUpdatesLabel={tFeatures('add_by_rss.check_updates')}
        viewSelected={viewSelected}
        setViewSelected={setViewSelected}
        extraButtons={
          <Dropdown key="sort" value={sort} menuItems={sortMenuItems} onChange={handleSortChange} />
        }
      />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            {totalPages > 1 ? (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                setPage={setPage}
                paginationControlsClassName={styles.paginationControls}
              >
                {pagedFeeds.length > 0 ? (
                  <AddByRSSArtistNodes feeds={pagedFeeds} viewSelected={viewSelected} />
                ) : null}
              </Pagination>
            ) : pagedFeeds.length > 0 ? (
              <AddByRSSArtistNodes feeds={pagedFeeds} viewSelected={viewSelected} />
            ) : isLoading ? null : (
              <NoResults message={tFeatures('add_by_rss.no_feeds_music')} />
            )}
            <LoadingSpinnerOverlay isLoading={isLoading} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
};
