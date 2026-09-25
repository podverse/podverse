import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DTOItem } from '@podverse/helpers';
import { matchesTitleFilter } from '@podverse/helpers';

import { channelItemsRepository } from '../../../data/repositories/channelItemsRepository';
import { downloadsRepository } from '../../../data/repositories/downloadsRepository';
import { downloadStore } from '../../../downloads/downloadStore';
import type { DownloadRecord } from '../../../downloads/downloadTypes';
import { buildPublicShareUrl, shareResolvedUrl } from '../../../lib/share/shareNowPlaying';
import type { ChannelBrowseStackParamList } from '../../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../../navigation';
import type { HomeFeedRowData } from '../../home/homeFeedData';
import { mapItemToHomeFeedRow } from '../../home/homeFeedData';
import { HomeFeedRow } from '../../home/HomeFeedRow';
import type { QueueActionPosition } from '../../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../../home/useHomeRowPlayback';
import { useAddToPlaylist } from '../../library/useAddToPlaylist';
import { PodcastSectionList } from './PodcastSectionList';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

type DownloadedRow = {
  item: DTOItem | null;
  record: DownloadRecord;
  row: HomeFeedRowData;
};

const downloadedRowKeyExtractor = (entry: DownloadedRow): string => entry.row.id;

const rowFromDownloadRecord = (record: DownloadRecord): HomeFeedRowData => ({
  description: null,
  duration: null,
  id: record.itemIdText,
  imageUrl: record.artworkUrl,
  subtitle: null,
  title: record.title ?? record.itemIdText,
  updatedAt: record.updatedAt,
});

/**
 * Episodes of this podcast that are finished downloading on the device.
 *
 * Always offered: an empty list is a true answer about what is offline for this show, not a missing
 * feature. Rows prefer the stored `channel_item` payload when present so play / download controls
 * match Episodes; otherwise they fall back to the download index fields alone.
 */
export function PodcastDownloadedSection({
  channelIdText,
  filterTerm,
  listHeader,
  onRefreshChannel,
}: PodcastSectionPaneProps) {
  const [entries, setEntries] = useState<DownloadedRow[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runMarkAsPlayedAction, runPlayAction, runQueueAction } =
    useHomeRowPlayback();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();
  const navigation =
    useNavigation<NativeStackNavigationProp<ChannelBrowseStackParamList, 'PodcastDetail'>>();

  const loadDownloads = useCallback(
    async (source: 'initial' | 'refresh' | 'retry') => {
      if (source === 'refresh') {
        setIsRefreshing(true);
      } else if (source === 'initial' || source === 'retry') {
        setIsInitialLoading(true);
      }
      setErrorKey(null);

      try {
        const records = await downloadsRepository.listCompleteByChannel(channelIdText);
        const next: DownloadedRow[] = [];

        for (const record of records) {
          const item = await channelItemsRepository.getByIdText(record.itemIdText);
          if (item !== null) {
            next.push({
              item,
              record,
              row: mapItemToHomeFeedRow(item),
            });
          } else {
            next.push({
              item: null,
              record,
              row: rowFromDownloadRecord(record),
            });
          }
        }

        setEntries(next);
      } catch {
        setErrorKey('errors.generic');
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [channelIdText]
  );

  useEffect(() => {
    void loadDownloads('initial');
    const unsubscribe = downloadStore.subscribe(() => {
      void loadDownloads('refresh');
    });
    return unsubscribe;
  }, [loadDownloads]);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => matchesTitleFilter(entry.row.title, filterTerm)),
    [entries, filterTerm]
  );

  const handleEpisodePress = useCallback(
    (row: HomeFeedRowData) => {
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, { episodeId: row.id });
    },
    [navigation]
  );

  const handleShare = useCallback((row: HomeFeedRowData) => {
    shareResolvedUrl(buildPublicShareUrl('episode', row.id));
  }, []);

  const handleAddToPlaylist = useCallback(
    (row: HomeFeedRowData) => {
      requestAddToPlaylist({ idText: row.id, kind: 'item', medium: 'av' });
    },
    [requestAddToPlaylist]
  );

  const handleMarkAsPlayed = useCallback(
    (row: HomeFeedRowData) => {
      runMarkAsPlayedAction(row, 'episodes');
    },
    [runMarkAsPlayedAction]
  );

  const handlePlayPress = useCallback(
    (episodeRow: HomeFeedRowData) => {
      runPlayAction(episodeRow, 'episodes');
    },
    [runPlayAction]
  );

  const handleQueuePress = useCallback(
    (episodeRow: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(episodeRow, 'episodes', position);
    },
    [runQueueAction]
  );

  const handleRefresh = useCallback(() => {
    void onRefreshChannel();
    void loadDownloads('refresh');
  }, [loadDownloads, onRefreshChannel]);

  const handleRetry = useCallback(() => {
    void loadDownloads('retry');
  }, [loadDownloads]);

  const renderRow = useCallback(
    ({ index, isLast, row: entry }: { index: number; isLast: boolean; row: DownloadedRow }) => (
      <HomeFeedRow
        downloadItem={entry.item === null ? undefined : entry.item}
        downloadTestID={`podcast-downloaded-download-${index}`}
        isLast={isLast}
        mediaType="episodes"
        onAddToPlaylistPress={handleAddToPlaylist}
        onMarkAsPlayedPress={handleMarkAsPlayed}
        onPlayPress={handlePlayPress}
        onPress={handleEpisodePress}
        onQueuePress={handleQueuePress}
        onSharePress={handleShare}
        row={entry.row}
        showChannelContext={false}
        testID={`podcast-downloaded-row-${index}`}
      />
    ),
    [
      handleAddToPlaylist,
      handleEpisodePress,
      handleMarkAsPlayed,
      handlePlayPress,
      handleQueuePress,
      handleShare,
    ]
  );

  return (
    <>
      <PodcastSectionList
        emptyMessageKey="features.download.empty"
        errorKey={errorKey}
        hasFilterHiddenEverything={entries.length > 0 && visibleEntries.length === 0}
        isInitialLoading={isInitialLoading}
        isRefreshing={isRefreshing}
        keyExtractor={downloadedRowKeyExtractor}
        listHeader={listHeader}
        noticeKey={playbackNoticeKey}
        onRefresh={handleRefresh}
        onRetry={handleRetry}
        renderRow={renderRow}
        rows={visibleEntries}
        statusTestIDPrefix="podcast-detail-downloaded"
        testID="podcast-detail-downloaded-list"
      />
      {addToPlaylistSheet}
    </>
  );
}
