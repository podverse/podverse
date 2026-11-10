import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReactElement, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { matchesTitleFilter } from '@podverse/helpers';

import { useAddByRssPlayback } from '../../../hooks/useAddByRssPlayback';
import { addByRssLiveItemKey } from '../../../lib/addByRss/liveItemDetail';
import type { AddByRssLiveRow } from '../../../lib/addByRss/liveRows';
import { toAddByRssFeedLiveRows } from '../../../lib/addByRss/liveRows';
import { PodcastSectionList } from '../../podcast/sections/PodcastSectionList';
import type { AddByRssHomeDetailData, AddByRssHomeEpisode } from '../addByRssHomeDetailData';
import { sortAddByRssHomeEpisodes } from '../addByRssHomeDetailData';
import type { HomeFeedRowData } from '../homeFeedData';
import { HomeFeedRow } from '../HomeFeedRow';
import type { QueueActionPosition } from '../useHomeRowPlayback';
import type { AddByRssSectionPaneProps } from './addByRssSectionPane';
import type { AddByRssDetailStackParamList } from './addByRssStackParams';
import type { AddByRssItemActionTarget } from './useAddByRssItemActions';
import { useAddByRssItemActions } from './useAddByRssItemActions';

type AddByRssEpisodeListRow = AddByRssLiveRow | AddByRssHomeEpisode;

const addByRssEpisodeKeyExtractor = (row: AddByRssEpisodeListRow): string => row.id;

type AddByRssEpisodeRowProps = {
  engagedItemIds: ReadonlySet<string> | undefined;
  index: number;
  isMusicFeed: boolean;
  itemLastSeenAtMs: number | null | undefined;
  onAddToPlaylist: (row: HomeFeedRowData) => void;
  onGoToTrack: (row: HomeFeedRowData) => void;
  onMarkAsPlayed: (row: HomeFeedRowData) => void;
  onOpen: (row: HomeFeedRowData) => void;
  onPlay: (row: HomeFeedRowData) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  row: AddByRssHomeEpisode;
  testID?: string;
  trailing?: ReactNode;
};

function AddByRssEpisodeRow({
  engagedItemIds,
  index,
  isMusicFeed,
  itemLastSeenAtMs,
  onAddToPlaylist,
  onGoToTrack,
  onMarkAsPlayed,
  onOpen,
  onPlay,
  onQueue,
  row,
  testID,
  trailing,
}: AddByRssEpisodeRowProps) {
  return (
    <HomeFeedRow
      downloadItem={row.downloadItem ?? undefined}
      downloadTestID={`add-by-rss-home-download-${index}`}
      engagedItemIds={engagedItemIds}
      itemLastSeenAtMs={itemLastSeenAtMs}
      mediaType={isMusicFeed ? 'tracks' : 'episodes'}
      onAddToPlaylistPress={onAddToPlaylist}
      onGoToTrackPress={isMusicFeed ? onGoToTrack : undefined}
      onMarkAsPlayedPress={onMarkAsPlayed}
      onPlayPress={onPlay}
      onPress={isMusicFeed ? onPlay : onOpen}
      onQueuePress={onQueue}
      playTestID={
        isMusicFeed
          ? undefined
          : index === 0
            ? 'add-by-rss-home-play-first'
            : `add-by-rss-home-play-${row.id}`
      }
      row={row}
      showChannelContext={false}
      testID={testID ?? `add-by-rss-home-episode-${row.id}`}
      trailing={trailing}
    />
  );
}

type AddByRssLiveFeedRowProps = {
  onOpen: (row: AddByRssLiveRow) => void;
  onPlay: (row: AddByRssLiveRow) => void;
  row: AddByRssLiveRow;
};

function AddByRssLiveFeedRow({ onOpen, onPlay, row }: AddByRssLiveFeedRowProps) {
  return (
    <HomeFeedRow
      mediaType="episodes"
      onPlayPress={() => {
        onPlay(row);
      }}
      onPress={() => {
        onOpen(row);
      }}
      playTestID={`add-by-rss-home-play-live-${row.id}`}
      row={row}
      showChannelContext={false}
      testID={`add-by-rss-home-live-${row.id}`}
    />
  );
}

type AddByRssEpisodeRowRendererInput = {
  /** Every feed whose rows the list shows. Row ids carry the feed's `idText`, so they never collide. */
  details: readonly AddByRssHomeDetailData[];
  engagedItemIds?: ReadonlySet<string>;
  isMusicFeed: boolean;
  onEngageItem?: (itemId: string) => void;
  /** Replaces the shared episode-row test id. The index is the caller's row index. */
  rowTestID?: (index: number) => string;
  /** Far-right content for each episode row, keyed by the caller's row index. */
  trailing?: (index: number) => ReactNode;
  visitLastSeenAtMs: number | null | undefined;
};

type AddByRssRowEntry = { detail: AddByRssHomeDetailData; episode: AddByRssHomeEpisode };

