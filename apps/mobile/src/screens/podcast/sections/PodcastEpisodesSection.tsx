import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DTOItem } from '@podverse/helpers';
import { matchesTitleFilter } from '@podverse/helpers';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh } from '../../../auth';
import { useAuth } from '../../../auth/AuthProvider';
import { channelItemsRepository } from '../../../data/repositories/channelItemsRepository';
import {
  extendDirectoryChannelOrDropGone,
  syncDirectoryChannelOrDropGone,
} from '../../../data/repositories/directoryChannelGone';
import { buildPublicShareUrl, shareResolvedUrl } from '../../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../../membership/MembershipGateProvider';
import type { ChannelBrowseStackParamList } from '../../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../../navigation';
import type { HomeFeedRowData } from '../../home/homeFeedData';
import { mapItemsToHomeFeedRows, mapItemToHomeFeedRow } from '../../home/homeFeedData';
import { HomeFeedRow } from '../../home/HomeFeedRow';
import type { HomeRowMetadata } from '../../home/homeRowMetadata';
import { useHomeRowPlayback } from '../../home/useHomeRowPlayback';
import { useAddToPlaylist } from '../../library/useAddToPlaylist';
import { toStoredItemSort } from '../podcastSections';
import { PodcastSectionList } from './PodcastSectionList';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

type PodcastLiveRow = HomeFeedRowData & {
  liveStatusId: LiveItemStatusEnum | null;
};

/**
 * Said in the subtitle for the two statuses a badge would misrepresent. A stream that is on the air
 * is marked as such by the badge instead, so the word is not printed twice.
 */
const LIVE_STATUS_KEYS: Record<LiveItemStatusEnum, string> = {
  [LiveItemStatusEnum.Ended]: 'media.livestream.ended',
  [LiveItemStatusEnum.Live]: 'media.livestream.live',
  [LiveItemStatusEnum.Pending]: 'media.livestream.pending',
};

/** What a broadcasting row claims about itself: on the air, and nothing else a subscription says. */
const LIVE_ROW_METADATA: HomeRowMetadata = {
  downloadedCount: 0,
  isLive: true,
  latestItemPubDateMs: null,
  unseenBadge: null,
};

const toLiveRows = (items: DTOItem[]): PodcastLiveRow[] => {
  return items
    .map((item) => ({
      ...mapItemToHomeFeedRow(item),
      liveStatusId: item.live_item?.live_item_status_id ?? null,
    }))
    .filter((row) => row.id.length > 0);
};

/**
 * A podcast's episodes, read from the device and reconciled with the feed.
 *
 * Anything the podcast is broadcasting sits at the top of the same list rather than under a heading of
 * its own: a live episode is the most current episode, and the reader came here for the newest thing
 * first. The badge is what separates it from the rows below.
 */
