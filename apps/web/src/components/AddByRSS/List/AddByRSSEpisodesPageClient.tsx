'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { AddByRSSParseStatus } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { AddByRSSEpisodesListNodes } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodesListNodes';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import type { MediaListChipsConfig } from '../../../components/MediaListChips/MediaListChips';
import { NoResults } from '../../../components/NoResults/NoResults';
import { Pagination } from '../../../components/Pagination/Pagination';
import { dismissToast, showToast, showToastLoading } from '../../../components/Toast/Toast';
import { useAccount } from '../../../contexts/Account';
import type { AddByRSSListSortOrder } from '../../../contexts/AddByRSSListContext';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { useModals } from '../../../contexts/Modals';
import { useCommittedPaginationTotalPages } from '../../../hooks/settledTotalPages';
import type { AddByRSSParseOutcome } from '../../../utils/addByRSS/actions';
import { applyAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import {
  ADD_BY_RSS_ITEMS_PAGE_SIZE,
  buildAddByRSSItemsIndex,
  getAddByRSSItemsIndexPageOrEmpty,
  getFastAddByRSSItemsPage,
} from '../../../utils/addByRSS/itemIndex';
import { runAddByRSSParseAll } from '../../../utils/addByRSS/parseAll';
import { getAllAddByRSSFeeds } from '../../../utils/addByRSS/storage';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSParsedFeed,
} from '../../../utils/addByRSS/types';
import { AddByRSSListHeader, AddByRSSListToolbar } from './AddByRSSListHeader';

import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodes.module.scss';

const toSortOption = (value: string | null): AddByRSSListSortOrder =>
  value === 'oldest' ? 'oldest' : 'recent';

type AddByRSSEpisodesPageClientProps = {
  chipsConfig: MediaListChipsConfig;
};

export const AddByRSSEpisodesPageClient: React.FC<AddByRSSEpisodesPageClientProps> = ({
  chipsConfig,
}) => {
  const tFeatures = useTranslations('features');
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
  const [sort, setSort] = useState<AddByRSSListSortOrder>(initialSort);

  const [items, setItems] = useState<AddByRSSItemIndexItem[]>([]);
  const [totalPagesState, setTotalPagesState] = useState(1);
  const { totalPages, setTotalPages } = useCommittedPaginationTotalPages(
    { sort },
    totalPagesState,
    setTotalPagesState
  );
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

  const handleSortChange = (value: AddByRSSListSortOrder) => {
    setSort(value);
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

  const handleParseStatus = useCallback(
    async (
      feedUrl: string,
      parsedFeed: AddByRSSParsedFeed | undefined,
      status: AddByRSSParseStatus,
      cache?: AddByRSSFeedRecord['cache'],
      outcome?: AddByRSSParseOutcome
    ) => {
      await applyAddByRSSParseStatus({
        feedUrl,
        parsedFeed,
        status,
        cache,
        outcome,
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
        accountId: loggedInAccount.id_text,
        feeds: allFeeds,
        onQueued: async (feedUrl) => handleParseStatus(feedUrl, undefined, 'queued'),
        onStatusUpdate: async (feedUrl, statusResponse) =>
          handleParseStatus(
            feedUrl,
            statusResponse.payload,
            statusResponse.status,
            statusResponse.cache,
            statusResponse
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
      <AddByRSSListHeader title={tFeatures('add_by_rss.label')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <AddByRSSListToolbar
              chipsConfig={chipsConfig}
              isUpdating={isUpdating}
              onCheckUpdates={handleCheckForUpdates}
              sort={{ onChange: handleSortChange, value: sort }}
              view={{ setViewSelected, viewSelected }}
            />
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
            ) : isLoading || !loggedInAccount ? null : (
              <NoResults message={tMedia('podcast.no_episodes_found')} />
            )}
            <WebLoadingSpinnerOverlay isLoading={isLoading} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
};