/**
 * Row wiring shared by the episode, track, and downloaded lists, and by lists that gather tracks
 * from several feeds. Each row acts on its own feed.
 *
 * Those lists share row test ids. A caller that shows the rows beside directory rows passes its
 * own. A podcast row opens the episode page. A track row plays, and Go to Track opens the track
 * page. Livestream rows open the livestream page; the downloaded list does not render them.
 */
export function useAddByRssEpisodeRowRenderer({
  details,
  engagedItemIds,
  isMusicFeed,
  onEngageItem,
  rowTestID,
  trailing,
  visitLastSeenAtMs,
}: AddByRssEpisodeRowRendererInput): {
  addToPlaylistSheet: ReactNode;
  noticeKey: string | null;
  renderLiveRow: (row: AddByRssLiveRow) => ReactElement;
  renderRow: (params: { index: number; row: AddByRssHomeEpisode }) => ReactElement;
} {
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const { playItem, playLiveItem } = useAddByRssPlayback({ onNotice: setNoticeKey });
  const navigation = useNavigation<NativeStackNavigationProp<AddByRssDetailStackParamList>>();
  const rowsById = useMemo(() => {
    const entries = new Map<string, AddByRssRowEntry>();
    for (const detail of details) {
      for (const episode of detail.episodeRows) {
        entries.set(episode.id, { detail, episode });
      }
    }
    return entries;
  }, [details]);
  const { actionNoticeKey, addToPlaylist, addToPlaylistSheet, markAsPlayed, queue } =
    useAddByRssItemActions();

  const toTarget = useCallback(
    (row: HomeFeedRowData): AddByRssItemActionTarget | null => {
      const entry = rowsById.get(row.id);
      if (entry === undefined || entry.detail.mappedFeed === null) {
        return null;
      }
      return {
        feed: entry.detail.feed,
        itemBundle: entry.episode.itemBundle,
        itemIndex: entry.episode.itemIndex,
        mappedFeed: entry.detail.mappedFeed,
      };
    },
    [rowsById]
  );

  const handleQueue = useCallback(
    (row: HomeFeedRowData, position: QueueActionPosition) => {
      const target = toTarget(row);
      if (target === null) {
        return;
      }
      queue(target, position);
    },
    [queue, toTarget]
  );

  const handleAddToPlaylist = useCallback(
    (row: HomeFeedRowData) => {
      const target = toTarget(row);
      if (target === null) {
        return;
      }
      addToPlaylist(target);
    },
    [addToPlaylist, toTarget]
  );

  const handleMarkAsPlayed = useCallback(
    (row: HomeFeedRowData) => {
      const target = toTarget(row);
      if (target === null) {
        return;
      }
      markAsPlayed(target);
    },
    [markAsPlayed, toTarget]
  );

  const handleOpen = useCallback(
    (row: HomeFeedRowData) => {
      const entry = rowsById.get(row.id);
      if (entry === undefined) {
        return;
      }
      onEngageItem?.(row.id);
      navigation.navigate('AddByRssEpisodeDetail', {
        feedIdText: entry.detail.feed.idText,
        itemKey: entry.episode.itemKey,
      });
    },
    [navigation, onEngageItem, rowsById]
  );

  const handleGoToTrack = useCallback(
    (row: HomeFeedRowData) => {
      const entry = rowsById.get(row.id);
      if (entry === undefined) {
        return;
      }
      onEngageItem?.(row.id);
      navigation.navigate('AddByRssTrackDetail', {
        feedIdText: entry.detail.feed.idText,
        itemKey: entry.episode.itemKey,
      });
    },
    [navigation, onEngageItem, rowsById]
  );

  const handlePlay = useCallback(
    (row: HomeFeedRowData) => {
      const entry = rowsById.get(row.id);
      if (entry === undefined || entry.detail.mappedFeed === null) {
        setNoticeKey('features.add_by_rss.status_processing');
        return;
      }

      onEngageItem?.(row.id);
      const { episode } = entry;
      void playItem(
        entry.detail.feed,
        entry.detail.mappedFeed,
        episode.itemBundle,
        episode.itemIndex
      );
    },
    [onEngageItem, playItem, rowsById]
  );

  const handleOpenLive = useCallback(
    (row: AddByRssLiveRow) => {
      navigation.navigate('AddByRssLivestreamDetail', {
        feedIdText: row.target.feed.idText,
        liveItemKey: addByRssLiveItemKey(row.target.liveBundle, row.target.liveIndex),
      });
    },
    [navigation]
  );

  const handlePlayLive = useCallback(
    (row: AddByRssLiveRow) => {
      void playLiveItem(
        row.target.feed,
        row.target.mappedFeed,
        row.target.liveBundle,
        row.target.liveIndex
      );
    },
    [playLiveItem]
  );

  const renderLiveRow = useCallback(
    (row: AddByRssLiveRow) => (
      <AddByRssLiveFeedRow onOpen={handleOpenLive} onPlay={handlePlayLive} row={row} />
    ),
    [handleOpenLive, handlePlayLive]
  );

  const renderRow = useCallback(
    ({ index, row }: { index: number; row: AddByRssHomeEpisode }) => (
      <AddByRssEpisodeRow
        engagedItemIds={engagedItemIds}
        index={index}
        isMusicFeed={isMusicFeed}
        itemLastSeenAtMs={visitLastSeenAtMs}
        onAddToPlaylist={handleAddToPlaylist}
        onGoToTrack={handleGoToTrack}
        onMarkAsPlayed={handleMarkAsPlayed}
        onOpen={handleOpen}
        onPlay={handlePlay}
        onQueue={handleQueue}
        row={row}
        testID={rowTestID === undefined ? undefined : rowTestID(index)}
        trailing={trailing === undefined ? undefined : trailing(index)}
      />
    ),
    [
      engagedItemIds,
      handleAddToPlaylist,
      handleGoToTrack,
      handleMarkAsPlayed,
      handleOpen,
      handlePlay,
      handleQueue,
      isMusicFeed,
      rowTestID,
      trailing,
      visitLastSeenAtMs,
    ]
  );

  return {
    addToPlaylistSheet,
    noticeKey: actionNoticeKey ?? noticeKey,
    renderLiveRow,
    renderRow,
  };
}

