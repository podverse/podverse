import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateAbbrev } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';

import { DownloadRowControl } from '../../components/download/DownloadRowControl';
import {
  buildMediaRowMoreActions,
  MediaRowActions,
  type MediaRowMoreAction,
} from '../../components/player/MediaRowActions';
import {
  Badge,
  CoverImage,
  UNSEEN_INDICATOR_SIZE,
  UnseenIndicator,
} from '../../components/primitives';
import { downloadActionLabelKey, runDownloadAction } from '../../downloads/downloadAction';
import { useDownloadAction } from '../../downloads/useDownloads';
import { formatPlaybackDurationLabel } from '../../lib/formatPlaybackDurationLabel';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import {
  LIST_ROW_ARTWORK_SIZE,
  listRowArtworkGap,
  listRowVerticalPadding,
} from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { DirectoryMediaType } from '../browse/browseTypes';
import { isPlayableDirectoryMediaType } from '../browse/browseTypes';
import type { HomeFeedRowData } from './homeFeedData';
import type { HomeRowMetadata } from './homeRowMetadata';
import type { QueueActionPosition } from './useHomeRowPlayback';

type HomeFeedRowProps = {
  mediaType: DirectoryMediaType;
  onPress: (row: HomeFeedRowData) => void;
  onQueuePress: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onPlayPress: (row: HomeFeedRowData) => void;
  /** Optional action controls for locally-backed resources with a different playback path. */
  customActions?: ReactNode;
  /** When provided, adds an "Add to playlist" more-action. Omit for unsupported kinds. */
  onAddToPlaylistPress?: (row: HomeFeedRowData) => void;
  /** When provided, adds a "Mark as played" more-action. */
  onMarkAsPlayedPress?: (row: HomeFeedRowData) => void;
  /** When provided, adds a "Share" more-action. */
  onSharePress?: (row: HomeFeedRowData) => void;
  /** Additional more-menu actions shown before the standard queue/download/share actions. */
  extraMoreActions?: MediaRowMoreAction[];
  /**
   * The item this row stands for, plus the `testID` the control answers to. Supplying it puts a
   * one-tap download control on the row; the control decides whether there is anything to offer,
   * so a livestream or HLS-only item renders no affordance.
   */
  download?: { item: DTOItem; testID: string };
  row: HomeFeedRowData;
  /** Last row in a list: no bottom hairline so it does not sit on the list edge. */
  isLast?: boolean;
  testID?: string;
  /**
   * When true (default), show list artwork and the channel/context line above the title — Home
   * Episodes, Search, Library. When false, omit both so an in-channel screen does not repeat the
   * header's identity on every row.
   */
  showChannelContext?: boolean;
};

/**
 * Spoken names for the live chip and unseen indicator, already localized.
 *
 * Built once and folded into the row's `accessibilityLabel`, so a screen reader hears the same
 * facts a sighted user reads — rather than unattached fragments announced with no idea what they
 * belong to. The unseen face is a presence dot; the spoken form names that there is new content.
 */
const useMetadataAnnouncements = (
  metadata: HomeRowMetadata | undefined
): { liveLabel: string | null; unseenSpoken: string | null } => {
  const { t } = useTranslation();

  return useMemo(() => {
    if (metadata === undefined) {
      return { liveLabel: null, unseenSpoken: null };
    }

    return {
      liveLabel: metadata.isLive ? t('media.livestream.live') : null,
      unseenSpoken:
        metadata.unseenBadge === null ? null : t('subscriptions.row.unseen_indicator_aria'),
    };
  }, [metadata, t]);
};

const useUpdatedLabel = (
  updatedAt: string | number | null | undefined,
  fallbackMs: number | null | undefined
): string | null => {
  const { i18n } = useTranslation();

  return useMemo(() => {
    const source =
      updatedAt !== undefined && updatedAt !== null && updatedAt !== '' ? updatedAt : fallbackMs;
    if (source === undefined || source === null) {
      return null;
    }

    const parsed =
      typeof source === 'number' && source < 1e12 ? new Date(source * 1000) : new Date(source);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return formatDateAbbrev(parsed, i18n.language);
  }, [fallbackMs, i18n.language, updatedAt]);
};