export function PodcastEpisodesSection({
  channel,
  channelIdText,
  filterTerm,
  listHeader,
  onRefreshChannel,
  sort,
}: PodcastSectionPaneProps) {
  const { t } = useTranslation();
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

  /**
   * Read the stored window in the order the caller settled on.
   *
   * Re-reading rather than re-sorting in place keeps one source for the order: what is on screen is
   * always what the query returned, so the control and the list cannot drift apart.
   */
  const readStoredEpisodes = useCallback(async () => {
    const stored = await channelItemsRepository.listByChannel(channelIdText, {
      sort: toStoredItemSort(sort),
    });
    setStoredItems(stored);
    return stored.length;
  }, [channelIdText, sort]);

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
   * Paint from the device, then reconcile.
   *
   * The stored window renders immediately and is the whole answer offline. The refresh that follows
   * runs directly rather than through the sync queue: somebody opened this screen and is waiting on
   * it, and queued work is for passes nobody asked for (`mobile-sync-orchestration`).
   *
   * A refresh that fails is only surfaced when the user asked for one. On open it is silent,
   * because what is stored is still worth reading and an error over the top of a working list would
   * say nothing useful.
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
        const storedCount = await readStoredEpisodes();

        if (storedCount > 0) {
          setIsInitialLoading(false);
        }

        try {
          const outcome = await syncDirectoryChannelOrDropGone(authContext, channelIdText, {
            channelTitle: channelTitleRef.current,
          });
          if (outcome.kind === 'gone') {
            setHasMorePages(false);
            setLiveItems([]);
            await readStoredEpisodes();
            return;
          }
          setHasMorePages(outcome.result.hasMore);
          await readStoredEpisodes();

          // Live items are a real-time surface with nothing to store, so they simply stay empty
          // when there is no connection.
          const liveResponse = await requestWithMobileAuthRefresh(authContext, async (api) =>
            api.reqLiveItemGetManyByChannel(channelIdText)
          );
          setLiveItems(liveResponse);
        } catch (error) {
          if (storedCount === 0 || source !== 'initial') {
            throw error;
          }
        }
      } catch {
        setErrorKey('errors.generic');
      } finally {
        setIsRefreshing(false);
        setIsInitialLoading(false);
      }
    },
    [authContext, channelIdText, readStoredEpisodes]
  );

  /**
   * Reach further back into the feed and keep it there, so the next visit opens at the same depth.
   *
   * Needs a connection by definition: offline the window stays where it is and the list keeps
   * showing what is stored.
   */
  const loadMoreEpisodes = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const outcome = await extendDirectoryChannelOrDropGone(authContext, channelIdText, {
        channelTitle: channelTitleRef.current,
      });
      if (outcome.kind === 'gone') {
        setHasMorePages(false);
        await readStoredEpisodes();
        return;
      }
      setHasMorePages(outcome.result.hasMore);
      await readStoredEpisodes();
    } catch {
      setErrorKey('errors.generic');
    } finally {
      setIsLoadingMore(false);
    }
  }, [authContext, channelIdText, readStoredEpisodes]);

  useEffect(() => {
    void loadEpisodes({ source: 'initial' });
  }, [loadEpisodes]);

  const handleEpisodePress = useCallback(
    (row: HomeFeedRowData) => {
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, { episodeId: row.id });
    },
    [navigation]
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

  /**
   * Broadcasting rows, ready to sit above the stored ones.
   *
   * A live episode that has already been written to the device would otherwise appear twice, so the
   * stored ids are subtracted first. Only a stream actually on the air is badged; one that is
   * scheduled or over says so in its subtitle, where it reads as a fact rather than an invitation.
   */
  const liveDisplayRows = useMemo<HomeFeedRowData[]>(() => {
    const storedIds = new Set(episodeRows.map((row) => row.id));

    return liveRows
      .filter((liveRow) => !storedIds.has(liveRow.id))
      .map((liveRow) => {
        const isOnAir = liveRow.liveStatusId === LiveItemStatusEnum.Live;
        const statusLabel =
          liveRow.liveStatusId === null || isOnAir
            ? null
            : t(LIVE_STATUS_KEYS[liveRow.liveStatusId]);
        const subtitle =
          statusLabel === null
            ? liveRow.subtitle
            : liveRow.subtitle === null
              ? statusLabel
              : `${statusLabel} • ${liveRow.subtitle}`;

        return {
          ...liveRow,
          metadata: isOnAir ? LIVE_ROW_METADATA : undefined,
          subtitle,
        };
      });
  }, [episodeRows, liveRows, t]);

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
        keyExtractor={(row) => row.id}
        listHeader={listHeader}
        noticeKey={playbackNoticeKey}
        onLoadMore={() => {
          void loadMoreEpisodes();
        }}
        onRefresh={() => {
          void onRefreshChannel();
          void loadEpisodes({ source: 'refresh' });
        }}
        onRetry={() => {
          void loadEpisodes({ source: 'retry' });
        }}
        renderRow={({ index, isLast, row }) => {
          const item = itemsById.get(row.id);

          return (
            <HomeFeedRow
              download={
                item === undefined
                  ? undefined
                  : {
                      item:
                        item.channel !== undefined || channel === null
                          ? item
                          : { ...item, channel },
                      testID: `podcast-episode-download-${index}`,
                    }
              }
              isLast={isLast}
              mediaType="episodes"
              onAddToPlaylistPress={handleAddToPlaylist}
              onMarkAsPlayedPress={handleMarkAsPlayed}
              onPlayPress={(episodeRow) => {
                runPlayAction(episodeRow, 'episodes');
              }}
              onPress={handleEpisodePress}
              onQueuePress={(episodeRow, position) => {
                runQueueAction(episodeRow, 'episodes', position);
              }}
              onSharePress={handleShare}
              row={row}
              showChannelContext={false}
              testID={`podcast-episode-row-${index}`}
            />
          );
        }}
        rows={visibleRows}
        statusTestIDPrefix="podcast-detail"
        testID="podcast-detail-episode-list"
      />
      {addToPlaylistSheet}
    </>
  );
}