/**
 * Episodes or tracks for one add-by-RSS feed.
 *
 * Livestream rows sit above the episode rows in the channel order: live, then scheduled, then
 * ended within a day. The sort chip orders episode rows only. A livestream row opens the
 * add-by-RSS livestream page. The title filter counts livestream and episode rows together.
 */
export function AddByRssEpisodesSection({
  detail,
  engagedItemIds,
  filterTerm,
  isMusicFeed,
  listHeader,
  onEngageItem,
  onRefresh,
  refreshNoticeKey,
  sort,
  visitLastSeenAtMs,
}: AddByRssSectionPaneProps) {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const details = useMemo(() => [detail], [detail]);
  const {
    addToPlaylistSheet,
    noticeKey: playbackNoticeKey,
    renderLiveRow,
    renderRow,
  } = useAddByRssEpisodeRowRenderer({
    details,
    engagedItemIds,
    isMusicFeed,
    onEngageItem,
    visitLastSeenAtMs,
  });

  const episodeRows = useMemo(
    () => sortAddByRssHomeEpisodes(detail.episodeRows, sort),
    [detail.episodeRows, sort]
  );

  const liveRows = useMemo(() => {
    if (detail.mappedFeed === null) {
      return [];
    }
    const episodeIds = new Set(detail.episodeRows.map((row) => row.id));
    return toAddByRssFeedLiveRows(detail.feed, detail.mappedFeed).filter(
      (row) => !episodeIds.has(row.id)
    );
  }, [detail.episodeRows, detail.feed, detail.mappedFeed]);

  const visibleLiveRows = useMemo(
    () => liveRows.filter((row) => matchesTitleFilter(row.title, filterTerm)),
    [filterTerm, liveRows]
  );

  const visibleEpisodeRows = useMemo(
    () => episodeRows.filter((row) => matchesTitleFilter(row.title, filterTerm)),
    [episodeRows, filterTerm]
  );

  const rows = useMemo(
    () => [...visibleLiveRows, ...visibleEpisodeRows],
    [visibleEpisodeRows, visibleLiveRows]
  );

  const liveRowsById = useMemo(
    () => new Map(visibleLiveRows.map((row) => [row.id, row])),
    [visibleLiveRows]
  );

  const renderListRow = useCallback(
    ({ index, row }: { index: number; row: AddByRssEpisodeListRow }) => {
      const liveRow = liveRowsById.get(row.id);
      if (liveRow !== undefined) {
        return renderLiveRow(liveRow);
      }

      const episodeIndex = index - visibleLiveRows.length;
      const episodeRow = visibleEpisodeRows[episodeIndex];
      if (episodeRow === undefined) {
        return <></>;
      }
      return renderRow({ index: episodeIndex, row: episodeRow });
    },
    [liveRowsById, renderLiveRow, renderRow, visibleEpisodeRows, visibleLiveRows]
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void onRefresh().finally(() => {
      setIsRefreshing(false);
    });
  }, [onRefresh]);

  const emptyMessageKey =
    detail.mappedFeed === null
      ? 'features.add_by_rss.status_processing'
      : isMusicFeed
        ? 'media.music.no_tracks_found'
        : 'media.podcast.no_episodes_found';

  return (
    <>
      <PodcastSectionList
        emptyMessageKey={emptyMessageKey}
        errorKey={null}
        hasFilterHiddenEverything={liveRows.length + episodeRows.length > 0 && rows.length === 0}
        isInitialLoading={false}
        isRefreshing={isRefreshing}
        keyExtractor={addByRssEpisodeKeyExtractor}
        listHeader={listHeader}
        noticeKey={playbackNoticeKey ?? refreshNoticeKey}
        onRefresh={handleRefresh}
        onRetry={handleRefresh}
        renderRow={renderListRow}
        rows={rows}
        statusTestIDPrefix="add-by-rss-home"
        testID="add-by-rss-home-episode-list"
      />
      {addToPlaylistSheet}
    </>
  );
}
