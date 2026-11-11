import { useCallback, useEffect, useMemo, useState } from 'react';

import { matchesTitleFilter } from '@podverse/helpers';

import { downloadsRepository } from '../../../data/repositories/downloadsRepository';
import { downloadStore } from '../../../downloads/downloadStore';
import { PodcastSectionList } from '../../podcast/sections/PodcastSectionList';
import type { AddByRssHomeEpisode } from '../addByRssHomeDetailData';
import { sortAddByRssHomeEpisodes } from '../addByRssHomeDetailData';
import { useAddByRssEpisodeRowRenderer } from './AddByRssEpisodesSection';
import type { AddByRssSectionPaneProps } from './addByRssSectionPane';

/**
 * Episodes of this add-by-RSS feed that are finished downloading on the device.
 *
 * The rows are the feed's current episodes, in recent order, kept when their download id is
 * complete. A download whose episode is no longer in the parsed feed is omitted here; Library →
 * Downloads still lists it.
 */
const downloadedEpisodeRows = (
  episodeRows: readonly AddByRssHomeEpisode[],
  downloadedIds: ReadonlySet<string>
): AddByRssHomeEpisode[] =>
  sortAddByRssHomeEpisodes(episodeRows, 'recent').filter((row) =>
    downloadedIds.has(row.downloadItemIdText)
  );

const downloadedRowKeyExtractor = (row: AddByRssHomeEpisode): string => row.id;

export function AddByRssDownloadedSection({
  detail,
  engagedItemIds,
  filterTerm,
  isMusicFeed,
  listHeader,
  onEngageItem,
  onRefresh,
  refreshNoticeKey,
  visitLastSeenAtMs,
}: AddByRssSectionPaneProps) {
  const [downloadedIds, setDownloadedIds] = useState<ReadonlySet<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const details = useMemo(() => [detail], [detail]);
  const {
    addToPlaylistSheet,
    noticeKey: playbackNoticeKey,
    renderRow,
  } = useAddByRssEpisodeRowRenderer({
    details,
    engagedItemIds,
    isMusicFeed,
    onEngageItem,
    visitLastSeenAtMs,
  });

  const loadDownloads = useCallback(
    async (source: 'initial' | 'refresh' | 'retry') => {
      if (source === 'refresh') {
        setIsRefreshing(true);
      } else if (source === 'initial' || source === 'retry') {
        setIsInitialLoading(true);
      }
      setErrorKey(null);

      try {
        const records = await downloadsRepository.listCompleteByChannel(detail.feed.feedUrl);
        setDownloadedIds(new Set(records.map((record) => record.itemIdText)));
      } catch {
        setErrorKey('errors.generic');
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [detail.feed.feedUrl]
  );

  useEffect(() => {
    void loadDownloads('initial');
    const unsubscribe = downloadStore.subscribe(() => {
      void loadDownloads('refresh');
    });
    return unsubscribe;
  }, [loadDownloads]);

  const rows = useMemo(
    () => downloadedEpisodeRows(detail.episodeRows, downloadedIds),
    [detail.episodeRows, downloadedIds]
  );

  const visibleRows = useMemo(
    () => rows.filter((row) => matchesTitleFilter(row.title, filterTerm)),
    [filterTerm, rows]
  );

  const handleRefresh = useCallback(() => {
    void onRefresh().then(() => {
      void loadDownloads('refresh');
    });
  }, [loadDownloads, onRefresh]);

  const handleRetry = useCallback(() => {
    void loadDownloads('retry');
  }, [loadDownloads]);

  return (
    <>
      <PodcastSectionList
        emptyMessageKey="features.download.empty"
        errorKey={errorKey}
        hasFilterHiddenEverything={rows.length > 0 && visibleRows.length === 0}
        isInitialLoading={isInitialLoading}
        isRefreshing={isRefreshing}
        keyExtractor={downloadedRowKeyExtractor}
        listHeader={listHeader}
        noticeKey={playbackNoticeKey ?? refreshNoticeKey}
        onRefresh={handleRefresh}
        onRetry={handleRetry}
        renderRow={renderRow}
        rows={visibleRows}
        statusTestIDPrefix="add-by-rss-home-downloaded"
        testID="add-by-rss-home-downloaded-list"
      />
      {addToPlaylistSheet}
    </>
  );
}
