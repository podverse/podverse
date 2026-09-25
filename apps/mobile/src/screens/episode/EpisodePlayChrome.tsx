import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOItem } from '@podverse/helpers';
import { formatDateAbbrev, itemHeaderLightboxArtworkCandidates } from '@podverse/helpers';

import { DownloadRowControl } from '../../components/download/DownloadRowControl';
import { buildMediaRowMoreActions, MediaRowActions } from '../../components/player/MediaRowActions';
import { CoverImage } from '../../components/primitives';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { downloadActionLabelKey, runDownloadAction } from '../../downloads/downloadAction';
import { useDownloadAction } from '../../downloads/useDownloads';
import { useActionError } from '../../feedback/ActionErrorProvider';
import { formatPlaybackDurationLabel } from '../../lib/formatPlaybackDurationLabel';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
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

const EPISODE_ARTWORK_SIZE = 96;

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
 * Artwork sits at the top with the same download/delete icon a list episode row uses, far right
 * of the image. Podcast name, episode title, and pub date stack under that row so a long title
 * grows the header instead of covering the chips below. The play bar is `MediaRowActions` in the
 * icon appearance the list rows use.
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
  const { styles: themeStyles, tokens } = useTheme();
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
  const artworkUri = getItemPrimaryImageUrl(episode);
  const viewerUri = itemHeaderLightboxArtworkCandidates(episode.item_images)[0] ?? artworkUri;
  const episodeTitle = episode.title ?? episode.id_text;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          height: EPISODE_ARTWORK_SIZE,
          width: EPISODE_ARTWORK_SIZE,
        },
        artworkRow: {
          alignItems: 'flex-start',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
        },
        date: {
          ...typography.caption,
          color: tokens.text.accent,
        },
        playChrome: {
          marginTop: tokens.spacing.sm,
        },
        podcastTitle: {
          ...typography.label,
          color: themeStyles.textSecondary.color,
        },
        root: {
          gap: tokens.spacing.md,
        },
        title: {
          ...typography.title,
          color: themeStyles.textPrimary.color,
        },
        titles: {
          gap: tokens.spacing.xs,
        },
      }),
    [themeStyles, tokens]
  );

  const dateLabel = useMemo(() => {
    if (
      episode.pub_date === undefined ||
      episode.pub_date === null ||
      episode.pub_date.length === 0
    ) {
      return null;
    }
    const parsed = new Date(episode.pub_date);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return formatDateAbbrev(parsed, i18n.language);
  }, [episode.pub_date, i18n.language]);

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

  const podcastName =
    onPodcastPress === undefined ? (
      <Text style={styles.podcastTitle} testID="episode-detail-podcast-title">
        {podcastTitle}
      </Text>
    ) : (
      <Pressable
        accessibilityLabel={podcastTitle}
        accessibilityRole="link"
        onPress={onPodcastPress}
        testID="episode-detail-podcast-title"
      >
        <Text style={styles.podcastTitle}>{podcastTitle}</Text>
      </Pressable>
    );

  return (
    <View style={styles.root} testID="episode-detail-header">
      <View style={styles.artworkRow}>
        <CoverImage
          accessibilityLabel={episodeTitle}
          style={styles.artwork}
          testID="episode-detail-artwork"
          uri={artworkUri}
          viewerUri={viewerUri}
        />
        <DownloadRowControl
          completeTestID="episode-detail-download-complete"
          item={episode}
          testID="episode-detail-download"
        />
      </View>
      <View style={styles.titles}>
        {podcastName}
        <Text accessibilityRole="header" style={styles.title} testID="episode-detail-title">
          {episodeTitle}
        </Text>
        {dateLabel !== null ? (
          <Text style={styles.date} testID="episode-detail-date">
            {dateLabel}
          </Text>
        ) : null}
      </View>
      <View style={styles.playChrome} testID="episode-detail-play-chrome">
        <MediaRowActions
          appearance="icons"
          durationLabel={durationLabel}
          durationTestID={`home-feed-row-duration-${episode.id_text}`}
          idSuffix={`-${episode.id_text}`}
          moreActions={moreActions}
          moreTestID={`home-row-more-${episode.id_text}`}
          onPlayPress={() => {
            onPlayPress(episodeRow);
          }}
          playbackMediaId={episode.id_text}
          playLabel={t('media_player.play')}
          playTestID={`home-row-play-${episode.id_text}`}
        />
      </View>
    </View>
  );
}
