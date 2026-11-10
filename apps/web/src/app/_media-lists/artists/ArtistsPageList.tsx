import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import type { AddByRSSResourceType } from '@podverse/helpers';
import { PAGINATION } from '@podverse/helpers';

import { BrowseEmptyResults } from '../../../components/Browse/BrowseEmptyResults';
import type { ArtistListItem } from '../../../components/Common/Artist/types';
import { CoreArtists } from '../../../components/Core/Artist/CoreArtists';
import { HowToStartInfo } from '../../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useFullSubscribedChannels } from '../../../hooks/useFullSubscribedChannels';
import { useListViewMode } from '../../../hooks/useListViewMode';
import { useReadyAddByRSSFeeds } from '../../../hooks/useReadyAddByRSSFeeds';
import {
  shouldShowBrowseByRecentAction,
  shouldShowBrowseEmptyMessage,
} from '../../../utils/mediaListChips';
import {
  artistListItemFromAddByRSSFeed,
  artistListItemFromChannel,
} from '../../../utils/subscribed/channelListItems';
import {
  mergeSubscribedChannelEntries,
  toEpochMsOrNull,
} from '../../../utils/subscribed/mergeSubscribedChannels';
import { selectFilteredSubscribedPage } from '../podcasts/podcastsFilter';
import { useArtistsPageContext } from './ArtistsPageContext';
import { artistsListViewModeScope } from './ArtistsPageDropdownConfig';

const NO_TYPES: readonly AddByRSSResourceType[] = [];
const ADD_BY_RSS_ARTIST_TYPES = ['artists'] as const;
const NO_MERGED_ARTISTS: ArtistListItem[] = [];

export const ArtistsPageList: React.FC = () => {
  const {
    filterParams,
    scope,
    setFilterParams,
    channels,
    totalPages,
    isLoading,
    showSubscribeMessage,
  } = useArtistsPageContext();
  const { viewSelected } = useListViewMode(artistsListViewModeScope(scope));
  const tMedia = useTranslations('media');
  const { medium, page, range, sort, type } = filterParams;

  const isSubscribedScope = scope === 'subscribed';
  const addByRSS = useReadyAddByRSSFeeds(isSubscribedScope ? ADD_BY_RSS_ARTIST_TYPES : NO_TYPES);
  const isMerged = isSubscribedScope && addByRSS.feeds.length > 0;
  const fullList = useFullSubscribedChannels(isMerged, { medium, range, sort });

  const [localPage, setLocalPage] = useState<number>(1);
  useEffect(() => {
    setLocalPage(1);
  }, [range, sort]);

  const merged = useMemo(() => {
    if (!isMerged || !fullList.isReady) {
      return NO_MERGED_ARTISTS;
    }

    return mergeSubscribedChannelEntries({
      server: fullList.channels.map((channel) => {
        const item = artistListItemFromChannel(channel);
        return {
          item,
          title: item.title,
          lastPubDateMs: toEpochMsOrNull(channel.channel_about?.last_pub_date),
        };
      }),
      addByRSS: addByRSS.feeds.map((feed) => {
        const item = artistListItemFromAddByRSSFeed(feed);
        return {
          item,
          title: item.title,
          lastPubDateMs: toEpochMsOrNull(feed.mappedFeed?.channel?.about?.last_pub_date),
        };
      }),
      sort,
    });
  }, [addByRSS.feeds, fullList.channels, fullList.isReady, isMerged, sort]);

  const slice = useMemo(
    () =>
      selectFilteredSubscribedPage({
        channels: merged,
        page: localPage,
        pageSize: PAGINATION.DEFAULT_LIMIT,
        term: '',
      }),
    [localPage, merged]
  );

  const showMergedList = isMerged && fullList.isReady;
  // Hold the server page until local feeds are known, and until the full list is ready when those feeds mix in.
  const awaitingSubscribedRows =
    isSubscribedScope && (!addByRSS.isReady || (isMerged && !fullList.isReady));

  const showEmpty = shouldShowBrowseEmptyMessage({
    isBrowse: scope === 'browse',
    isLoading,
    page,
    rowCount: channels.length,
  });
  const showBrowseByRecent = shouldShowBrowseByRecentAction({
    showEmpty,
    sort: filterParams.sort,
  });
  const handleBrowseByRecent = () => {
    setFilterParams({ ...filterParams, page: 1, sort: 'recent', range: null });
  };

  return (
    <>
      {isSubscribedScope && addByRSS.isReady && (
        <HowToStartInfo
          rows={showMergedList ? merged : isMerged ? addByRSS.feeds : channels}
          totalPages={showMergedList ? slice.totalPages : totalPages}
        />
      )}
      {showEmpty ? (
        <BrowseEmptyResults
          message={tMedia('music.no_artists_found')}
          onBrowseByRecent={showBrowseByRecent ? handleBrowseByRecent : undefined}
        />
      ) : awaitingSubscribedRows ? null : (
        <CoreArtists
          page={showMergedList ? slice.page : page}
          setPage={
            showMergedList
              ? setLocalPage
              : (nextPage) => setFilterParams({ ...filterParams, page: nextPage })
          }
          channels={channels}
          items={showMergedList ? slice.channels : undefined}
          totalPages={showMergedList ? slice.totalPages : totalPages}
          showSubscribeMessage={showSubscribeMessage}
          type={type}
          viewSelected={viewSelected}
        />
      )}
      <WebLoadingSpinnerOverlay
        isLoading={isLoading || fullList.isLoading || awaitingSubscribedRows}
      />
    </>
  );
};
