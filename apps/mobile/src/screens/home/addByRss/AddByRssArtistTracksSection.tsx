import { useCallback, useMemo, useState } from 'react';

import { matchesTitleFilter } from '@podverse/helpers';

import { PodcastSectionList } from '../../podcast/sections/PodcastSectionList';
import type { AddByRssHomeEpisode } from '../addByRssHomeDetailData';
import { sortAddByRssHomeEpisodes } from '../addByRssHomeDetailData';
import { useAddByRssEpisodeRowRenderer } from './AddByRssEpisodesSection';
import type { AddByRssSectionPaneProps } from './addByRssSectionPane';
import { useAddByRssArtistAlbums } from './useAddByRssArtistAlbums';

const trackKeyExtractor = (row: AddByRssHomeEpisode): string => row.id;

/**
 * An Add by RSS artist's tracks: its own, then each Add by RSS album's in album order, then the
 * tracks the artist lists from other albums. Each feed keeps its item order, and Backward reverses
 * the whole list. Directory albums' tracks stay on the directory album.
 */
export function AddByRssArtistTracksSection({
  detail,
  engagedItemIds,
  filterTerm,
  listHeader,
  onEngageItem,
  onRefresh,
  refreshNoticeKey,
  sort,
  visitLastSeenAtMs,
}: AddByRssSectionPaneProps) {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { isLoading, reload, trackDetails } = useAddByRssArtistAlbums(detail.feed.feedUrl, {
    includeTracks: true,
  });
  const {
    addToPlaylistSheet,
    noticeKey: playbackNoticeKey,
    renderRow,
  } = useAddByRssEpisodeRowRenderer({
    details: trackDetails,
    engagedItemIds,
    isMusicFeed: true,
    onEngageItem,
    visitLastSeenAtMs,
  });

  const trackRows = useMemo(() => {
    const rows = trackDetails.flatMap((trackDetail) =>
      sortAddByRssHomeEpisodes(trackDetail.episodeRows, 'forward')
    );
    return sort === 'backward' ? rows.reverse() : rows;
  }, [sort, trackDetails]);

  const visibleRows = useMemo(
    () => trackRows.filter((row) => matchesTitleFilter(row.title, filterTerm)),
    [filterTerm, trackRows]
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void (async () => {
      try {
        await onRefresh();
        await reload();
      } finally {
        setIsRefreshing(false);
      }
    })();
  }, [onRefresh, reload]);

  const handleRetry = useCallback(() => {
    void reload();
  }, [reload]);

  return (
    <>
      <PodcastSectionList
        emptyMessageKey="media.music.no_tracks_found"
        errorKey={null}
        hasFilterHiddenEverything={trackRows.length > 0 && visibleRows.length === 0}
        isInitialLoading={isLoading}
        isRefreshing={isRefreshing}
        keyExtractor={trackKeyExtractor}
        listHeader={listHeader}
        noticeKey={playbackNoticeKey ?? refreshNoticeKey}
        onRefresh={handleRefresh}
        onRetry={handleRetry}
        renderRow={renderRow}
        rows={visibleRows}
        statusTestIDPrefix="add-by-rss-artist-tracks"
        testID="add-by-rss-artist-track-list"
      />
      {addToPlaylistSheet}
    </>
  );
}
