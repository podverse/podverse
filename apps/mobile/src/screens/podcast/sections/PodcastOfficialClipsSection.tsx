import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { DTOItemSoundbite } from '@podverse/helpers';
import { matchesTitleFilter } from '@podverse/helpers';
import type { ApiRequestService } from '@podverse/helpers-requests';

import { getItemPrimaryImageUrl } from '../../../data/repositories/channelItemWindow';
import { usePlaybackSession } from '../../../playback/PlaybackProvider';
import type { HomeFeedRowData } from '../../home/homeFeedData';
import { HomeFeedRow } from '../../home/HomeFeedRow';
import { useHomeRowPlayback } from '../../home/useHomeRowPlayback';
import { PodcastSectionList } from './PodcastSectionList';
import type { PodcastSectionPaneProps } from './podcastSectionPane';
import type { PodcastSectionPage } from './usePodcastSectionRows';
import { sectionResponseHasMore, usePodcastSectionRows } from './usePodcastSectionRows';

/** A soundbite and the row it draws as, kept together so a tap can reach the DTO playback needs. */
type SoundbiteEntry = {
  row: HomeFeedRowData;
  soundbite: DTOItemSoundbite;
};

/**
 * Official clips are the publisher's own highlights, so the episode they came from is the context
 * worth naming — where an episode row would name the podcast.
 */
const toSoundbiteRow = (soundbite: DTOItemSoundbite, fallbackTitle: string): HomeFeedRowData => {
  const item = soundbite.item ?? null;
  const title = soundbite.title ?? '';
  const duration = soundbite.duration.trim();

  return {
    duration: duration.length > 0 ? duration : null,
    id: soundbite.id_text,
    imageUrl: item === null ? null : getItemPrimaryImageUrl(item),
    subtitle: item?.title ?? null,
    title: title.length > 0 ? title : fallbackTitle,
    updatedAt: item?.pub_date ?? null,
  };
};

/**
 * The soundbites this podcast's publisher marked in their own episodes.
 *
 * The endpoint decides the order, so the podcast's remembered sort is read before the request rather
 * than applied to what comes back. It ranks chronologically only; a podcast left on `top` reads as
 * most recent, which is the closest thing this list has to it.
 */
export function PodcastOfficialClipsSection({
  channel,
  channelIdText,
  filterTerm,
  listHeader,
  onRefreshChannel,
  sort,
}: PodcastSectionPaneProps) {
  const { t } = useTranslation();
  const { playbackNoticeKey, runQueueAction } = useHomeRowPlayback();
  const { playSoundbite } = usePlaybackSession();

  const fetchPage = useCallback(
    async (api: ApiRequestService, page: number): Promise<PodcastSectionPage<DTOItemSoundbite>> => {
      const response = await api.reqItemSoundbiteGetManyByChannelIdText(channelIdText, {
        page,
        sort: sort === 'oldest' ? 'oldest' : 'recent',
      });

      return {
        hasMore: sectionResponseHasMore(response.meta, response.data.length),
        rows: response.data,
      };
    },
    [channelIdText, sort]
  );

  const {
    errorKey,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    retry,
    rows,
  } = usePodcastSectionRows(fetchPage);

  const entries = useMemo<SoundbiteEntry[]>(
    () =>
      rows.map((soundbite) => ({
        row: toSoundbiteRow(soundbite, t('info.soundbite.official_clip')),
        soundbite,
      })),
    [rows, t]
  );

  const visibleEntries = useMemo(
    () => entries.filter((entry) => matchesTitleFilter(entry.row.title, filterTerm)),
    [entries, filterTerm]
  );

  /**
   * Bounded playback needs the episode the soundbite sits inside and the podcast that published it.
   * The channel this screen already loaded is preferred; the one on the episode is the fallback for a
   * response that carried it instead.
   */
  const playEntry = useCallback(
    (entry: SoundbiteEntry) => {
      const item = entry.soundbite.item ?? null;
      if (item === null) {
        return;
      }

      const owningChannel = channel ?? item.channel ?? null;
      if (owningChannel === null) {
        return;
      }

      void playSoundbite(entry.soundbite, item, owningChannel);
    },
    [channel, playSoundbite]
  );

  return (
    <PodcastSectionList
      emptyMessageKey="info.soundbite.no_official_clips_found"
      errorKey={errorKey}
      hasFilterHiddenEverything={entries.length > 0 && visibleEntries.length === 0}
      hasMore={hasMore}
      isInitialLoading={isInitialLoading}
      isLoadingMore={isLoadingMore}
      isRefreshing={isRefreshing}
      keyExtractor={(entry) => entry.soundbite.id_text}
      listHeader={listHeader}
      noticeKey={playbackNoticeKey}
      onLoadMore={loadMore}
      onRefresh={() => {
        void onRefreshChannel();
        refresh();
      }}
      onRetry={retry}
      renderRow={({ index, isLast, row: entry }) => (
        <HomeFeedRow
          isLast={isLast}
          mediaType="clips"
          onPlayPress={() => {
            playEntry(entry);
          }}
          onPress={() => {
            playEntry(entry);
          }}
          onQueuePress={(queueRow, position) => {
            runQueueAction(queueRow, 'clips', position);
          }}
          row={entry.row}
          showChannelContext={false}
          showContextLine
          testID={`podcast-soundbite-row-${index}`}
        />
      )}
      rows={visibleEntries}
      testID="podcast-detail-soundbite-list"
    />
  );
}
