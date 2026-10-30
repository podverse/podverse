import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import type { AddByRSSResourceType, DTOCategory } from '@podverse/helpers';
import { PAGINATION } from '@podverse/helpers';
import { InfoWrapper } from '@podverse/ui';

import { CategoriesList } from '../../../components/Category/CategoriesList';
import type { PodcastListItem } from '../../../components/Common/Podcast/types';
import { CorePodcasts } from '../../../components/Core/Podcast/CorePodcasts';
import { HowToStartInfo } from '../../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { ROUTES } from '../../../constants/routes';
import { useChannelUnseenBadges } from '../../../hooks/useChannelUnseenBadges';
import { useFullSubscribedChannels } from '../../../hooks/useFullSubscribedChannels';
import { useListViewMode } from '../../../hooks/useListViewMode';
import { useReadyAddByRSSFeeds } from '../../../hooks/useReadyAddByRSSFeeds';
import { onClickAllCategories, onClickCategory } from '../../../utils/categories';
import { shouldShowBrowseEmptyMessage } from '../../../utils/mediaListChips';
import {
  podcastListItemFromAddByRSSFeed,
  podcastListItemFromChannel,
} from '../../../utils/subscribed/channelListItems';
import {
  mergeSubscribedChannelEntries,
  toEpochMsOrNull,
} from '../../../utils/subscribed/mergeSubscribedChannels';
import { selectFilteredSubscribedPage } from './podcastsFilter';
import { PodcastsFilterInput } from './PodcastsFilterInput';
import { usePodcastsPageContext } from './PodcastsPageContext';
import { podcastsListViewModeScope } from './PodcastsPageDropdownConfig';

import styles from '../../../styles/components/Common/List/Podcasts/ListPodcastsFilter.module.scss';

const NO_TYPES: readonly AddByRSSResourceType[] = [];
const ADD_BY_RSS_PODCAST_TYPES = ['podcasts'] as const;
const NO_MERGED_PODCASTS: PodcastListItem[] = [];

