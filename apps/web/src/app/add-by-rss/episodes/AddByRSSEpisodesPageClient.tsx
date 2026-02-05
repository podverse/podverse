'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import Dropdown from '../../../components/Dropdown/Dropdown';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { CommonListPageHeader } from '../../../components/Common/List/CommonListPageHeader';
import Pagination from '../../../components/Pagination/Pagination';
import { ViewSelector } from '../../../components/ViewSelector/ViewSelector';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodes.module.scss';
import { getAllAddByRSSFeeds } from '../../../utils/addByRSS/storage';
import {
  ADD_BY_RSS_EPISODES_PAGE_SIZE,
  buildAddByRSSEpisodesIndex,
  getAddByRSSEpisodesIndexPageOrEmpty,
  getFastAddByRSSEpisodesPage,
} from '../../../utils/addByRSS/episodeIndex';
import type { AddByRSSEpisodeIndexItem } from '../../../utils/addByRSS/types';
import { AddByRSSEpisodesListNodes } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodesListNodes';

type SortOption = 'recent' | 'oldest';

const toSortOption = (value: string | null): SortOption =>
  value === 'oldest' ? 'oldest' : 'recent';

export const AddByRSSEpisodesPageClient: React.FC = () => {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');
  const { viewSelected, setViewSelected } = useLocalSettings();
  const searchParams = useSearchParams();

  const initialPage = useMemo(() => {
    const value = parseInt(searchParams.get('page') ?? '1', 10);
    return Number.isNaN(value) || value < 1 ? 1 : value;
  }, [searchParams]);

  const initialSort = useMemo(() => toSortOption(searchParams.get('sort')), [searchParams]);

  const [page, setPage] = useState(initialPage);
  const [sort, setSort] = useState<SortOption>(initialSort);

  const [items, setItems] = useState<AddByRSSEpisodeIndexItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);

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

      const indexResult = await getAddByRSSEpisodesIndexPageOrEmpty({
        sort,
        page,
        pageSize: ADD_BY_RSS_EPISODES_PAGE_SIZE,
      });

      if (cancelled) {
        return;
      }

      if (indexResult.totalCount > 0) {
        const pageCount = Math.max(
          1,
          Math.ceil(indexResult.totalCount / ADD_BY_RSS_EPISODES_PAGE_SIZE)
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
        const fastItems = getFastAddByRSSEpisodesPage({
          feeds,
          sort,
          pageSize: ADD_BY_RSS_EPISODES_PAGE_SIZE,
        });
        setItems(fastItems);
      } else {
        setItems([]);
      }
      setTotalPages(1);
      setIsLoading(false);

      if (!isIndexBuilding) {
        setIsIndexBuilding(true);
        void buildAddByRSSEpisodesIndex(feeds).then(async () => {
          if (cancelled) {
            return;
          }
          const updated = await getAddByRSSEpisodesIndexPageOrEmpty({
            sort,
            page,
            pageSize: ADD_BY_RSS_EPISODES_PAGE_SIZE,
          });
          if (cancelled) {
            return;
          }
          if (updated.totalCount > 0) {
            const pageCount = Math.max(
              1,
              Math.ceil(updated.totalCount / ADD_BY_RSS_EPISODES_PAGE_SIZE)
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
  }, [page, sort, isIndexBuilding]);

  const headerTitle = `${tFeatures('add_by_rss.label')} · ${tMedia('podcast.episodes')}`;

  return (
    <>
      <CommonListPageHeader
        title={headerTitle}
        buttonsNode={
          <>
            <Dropdown
              key="sort"
              value={sort}
              menuItems={sortMenuItems}
              onChange={handleSortChange}
            />
            <ViewSelector viewSelected={viewSelected} setViewSelected={setViewSelected} />
          </>
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
                  <AddByRSSEpisodesListNodes items={items} viewSelected={viewSelected} />
                ) : null}
              </Pagination>
            ) : items.length > 0 ? (
              <AddByRSSEpisodesListNodes items={items} viewSelected={viewSelected} />
            ) : isLoading ? null : (
              <NoResults message={tFeatures('add_by_rss.no_feeds')} />
            )}
            <LoadingSpinnerOverlay isLoading={isLoading} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
};
