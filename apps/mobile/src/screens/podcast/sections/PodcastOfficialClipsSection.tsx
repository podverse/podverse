import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { DTOItemSoundbite } from '@podverse/helpers';
import { matchesTitleFilter } from '@podverse/helpers';
import type { ApiRequestService } from '@podverse/helpers-requests';

import { getItemPrimaryImageUrl } from '../../../data/repositories/channelItemWindow';
import { usePlaybackSession } from '../../../playback/PlaybackProvider';
import type { HomeFeedRowData } from '../../home/homeFeedData';
import { HomeFeedRow } from '../../home/HomeFeedRow';
import type { QueueActionPosition } from '../../home/useHomeRowPlayback';
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
const officialClipKeyExtractor = (entry: SoundbiteEntry): string => entry.soundbite.id_text;

type OfficialClipRowProps = {
  entry: SoundbiteEntry;
  index: number;
  isLast: boolean;
  onPlay: (entry: SoundbiteEntry) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
};

function OfficialClipRow({ entry, index, isLast, onPlay, onQueue }: OfficialClipRowProps) {
  const handlePlay = useCallback(() => {
    onPlay(entry);
  }, [entry, onPlay]);

  return (
    <HomeFeedRow
      isLast={isLast}
      mediaType="clips"
      onPlayPress={handlePlay}
      onPress={handlePlay}
      onQueuePress={onQueue}
      row={entry.row}
      showChannelContext={false}
      showContextLine
      testID={`podcast-soundbite-row-${index}`}
    />
  );
}

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

  const handleQueuePress = useCallback(
    (queueRow: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(queueRow, 'clips', position);
    },
    [runQueueAction]
  );

  const handleRefresh = useCallback(() => {
    void onRefreshChannel();
    refresh();
  }, [onRefreshChannel, refresh]);

  const renderRow = useCallback(
    ({ index, isLast, row: entry }: { index: number; isLast: boolean; row: SoundbiteEntry }) => (
      <OfficialClipRow
        entry={entry}
        index={index}
        isLast={isLast}
        onPlay={playEntry}
        onQueue={handleQueuePress}
      />
    ),
    [handleQueuePress, playEntry]
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
      keyExtractor={officialClipKeyExtractor}
      listHeader={listHeader}
      noticeKey={playbackNoticeKey}
      onLoadMore={loadMore}
      onRefresh={handleRefresh}
      onRetry={retry}
      renderRow={renderRow}
      rows={visibleEntries}
      testID="podcast-detail-soundbite-list"
    />
  );
}
