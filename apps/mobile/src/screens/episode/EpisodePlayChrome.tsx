import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { DTOItem } from '@podverse/helpers';
import { itemHeaderLightboxArtworkCandidates } from '@podverse/helpers';

import { itemDetailDateLabel, ItemDetailHeader } from '../../components/content';
import { buildMediaRowMoreActions } from '../../components/player/MediaRowActions';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { downloadActionLabelKey, runDownloadAction } from '../../downloads/downloadAction';
import { useDownloadAction } from '../../downloads/useDownloads';
import { useActionError } from '../../feedback/ActionErrorProvider';
import { itemDetailArtworkUri } from '../../lib/content/itemDetailArtworkUri';
import { formatPlaybackDurationLabel } from '../../lib/formatPlaybackDurationLabel';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { itemDetailArtworkEdge } from '../../theme/screenLayout';
import { useResponsive } from '../../theme/useResponsive';
import type { HomeFeedRowData } from '../home/homeFeedData';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import type { EpisodePlaybackProgress } from './episodePlaybackProgress';
import { episodeProgressTimeKind } from './episodePlaybackProgress';
import { useEpisodeStoredProgress } from './useEpisodePlaybackProgress';

type EpisodePlayChromeProps = {
  episode: DTOItem;
  episodeRow: HomeFeedRowData;
  onAddToPlaylistPress: (row: HomeFeedRowData) => void;
  onMarkAsPlayedPress: (row: HomeFeedRowData) => void;
  onPlayPress: (row: HomeFeedRowData) => void;
  onPodcastPress?: () => void;
  onQueuePress: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onSharePress: (row: HomeFeedRowData) => void;
  podcastTitle: string;
};

type TranslateProgress = (
  key: string,
  options?: { count?: number; timePosition?: string; timeRemaining?: string }
) => string;

const formatProgressTimeLabel = (
  progress: EpisodePlaybackProgress,
  translate: TranslateProgress,
  fallbackDuration: string | null
): string | null => {
  const kind = episodeProgressTimeKind(progress);
  const formatSeconds = (seconds: number): string | null =>
    formatPlaybackDurationLabel(seconds, translate);

  if (kind === 'remaining') {
    const remaining = Math.max(0, progress.durationSeconds - progress.positionSeconds);
    const timeRemaining = formatSeconds(remaining);
    if (timeRemaining === null) {
      return null;
    }
    return translate('info.time.left', { timeRemaining });
  }
  if (kind === 'duration') {
    return formatSeconds(progress.durationSeconds);
  }
  if (fallbackDuration !== null && fallbackDuration.length > 0) {
    return formatSeconds(Number(fallbackDuration));
  }
  return null;
};

/**
 * Episode identity and the same play / duration / more bar a podcast episode row uses.
 *
 * Artwork is the full-width header square. Podcast name, episode title, and pub date stack under
 * it so a long title grows the header instead of covering the chips below. The play bar is
 * `MediaRowActions` in the icon appearance the list rows use, with download left of More.
 */
export function EpisodePlayChrome({
  episode,
  episodeRow,
  onAddToPlaylistPress,
  onMarkAsPlayedPress,
  onPlayPress,
  onPodcastPress,
  onQueuePress,
  onSharePress,
  podcastTitle,
}: EpisodePlayChromeProps) {
  const { t, i18n } = useTranslation();
  const { isTablet, width } = useResponsive();
  const { stored } = useEpisodeStoredProgress(episode);
  const { activeTarget, enclosureSelectedParams } = usePlaybackSession();
  const activeMediaId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const explicitSelectedParams =
    activeMediaId === episode.id_text ? enclosureSelectedParams : undefined;
  const {
    errorReason,
    isDownloadable,
    remove: removeDownload,
    start: startDownload,
    status: downloadStatus,
  } = useDownloadAction(episode, false, { explicitSelectedParams });
  const { openDownloadError } = useActionError();
  const artworkEdge = itemDetailArtworkEdge(width, isTablet);
  const listArtworkUri = getItemPrimaryImageUrl(episode);
  const artworkUri = itemDetailArtworkUri(
    episode.item_images,
    episode.channel?.channel_images,
    artworkEdge,
    listArtworkUri
  );
  const viewerUri = itemHeaderLightboxArtworkCandidates(episode.item_images)[0] ?? artworkUri;
  const episodeTitle = episode.title ?? episode.id_text;

  const dateLabel = useMemo(
    () => itemDetailDateLabel(episode.pub_date, i18n.language),
    [episode.pub_date, i18n.language]
  );

  const durationLabel = formatProgressTimeLabel(stored, t, episodeRow.duration ?? null);

  const moreActions = useMemo(
    () =>
      buildMediaRowMoreActions(
        t,
        {
          onAddToPlaylist: () => {
            onAddToPlaylistPress(episodeRow);
          },
          onMarkAsPlayed: () => {
            onMarkAsPlayedPress(episodeRow);
          },
          onQueueLast: () => {
            onQueuePress(episodeRow, 'last');
          },
          onQueueNext: () => {
            onQueuePress(episodeRow, 'next');
          },
          onDownload: isDownloadable
            ? () => {
                if (downloadStatus === 'failed') {
                  openDownloadError(errorReason, startDownload);
                  return;
                }
                runDownloadAction({
                  remove: removeDownload,
                  start: startDownload,
                  status: downloadStatus,
                });
              }
            : undefined,
          onShare: () => {
            onSharePress(episodeRow);
          },
        },
        {
          downloadLabelKey: isDownloadable ? downloadActionLabelKey(downloadStatus) : undefined,
          downloadTone: downloadStatus === 'complete' ? 'danger' : undefined,
          idSuffix: `-${episode.id_text}`,
        }
      ),
    [
      downloadStatus,
      episode.id_text,
      episodeRow,
      errorReason,
      isDownloadable,
      onAddToPlaylistPress,
      onMarkAsPlayedPress,
      onQueuePress,
      onSharePress,
      openDownloadError,
      removeDownload,
      startDownload,
      t,
    ]
  );

  return (
    <ItemDetailHeader
      artworkUri={artworkUri}
      channelTitle={podcastTitle}
      dateLabel={dateLabel}
      downloadItem={episode}
      durationLabel={durationLabel}
      mediaIdText={episode.id_text}
      moreActions={moreActions}
      onChannelPress={onPodcastPress}
      onPlayPress={() => {
        onPlayPress(episodeRow);
      }}
      testIDPrefix="episode-detail"
      title={episodeTitle}
      viewerUri={viewerUri}
    />
  );
}
