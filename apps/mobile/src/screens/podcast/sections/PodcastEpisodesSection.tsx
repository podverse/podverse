import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DTOItem } from '@podverse/helpers';
import { matchesTitleFilter } from '@podverse/helpers';
import type { LiveItemStatusEnum } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh } from '../../../auth';
import { useAuth } from '../../../auth/AuthProvider';
import { channelItemsRepository } from '../../../data/repositories/channelItemsRepository';
import {
  extendDirectoryChannelOrDropGone,
  syncDirectoryChannelOrDropGone,
} from '../../../data/repositories/directoryChannelGone';
import { toChannelLiveRow } from '../../../lib/rows/liveItemRows';
import { buildPublicShareUrl, shareResolvedUrl } from '../../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../../membership/MembershipGateProvider';
import type { ChannelBrowseStackParamList } from '../../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../../navigation';
import type { HomeFeedRowData } from '../../home/homeFeedData';
import { mapItemsToHomeFeedRows, mapItemToHomeFeedRow } from '../../home/homeFeedData';
import { HomeFeedRow } from '../../home/HomeFeedRow';
import type { QueueActionPosition } from '../../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../../home/useHomeRowPlayback';
import { useAddToPlaylist } from '../../library/useAddToPlaylist';
import { toStoredItemSort } from '../podcastSections';
import { PodcastSectionList } from './PodcastSectionList';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

type PodcastLiveRow = HomeFeedRowData & {
  liveStatusId: LiveItemStatusEnum | null;
};

const episodeRowKeyExtractor = (row: HomeFeedRowData): string => row.id;

type PodcastEpisodeRowProps = {
  channel: PodcastSectionPaneProps['channel'];
  engagedItemIds: ReadonlySet<string> | undefined;
  index: number;
  item: DTOItem | undefined;
  itemLastSeenAtMs: number | null | undefined;
  onAddToPlaylist: (row: HomeFeedRowData) => void;
  onMarkAsPlayed: (row: HomeFeedRowData) => void;
  onPlay: (row: HomeFeedRowData) => void;
  onPress: (row: HomeFeedRowData) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onShare: (row: HomeFeedRowData) => void;
  row: HomeFeedRowData;
};

function PodcastEpisodeRow({
  channel,
  engagedItemIds,
  index,
  item,
  itemLastSeenAtMs,
  onAddToPlaylist,
  onMarkAsPlayed,
  onPlay,
  onPress,
  onQueue,
  onShare,
  row,
}: PodcastEpisodeRowProps) {
  const downloadItem = useMemo(() => {
    if (item === undefined) {
      return undefined;
    }
    if (item.channel !== undefined || channel === null) {
      return item;
    }
    return { ...item, channel };
  }, [channel, item]);

  return (
    <HomeFeedRow
      downloadItem={downloadItem}
      downloadTestID={`podcast-episode-download-${index}`}
      engagedItemIds={engagedItemIds}
      itemLastSeenAtMs={itemLastSeenAtMs}
      mediaType="episodes"
      onAddToPlaylistPress={onAddToPlaylist}
      onMarkAsPlayedPress={onMarkAsPlayed}
      onPlayPress={onPlay}
      onPress={onPress}
      onQueuePress={onQueue}
      onSharePress={onShare}
      row={row}
      showChannelContext={false}
      testID={`podcast-episode-row-${index}`}
    />
  );
}

const toLiveRows = (items: DTOItem[]): PodcastLiveRow[] => {
  return items
    .map((item) =>
      toChannelLiveRow(
        mapItemToHomeFeedRow(item),
        item.live_item?.live_item_status_id,
        item.live_item?.start_time
      )
    )
    .filter((row) => row.id.length > 0);
};

/**
 * A podcast's episodes, read from the device and reconciled with the feed.
 *
 * Anything the podcast is broadcasting sits at the top of the same list rather than under a heading of
 * its own: a live episode is the most current episode, and the reader came here for the newest thing
 * first. Every livestream row states Live, Scheduled, or Ended. Only a stream on the air can
 * start from the list, and pressing any livestream row opens its page.
 */