export const PodcastsPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    filterTerm,
    setFilterTerm,
    channels,
    scope,
    totalPages,
    isLoading,
    showSubscribeMessage,
    isCategoryListOpen,
    setIsCategoryListOpen,
  } = usePodcastsPageContext();
  const { viewSelected } = useListViewMode(podcastsListViewModeScope(scope));
  const { medium, page, range, sort, type, category } = filterParams;
  const router = useRouter();
  const tSubscriptions = useTranslations('subscriptions');
  const tMedia = useTranslations('media');
  // Only the subscribed list: unseen is measured against what the account follows, so it says
  // nothing about a category or top-charts list the user is browsing.
  const unseenBadges = useChannelUnseenBadges(type === 'subscribed');

  const isSubscribedScope = scope === 'subscribed';
  const trimmedTerm = filterTerm.trim();
  const isFiltering = isSubscribedScope && trimmedTerm !== '';
  const addByRSS = useReadyAddByRSSFeeds(isSubscribedScope ? ADD_BY_RSS_PODCAST_TYPES : NO_TYPES);
  const isMerged = isSubscribedScope && addByRSS.feeds.length > 0;
  const isLocalPaging = isMerged || isFiltering;
  const fullList = useFullSubscribedChannels(isLocalPaging, { medium, range, sort });

  // Local pages are counted separately from server pages. Changing sort, range, or the filter
  // term starts again at page 1, and clearing a term returns to the server page the user left.
  const [localPage, setLocalPage] = useState<number>(1);
  useEffect(() => {
    setLocalPage(1);
  }, [range, sort, trimmedTerm]);

  const merged = useMemo(() => {
    if (!isMerged || !fullList.isReady) {
      return NO_MERGED_PODCASTS;
    }

    return mergeSubscribedChannelEntries({
      server: fullList.channels.map((channel) => {
        const item = podcastListItemFromChannel(channel, unseenBadges.get(channel.id_text) ?? null);
        return {
          item,
          title: item.title,
          lastPubDateMs: toEpochMsOrNull(channel.channel_about?.last_pub_date),
        };
      }),
      addByRSS: addByRSS.feeds.map((feed) => {
        const item = podcastListItemFromAddByRSSFeed(feed);
        return {
          item,
          title: item.title,
          lastPubDateMs: toEpochMsOrNull(feed.mappedFeed?.channel?.about?.last_pub_date),
        };
      }),
      sort,
    });
  }, [addByRSS.feeds, fullList.channels, fullList.isReady, isMerged, sort, unseenBadges]);

  // Memoized because the list below treats a new `channels` array as a new list and scrolls to the
  // top when it sees one. Rebuilding the slice on every render would scroll the page out from under
  // anyone typing.
  const filtered = useMemo(
    () =>
      selectFilteredSubscribedPage({
        channels: fullList.channels,
        page: localPage,
        pageSize: PAGINATION.DEFAULT_LIMIT,
        term: trimmedTerm,
      }),
    [fullList.channels, localPage, trimmedTerm]
  );

  const mergedSlice = useMemo(
    () =>
      selectFilteredSubscribedPage({
        channels: merged,
        page: localPage,
        pageSize: PAGINATION.DEFAULT_LIMIT,
        term: trimmedTerm,
      }),
    [localPage, merged, trimmedTerm]
  );

  const showMergedList = isMerged && fullList.isReady;
  const showFilteredOnly = isFiltering && !isMerged;
  const matchCount = showMergedList ? mergedSlice.matchCount : filtered.matchCount;
  const showNoFilterMatches = isFiltering && fullList.isReady && matchCount === 0;

  const handleOnClickCategory = (selectedCategory: DTOCategory) => {
    onClickCategory({
      category: selectedCategory,
      setFilterParams,
      filterParams,
      setIsCategoryListOpen,
      linkPath: ROUTES.BROWSE,
      router,
    });
  };

  const handleOnClickAllCategories = () => {
    onClickAllCategories({ filterParams, setFilterParams, setIsCategoryListOpen });
  };

  if (isCategoryListOpen) {
    return (
      <CategoriesList
        onAllCategoriesClick={handleOnClickAllCategories}
        onCategoryClick={handleOnClickCategory}
        selectedCategory={filterParams.category}
      />
    );
  }

  const showEmpty = shouldShowBrowseEmptyMessage({
    isBrowse: scope === 'browse',
    isLoading,
    page,
    rowCount: channels.length,
  });

  return (
    <>
      {/* The subscribed list is already in memory, so the field narrows it locally. Global and
          category lists are paged directory queries, where search is the right tool. */}
      {type === 'subscribed' ? (
        <div className={styles.filterField}>
          <PodcastsFilterInput value={filterTerm} onChange={setFilterTerm} />
        </div>
      ) : null}
      {isSubscribedScope && (
        <HowToStartInfo
          rows={showMergedList ? merged : isMerged ? addByRSS.feeds : channels}
          totalPages={showMergedList ? mergedSlice.totalPages : totalPages}
        />
      )}
      {isSubscribedScope && (
        <p
          className={isFiltering ? styles.resultsCount : styles.resultsCountIdle}
          data-testid="podcasts-filter-results-count"
          role="status"
        >
          {isFiltering ? tSubscriptions('filter.results_count', { count: matchCount }) : ''}
        </p>
      )}
      {showNoFilterMatches && (
        <InfoWrapper>
          <p>{tSubscriptions('no_filter_matches')}</p>
        </InfoWrapper>
      )}
      {showEmpty ? (
        <NoResults message={tMedia('podcast.no_podcasts_found')} />
      ) : (
        <CorePodcasts
          page={showMergedList ? mergedSlice.page : showFilteredOnly ? filtered.page : page}
          setPage={
            showMergedList || showFilteredOnly
              ? setLocalPage
              : (nextPage) => setFilterParams({ ...filterParams, page: nextPage })
          }
          channels={showFilteredOnly ? filtered.channels : channels}
          items={showMergedList ? mergedSlice.channels : undefined}
          totalPages={
            showMergedList
              ? mergedSlice.totalPages
              : showFilteredOnly
                ? filtered.totalPages
                : totalPages
          }
          showSubscribeMessage={showSubscribeMessage}
          type={type}
          category={category}
          unseenBadges={unseenBadges}
          viewSelected={viewSelected}
        />
      )}
      <WebLoadingSpinnerOverlay
        isLoading={isLoading || fullList.isLoading || (isMerged && !fullList.isReady)}
      />
    </>
  );
};