const useDurationLabel = (duration: string | null | undefined, isLive: boolean): string | null => {
  const { t } = useTranslation();

  return useMemo(() => {
    if (isLive) {
      return null;
    }
    if (duration === undefined || duration === null || duration.length === 0) {
      return null;
    }
    return formatPlaybackDurationLabel(Number(duration), t);
  }, [duration, isLive, t]);
};

/**
 * Shared list row for channels and playable items.
 *
 * Playable item rows use three bands (identity + download, description, play/duration/more) so a
 * Home Episodes list can show channel context without stacking every control in one column, and an
 * in-channel list can drop art and channel name without inventing a second row component.
 */
export function HomeFeedRow({
  mediaType,
  onPress,
  onPlayPress,
  onQueuePress,
  onAddToPlaylistPress,
  onMarkAsPlayedPress,
  onSharePress,
  extraMoreActions,
  customActions,
  download,
  isLast = false,
  row,
  testID,
  showChannelContext = true,
}: HomeFeedRowProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const isPlayable = isPlayableDirectoryMediaType(mediaType);
  const { liveLabel, unseenSpoken } = useMetadataAnnouncements(row.metadata);
  const unseenBadge = row.metadata?.unseenBadge ?? null;
  const updatedLabel = useUpdatedLabel(row.updatedAt, row.metadata?.latestItemPubDateMs);
  const isLive = row.metadata?.isLive === true;
  const durationLabel = useDurationLabel(row.duration, isLive);
  const { activeTarget, enclosureSelectedParams } = usePlaybackSession();
  const activeMediaId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const explicitSelectedParams =
    download !== undefined && activeMediaId === download.item.id_text
      ? enclosureSelectedParams
      : undefined;
  const {
    isDownloadable,
    remove: removeDownload,
    start: startDownload,
    status: downloadStatus,
  } = useDownloadAction(download?.item, false, { explicitSelectedParams });
  const description =
    row.description !== undefined && row.description !== null && row.description.length > 0
      ? row.description
      : null;
  const channelLabel =
    showChannelContext && row.subtitle !== null && row.subtitle.length > 0 ? row.subtitle : null;
  const downloadedLabel =
    row.metadata !== undefined && row.metadata.downloadedCount > 0
      ? t('subscriptions.row.downloaded_count', { count: row.metadata.downloadedCount })
      : null;
  // First of the three identity lines (context / title / date). Item rows use the show name;
  // channel rows use the download count when there is one.
  const overlineLabel = channelLabel ?? downloadedLabel;
  const showArtwork = showChannelContext;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artworkWrap: {
          height: LIST_ROW_ARTWORK_SIZE,
          width: LIST_ROW_ARTWORK_SIZE,
        },
        channelTitle: {
          ...typography.caption,
          color: themeStyles.textPrimary.color,
        },
        date: {
          ...typography.caption,
          color: tokens.text.accent,
        },
        dateRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        description: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        image: {
          height: LIST_ROW_ARTWORK_SIZE,
          width: LIST_ROW_ARTWORK_SIZE,
        },
        identityRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: listRowArtworkGap(tokens.spacing),
        },
        identityText: {
          flex: 1,
          gap: tokens.spacing.xs,
          justifyContent: 'center',
          minWidth: 0,
        },
        liveBadge: {
          alignSelf: 'center',
        },
        liveOnArtwork: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
        },
        row: {
          alignItems: 'stretch',
          backgroundColor: themeStyles.screen.backgroundColor,
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        rowActions: {
          marginTop: tokens.spacing.sm,
        },
        rowBody: {
          flex: 1,
          gap: tokens.spacing.md,
          minWidth: 0,
          ...listRowVerticalPadding(tokens.spacing.base),
        },
        unseenRail: {
          alignItems: 'center',
          justifyContent: 'center',
          width: UNSEEN_INDICATOR_SIZE,
        },
        title: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
        },
      }),
    [isLast, themeStyles, tokens]
  );

  const moreActions = useMemo(() => {
    const standardActions = buildMediaRowMoreActions(
      t,
      {
        onAddToPlaylist:
          onAddToPlaylistPress !== undefined
            ? () => {
                onAddToPlaylistPress(row);
              }
            : undefined,
        onMarkAsPlayed:
          onMarkAsPlayedPress !== undefined
            ? () => {
                onMarkAsPlayedPress(row);
              }
            : undefined,
        onQueueLast: () => {
          onQueuePress(row, 'last');
        },
        onQueueNext: () => {
          onQueuePress(row, 'next');
        },
        onDownload: isDownloadable
          ? () => {
              runDownloadAction({
                remove: removeDownload,
                start: startDownload,
                status: downloadStatus,
              });
            }
          : undefined,
        onShare:
          onSharePress !== undefined
            ? () => {
                onSharePress(row);
              }
            : undefined,
      },
      {
        downloadLabelKey: isDownloadable ? downloadActionLabelKey(downloadStatus) : undefined,
        downloadTone: downloadStatus === 'complete' ? 'danger' : undefined,
        idSuffix: `-${row.id}`,
      }
    );
    return extraMoreActions !== undefined
      ? [...extraMoreActions, ...standardActions]
      : standardActions;
  }, [
    downloadStatus,
    extraMoreActions,
    isDownloadable,
    onAddToPlaylistPress,
    onMarkAsPlayedPress,
    onQueuePress,
    onSharePress,
    removeDownload,
    row,
    startDownload,
    t,
  ]);

  return (
    <Pressable
      // Composed rather than left to the default child walk, so the badges are heard as part of a
      // sentence about this show instead of as loose fragments after its title.
      accessibilityLabel={[
        overlineLabel,
        row.title,
        updatedLabel,
        description,
        durationLabel,
        liveLabel,
        unseenSpoken,
      ]
        .filter((part) => part !== null && part.length > 0)
        .join(', ')}
      accessibilityRole="button"
      onPress={() => {
        onPress(row);
      }}
      style={styles.row}
      testID={testID ?? `home-feed-row-${row.id}`}
    >
      <View style={styles.rowBody}>
        <View style={styles.identityRow}>
          {showArtwork ? (
            <View style={styles.artworkWrap}>
              <CoverImage
                fallbackLabel={t('media.image')}
                opensViewer={false}
                style={styles.image}
                uri={row.imageUrl}
              />
              {liveLabel !== null ? (
                <View pointerEvents="none" style={styles.liveOnArtwork}>
                  <Badge
                    label={liveLabel}
                    style={styles.liveBadge}
                    testID={`home-feed-row-live-${row.id}`}
                    tone="danger"
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.identityText}>
            {overlineLabel !== null ? (
              <Text
                numberOfLines={1}
                style={styles.channelTitle}
                testID={
                  channelLabel !== null
                    ? `home-feed-row-subtitle-${row.id}`
                    : `home-feed-row-downloaded-${row.id}`
                }
              >
                {overlineLabel}
              </Text>
            ) : null}
            <Text numberOfLines={2} style={styles.title} testID={`home-feed-row-title-${row.id}`}>
              {row.title}
            </Text>
            {updatedLabel !== null || (!showArtwork && liveLabel !== null) ? (
              <View style={styles.dateRow}>
                {!showArtwork && liveLabel !== null ? (
                  <Badge label={liveLabel} testID={`home-feed-row-live-${row.id}`} tone="danger" />
                ) : null}
                {updatedLabel !== null ? (
                  <Text
                    numberOfLines={1}
                    style={styles.date}
                    testID={`home-feed-row-updated-${row.id}`}
                  >
                    {updatedLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
          {download !== undefined ? (
            <DownloadRowControl item={download.item} testID={download.testID} />
          ) : null}
        </View>

        {description !== null ? (
          <Text
            numberOfLines={2}
            style={styles.description}
            testID={`home-feed-row-description-${row.id}`}
          >
            {description}
          </Text>
        ) : null}

        {customActions !== undefined ? (
          customActions
        ) : isPlayable ? (
          <View style={styles.rowActions}>
            <MediaRowActions
              appearance="icons"
              durationLabel={durationLabel}
              durationTestID={`home-feed-row-duration-${row.id}`}
              idSuffix={`-${row.id}`}
              moreActions={moreActions}
              moreTestID={`home-row-more-${row.id}`}
              onPlayPress={() => {
                onPlayPress(row);
              }}
              playbackMediaId={row.id}
              playLabel={t('media_player.play')}
              playTestID={`home-row-play-${row.id}`}
            />
          </View>
        ) : null}
      </View>
      {unseenBadge !== null ? (
        <View pointerEvents="none" style={styles.unseenRail}>
          <UnseenIndicator testID={`home-feed-row-unseen-${row.id}`} />
        </View>
      ) : null}
    </Pressable>
  );
}