export function PodcastEpisodesSection({
  channel,
  channelIdText,
  engagedItemIds,
  filterTerm,
  listHeader,
  onEngageItem,
  onRefreshChannel,
  sort,
  visitLastSeenAtMs,
}: PodcastSectionPaneProps) {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [storedItems, setStoredItems] = useState<DTOItem[]>([]);
  const [liveItems, setLiveItems] = useState<DTOItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  const { playbackNoticeKey, runMarkAsPlayedAction, runPlayAction, runQueueAction } =
    useHomeRowPlayback();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();
  const { openGate } = useMembershipGate();
  const navigation =
    useNavigation<NativeStackNavigationProp<ChannelBrowseStackParamList, 'PodcastDetail'>>();

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  // Held in a ref rather than read as a dependency: the show's name arrives after the first load,
  // and treating it as an input would sync the feed a second time for a value only written
  // alongside episodes that are already being fetched.
  const channelTitleRef = useRef<string | null>(channel?.title ?? null);
  channelTitleRef.current = channel?.title ?? channelTitleRef.current;
  /** Set for the duration of a next-page read so a second reach-further cannot start one. */
  const isLoadingMoreRef = useRef<boolean>(false);
  /** Which read failed, so Retry repeats that read instead of always reloading the section. */
  const failedLoadRef = useRef<'first' | 'more' | null>(null);

  /**
   * Read the stored window in the order the caller settled on.
   *
   * Re-reading rather than re-sorting in place keeps one source for the order: what is on screen is
   * always what the query returned, so the control and the list cannot drift apart.
   */
  const fetchStoredEpisodes = useCallback(async (): Promise<DTOItem[]> => {
    return channelItemsRepository.listByChannel(channelIdText, {
      sort: toStoredItemSort(sort),
    });
  }, [channelIdText, sort]);

  const readStoredEpisodes = useCallback(async () => {
    const stored = await fetchStoredEpisodes();
    setStoredItems(stored);
    return stored.length;
  }, [fetchStoredEpisodes]);

  /**
   * Rows are derived from the items rather than stored beside them, because the row actions need the
   * item itself: whether it can be downloaded is a question only the enclosure can answer.
   */
  const episodeRows = useMemo<HomeFeedRowData[]>(
    () => mapItemsToHomeFeedRows(storedItems),
    [storedItems]
  );
  const liveRows = useMemo<PodcastLiveRow[]>(() => toLiveRows(liveItems), [liveItems]);

  /** Every item on screen, live ones first, addressable by the id its row carries. */
  const itemsById = useMemo<Map<string, DTOItem>>(
    () => new Map([...liveItems, ...storedItems].map((item) => [item.id_text, item])),
    [liveItems, storedItems]
  );

  /**
   * Publish the stored episode window and live items together, then drop the spinner.
   *
   * Live items sit at the top of the same list. Publishing them a frame later would push every
   * episode down after first paint. The refresh that follows runs directly rather than through the
   * sync queue: somebody opened this screen and is waiting on it, and queued work is for passes
   * nobody asked for (`mobile-sync-orchestration`).
   *
   * A refresh that fails is only surfaced when the user asked for one. On open it is silent,
   * because what is stored is still worth reading and an error over the top of a working list would
   * say nothing useful. Live items are a real-time surface with nothing to store, so they stay empty
   * when there is no connection.
   */
  const loadEpisodes = useCallback(
    async ({ source }: { source: 'initial' | 'refresh' | 'retry' }) => {
      if (source === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }
      setErrorKey(null);

      try {
        const storedBefore = await fetchStoredEpisodes();
        const storedCount = storedBefore.length;

        try {
          const livePromise = requestWithMobileAuthRefresh(authContext, async (api) =>
            api.reqLiveItemGetManyByChannel(channelIdText)
          );
          const outcome = await syncDirectoryChannelOrDropGone(authContext, channelIdText, {
            channelTitle: channelTitleRef.current,
          });
          if (outcome.kind === 'gone' || outcome.kind === 'remapped') {
            void livePromise.then(
              () => undefined,
              () => undefined
            );
            setHasMorePages(false);
            const stored = await fetchStoredEpisodes();
            setStoredItems(stored);
            setLiveItems([]);
            failedLoadRef.current = null;
            return;
          }
          setHasMorePages(outcome.result.hasMore);
          const stored = await fetchStoredEpisodes();

          let liveResponse: DTOItem[] = [];
          try {
            liveResponse = await livePromise;
          } catch (liveError) {
            if (source === 'initial' && stored.length > 0) {
              liveResponse = [];
            } else {
              throw liveError;
            }
          }

          setStoredItems(stored);
          setLiveItems(liveResponse);
          failedLoadRef.current = null;
        } catch (error) {
          if (storedCount === 0 || source !== 'initial') {
            throw error;
          }
          setStoredItems(storedBefore);
          setLiveItems([]);
          failedLoadRef.current = null;
        }
      } catch {
        failedLoadRef.current = 'first';
        setErrorKey('errors.generic');
      } finally {
        setIsRefreshing(false);
        setIsInitialLoading(false);
      }
    },
    [authContext, channelIdText, fetchStoredEpisodes]
  );

  /**
   * Reach further back into the feed and keep it there, so the next visit opens at the same depth.
   *
   * Needs a connection by definition: offline the window stays where it is and the list keeps
   * showing what is stored.
   */
  const loadMoreEpisodes = useCallback(async () => {
    if (isLoadingMoreRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const outcome = await extendDirectoryChannelOrDropGone(authContext, channelIdText, {
        channelTitle: channelTitleRef.current,
      });
      if (outcome.kind === 'gone' || outcome.kind === 'remapped') {
        setHasMorePages(false);
        await readStoredEpisodes();
        failedLoadRef.current = null;
        return;
      }
      setHasMorePages(outcome.result.hasMore);
      await readStoredEpisodes();
      failedLoadRef.current = null;
    } catch {
      failedLoadRef.current = 'more';
      setErrorKey('errors.generic');
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [authContext, channelIdText, readStoredEpisodes]);

  useEffect(() => {
    void loadEpisodes({ source: 'initial' });
  }, [loadEpisodes]);

  const handleEpisodePress = useCallback(
    (row: HomeFeedRowData) => {
      onEngageItem?.(row.id);
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, { episodeId: row.id });
    },
    [navigation, onEngageItem]
  );

  const handleShare = useCallback((row: HomeFeedRowData) => {
    shareResolvedUrl(buildPublicShareUrl('episode', row.id));
  }, []);

  /**
   * Playlists live on the account, so signed out this explains itself through the gate instead of
   * failing quietly. Queue and play history are gated inside `useHomeRowPlayback` against
   * `queue_history_sync`; download stays local and is offered to everyone.
   */
  const handleAddToPlaylist = useCallback(
    (row: HomeFeedRowData) => {
      if (status !== 'authenticated') {
        openGate('needs_account');
        return;
      }
      requestAddToPlaylist({ idText: row.id, kind: 'item', medium: 'av' });
    },
    [openGate, requestAddToPlaylist, status]
  );

  const handleMarkAsPlayed = useCallback(
    (row: HomeFeedRowData) => {
      runMarkAsPlayedAction(row, 'episodes');
    },
    [runMarkAsPlayedAction]
  );

  const handlePlayPress = useCallback(
    (episodeRow: HomeFeedRowData) => {
      onEngageItem?.(episodeRow.id);
      runPlayAction(episodeRow, 'episodes');
    },
    [onEngageItem, runPlayAction]
  );

  const handleQueuePress = useCallback(
    (episodeRow: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(episodeRow, 'episodes', position);
    },
    [runQueueAction]
  );

  const handleLoadMore = useCallback(() => loadMoreEpisodes(), [loadMoreEpisodes]);

  const handleRefresh = useCallback(() => {
    void onRefreshChannel();
    void loadEpisodes({ source: 'refresh' });
  }, [loadEpisodes, onRefreshChannel]);

  const handleRetry = useCallback(() => {
    if (failedLoadRef.current === 'more') {
      setErrorKey(null);
      void loadMoreEpisodes();
      return;
    }
    void loadEpisodes({ source: 'retry' });
  }, [loadEpisodes, loadMoreEpisodes]);

  const renderRow = useCallback(
    ({ index, row }: { index: number; row: HomeFeedRowData }) => (
      <PodcastEpisodeRow
        channel={channel}
        engagedItemIds={engagedItemIds}
        index={index}
        item={itemsById.get(row.id)}
        itemLastSeenAtMs={row.liveStatusId === undefined ? visitLastSeenAtMs : null}
        onAddToPlaylist={handleAddToPlaylist}
        onMarkAsPlayed={handleMarkAsPlayed}
        onPlay={handlePlayPress}
        onPress={handleEpisodePress}
        onQueue={handleQueuePress}
        onShare={handleShare}
        row={row}
      />
    ),
    [
      channel,
      engagedItemIds,
      handleAddToPlaylist,
      handleEpisodePress,
      handleMarkAsPlayed,
      handlePlayPress,
      handleQueuePress,
      handleShare,
      itemsById,
      visitLastSeenAtMs,
    ]
  );

  /**
   * A live episode already written to the device would appear twice, so stored ids are subtracted.
   * Only a stream on the air can start from the list; a scheduled or ended row has no Play. Live
   * rows carry no new-content dot: a scheduled start lies in the future.
   */
  const liveDisplayRows = useMemo<HomeFeedRowData[]>(() => {
    const storedIds = new Set(episodeRows.map((row) => row.id));
    return liveRows.filter((liveRow) => !storedIds.has(liveRow.id));
  }, [episodeRows, liveRows]);

  const visibleRows = useMemo(
    () =>
      [...liveDisplayRows, ...episodeRows].filter((row) =>
        matchesTitleFilter(row.title, filterTerm)
      ),
    [episodeRows, filterTerm, liveDisplayRows]
  );

  const loadedRowCount = liveDisplayRows.length + episodeRows.length;

  return (
    <>
      <PodcastSectionList
        emptyMessageKey="media.podcast.no_episodes_found"
        errorKey={errorKey}
        hasFilterHiddenEverything={loadedRowCount > 0 && visibleRows.length === 0}
        hasMore={hasMorePages}
        isInitialLoading={isInitialLoading}
        isLoadingMore={isLoadingMore}
        isRefreshing={isRefreshing}
        keyExtractor={episodeRowKeyExtractor}
        listHeader={listHeader}
        noticeKey={playbackNoticeKey}
        autoLoadMore={filterTerm.trim().length === 0}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        onRetry={handleRetry}
        renderRow={renderRow}
        rows={visibleRows}
        statusTestIDPrefix="podcast-detail"
        testID="podcast-detail-episode-list"
      />
      {addToPlaylistSheet}
    </>
  );
}
