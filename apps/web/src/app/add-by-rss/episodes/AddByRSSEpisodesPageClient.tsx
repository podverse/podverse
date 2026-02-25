'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import Dropdown from '../../../components/Dropdown/Dropdown';
import { AddByRSSListHeader } from '../../../components/AddByRSS/List/AddByRSSListHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import Pagination from '../../../components/Pagination/Pagination';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodes.module.scss';
import { applyAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
import { getAllAddByRSSFeeds } from '../../../utils/addByRSS/storage';
import {
  ADD_BY_RSS_ITEMS_PAGE_SIZE,
  buildAddByRSSItemsIndex,
  getAddByRSSItemsIndexPageOrEmpty,
  getFastAddByRSSItemsPage,
} from '../../../utils/addByRSS/itemIndex';
import { runAddByRSSParseAll } from '../../../utils/addByRSS/parseAll';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSParsedFeed,
} from '../../../utils/addByRSS/types';
import { AddByRSSEpisodesListNodes } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodesListNodes';
import { dismissToast, showToast, showToastLoading } from '../../../components/Toast/Toast';

type SortOption = 'recent' | 'oldest';

const toSortOption = (value: string | null): SortOption =>
  value === 'oldest' ? 'oldest' : 'recent';

export const AddByRSSEpisodesPageClient: React.FC = () => {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');
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

  const [items, setItems] = useState<AddByRSSItemIndexItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const startDelayedLoadingToast = () => {
    let toastId: string | Promise<string> | null = null;
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

  const sortMenuItems = useMemo(
    () => [
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.oldest'), param: 'sort', value: 'oldest' },
    ],
    [tFilters]
  );

  const handleSortChange = (value: string) => {
    const nextSort = toSortOption(value);
    setSort(nextSort);
    setPage(1);
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

      if (!loggedInAccount) {
        setItems([]);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      await syncAddByRSSCacheWithServer(loggedInAccount.id_text);
      if (cancelled) {
        return;
      }

      const indexResult = await getAddByRSSItemsIndexPageOrEmpty({
        sort,
        page,
        pageSize: ADD_BY_RSS_ITEMS_PAGE_SIZE,
        mediumFilter: 'podcast',
      });

      if (cancelled) {
        return;
      }

      if (indexResult.totalCount > 0) {
        const pageCount = Math.max(
          1,
          Math.ceil(indexResult.totalCount / ADD_BY_RSS_ITEMS_PAGE_SIZE)
        );
        setTotalPages(pageCount);
        setItems(indexResult.items);
        setIsLoading(false);
        if (page > pageCount) {
          setPage(pageCount);
        }
        return;
      }

      const feeds = await getAllAddByRSSFeeds();
      if (cancelled) {
        return;
      }

      if (page === 1) {
        const fastItems = getFastAddByRSSItemsPage({
          feeds,
          sort,
          pageSize: ADD_BY_RSS_ITEMS_PAGE_SIZE,
          mediumFilter: 'podcast',
        });
        setItems(fastItems);
      } else {
        setItems([]);
      }
      setTotalPages(1);
      setIsLoading(false);

      if (!isIndexBuilding) {
        setIsIndexBuilding(true);
        void buildAddByRSSItemsIndex(feeds).then(async () => {
          if (cancelled) {
            return;
          }
          const updated = await getAddByRSSItemsIndexPageOrEmpty({
            sort,
            page,
            pageSize: ADD_BY_RSS_ITEMS_PAGE_SIZE,
            mediumFilter: 'podcast',
          });
          if (cancelled) {
            return;
          }
          if (updated.totalCount > 0) {
            const pageCount = Math.max(
              1,
              Math.ceil(updated.totalCount / ADD_BY_RSS_ITEMS_PAGE_SIZE)
            );
            setTotalPages(pageCount);
            setItems(updated.items);
            if (page > pageCount) {
              setPage(pageCount);
            }
          }
          setIsIndexBuilding(false);
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, sort, isIndexBuilding, loggedInAccount]);

  const headerTitle = `${tFeatures('add_by_rss.label')} · ${tMedia('podcast.episodes')}`;

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

      // Rebuild index after updates
      const updatedFeeds = await getAllAddByRSSFeeds();
      await buildAddByRSSItemsIndex(updatedFeeds);
      const updated = await getAddByRSSItemsIndexPageOrEmpty({
        sort,
        page,
        pageSize: ADD_BY_RSS_ITEMS_PAGE_SIZE,
        mediumFilter: 'podcast',
      });
      if (updated.totalCount > 0) {
        const pageCount = Math.max(1, Math.ceil(updated.totalCount / ADD_BY_RSS_ITEMS_PAGE_SIZE));
        setTotalPages(pageCount);
        setItems(updated.items);
      }

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
  }, [handleParseStatus, loggedInAccount, page, setModalAuthLogin, sort, tFeatures, tMisc]);

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
                setPage={(nextPage) => {
                  setPage(nextPage);
                }}
                paginationControlsClassName={styles.paginationControls}
              >
                {items.length > 0 ? (
                  <AddByRSSEpisodesListNodes
                    items={items}
                    viewSelected={viewSelected}
                    sortOrder={sort}
                  />
                ) : null}
              </Pagination>
            ) : items.length > 0 ? (
              <AddByRSSEpisodesListNodes
                items={items}
                viewSelected={viewSelected}
                sortOrder={sort}
              />
            ) : isLoading ? null : (
              <NoResults message={tFeatures('add_by_rss.no_feeds_podcast')} />
            )}
            <LoadingSpinnerOverlay isLoading={isLoading} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
};
