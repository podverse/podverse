import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';

import type { DTOClip } from '@podverse/helpers';
import type { ApiRequestService } from '@podverse/helpers-requests';

import { clipToHomeRow } from '../../../lib/rows/homeRowMappers';
import type { ChannelBrowseStackParamList } from '../../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../../navigation';
import type { HomeFeedRowData } from '../../home/homeFeedData';
import { HomeFeedRow } from '../../home/HomeFeedRow';
import { useHomeRowPlayback } from '../../home/useHomeRowPlayback';
import { PodcastSectionList } from './PodcastSectionList';
import type { PodcastSectionPaneProps } from './podcastSectionPane';
import type { PodcastSectionPage } from './usePodcastSectionRows';
import { sectionResponseHasMore, usePodcastSectionRows } from './usePodcastSectionRows';

/**
 * Clips listeners made from this podcast's episodes.
 *
 * Always offered, even when there are none: clips come from the audience rather than the publisher, so
 * an empty list is a true answer about this podcast rather than a feature it is missing.
 *
 * Both the order and the popularity window are the endpoint's to apply, so the chip row's choices go
 * out with the request. The window is only sent while the sort is by popularity, where it means
 * something.
 */
export function PodcastClipsSection({
  channelIdText,
  listHeader,
  onRefreshChannel,
  range,
  sort,
}: PodcastSectionPaneProps) {
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const navigation =
    useNavigation<NativeStackNavigationProp<ChannelBrowseStackParamList, 'PodcastDetail'>>();

  const fetchPage = useCallback(
    async (api: ApiRequestService, page: number): Promise<PodcastSectionPage<DTOClip>> => {
      const response = await api.reqClipGetManyByChannelPublic({
        idOrIdText: channelIdText,
        page,
        range: sort === 'top' ? range : null,
        sort,
      });

      return {
        hasMore: sectionResponseHasMore(response.meta, response.data.length),
        rows: response.data,
      };
    },
    [channelIdText, range, sort]
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

  const clipRows = useMemo<HomeFeedRowData[]>(
    () => rows.map((clip) => clipToHomeRow(clip, { showItemInfo: true })),
    [rows]
  );

  return (
    <PodcastSectionList
      emptyMessageKey="features.clip.no_clips_found"
      errorKey={errorKey}
      hasMore={hasMore}
      isInitialLoading={isInitialLoading}
      isLoadingMore={isLoadingMore}
      isRefreshing={isRefreshing}
      keyExtractor={(row) => row.id}
      listHeader={listHeader}
      noticeKey={playbackNoticeKey}
      onLoadMore={loadMore}
      onRefresh={() => {
        void onRefreshChannel();
        refresh();
      }}
      onRetry={retry}
      renderRow={({ index, isLast, row }) => (
        <HomeFeedRow
          isLast={isLast}
          mediaType="clips"
          onPlayPress={(clipRow) => {
            runPlayAction(clipRow, 'clips');
          }}
          onPress={(clipRow) => {
            navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.ClipDetail, { clipId: clipRow.id });
          }}
          onQueuePress={(clipRow, position) => {
            runQueueAction(clipRow, 'clips', position);
          }}
          row={row}
          showChannelContext={false}
          showContextLine
          testID={`podcast-clip-row-${index}`}
        />
      )}
      rows={clipRows}
      testID="podcast-detail-clip-list"
    />
  );
}
