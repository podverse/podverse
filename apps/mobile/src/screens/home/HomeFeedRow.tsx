import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateAbbrev } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import { formatSecondsToReadableDuration } from '@podverse/helpers/timeFormatter';

import { DownloadRowControl } from '../../components/download/DownloadRowControl';
import { buildMediaRowMoreActions, MediaRowActions } from '../../components/player/MediaRowActions';
import { Badge, CoverImage } from '../../components/primitives';
import { LIST_ROW_ARTWORK_SIZE, listRowArtworkGap, listRowVerticalPadding } from '../../theme/screenLayout';
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
 * One piece of the metadata line: the text, how it draws, and the name its `testID` ends in.
 *
 * `emphasis` is what a badge is for — something to notice — versus a fact to read. The badges say
 * "there is something here for you now"; the date and the download count describe the row.
 */
type MetadataSegment = {
  emphasis: boolean;
  name: string;
  text: string;
};

/**
 * What the metadata line says, in reading order, already localized.
 *
 * Built once and used for both the visible pills and the row's `accessibilityLabel`, so a screen
 * reader hears the same facts in the same order a sighted user reads them — rather than four
 * unattached fragments ("Live", "3 new", "2 downloaded") announced with no idea what they belong to.
 */
const useMetadataSegments = (metadata: HomeRowMetadata | undefined): MetadataSegment[] => {
  const { t } = useTranslation();

  return useMemo(() => {
    if (metadata === undefined) {
      return [];
    }

    const segments: MetadataSegment[] = [];

    if (metadata.isLive) {
      segments.push({ emphasis: true, name: 'live', text: t('media.livestream.live') });
    }
    if (metadata.unseenBadge !== null) {
      segments.push({
        emphasis: true,
        name: 'unseen',
        text: t(
          metadata.unseenBadge.isCapped
            ? 'subscriptions.row.unseen_count_capped'
            : 'subscriptions.row.unseen_count',
          { count: metadata.unseenBadge.count }
        ),
      });
    }
    if (metadata.downloadedCount > 0) {
      segments.push({
        emphasis: false,
        name: 'downloaded',
        text: t('subscriptions.row.downloaded_count', { count: metadata.downloadedCount }),
      });
    }

    return segments;
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

const useDurationLabel = (
  duration: string | null | undefined,
  isLive: boolean
): string | null => {
  const { i18n } = useTranslation();

  return useMemo(() => {
    if (isLive) {
      return null;
    }
    if (duration === undefined || duration === null || duration.length === 0) {
      return null;
    }
    return formatSecondsToReadableDuration(duration, i18n.language);
  }, [duration, i18n.language, isLive]);
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
  const metadataSegments = useMetadataSegments(row.metadata);
  const updatedLabel = useUpdatedLabel(row.updatedAt, row.metadata?.latestItemPubDateMs);
  const isLive = row.metadata?.isLive === true;
  const durationLabel = useDurationLabel(row.duration, isLive);
  const description =
    row.description !== undefined && row.description !== null && row.description.length > 0
      ? row.description
      : null;
  const channelLabel =
    showChannelContext && row.subtitle !== null && row.subtitle.length > 0 ? row.subtitle : null;
  const showArtwork = showChannelContext;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        channelTitle: {
          ...typography.caption,
          color: themeStyles.textPrimary.color,
        },
        date: {
          ...typography.caption,
          color: tokens.text.accent,
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
        metadataRow: {
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.spacing.sm,
        },
        metadataText: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        row: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          gap: tokens.spacing.md,
          ...listRowVerticalPadding(tokens.spacing.base),
        },
        rowActions: {
          marginTop: tokens.spacing.sm,
        },
        title: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
        },
      }),
    [isLast, themeStyles, tokens]
  );

  const moreActions = useMemo(
    () =>
      buildMediaRowMoreActions(
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
          onShare:
            onSharePress !== undefined
              ? () => {
                  onSharePress(row);
                }
              : undefined,
        },
        { idSuffix: `-${row.id}` }
      ),
    [onAddToPlaylistPress, onMarkAsPlayedPress, onQueuePress, onSharePress, row, t]
  );

  return (
    <Pressable
      // Composed rather than left to the default child walk, so the badges are heard as part of a
      // sentence about this show instead of as loose fragments after its title.
      accessibilityLabel={[
        channelLabel,
        row.title,
        updatedLabel,
        description,
        durationLabel,
        ...metadataSegments.map((s) => s.text),
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
      <View style={styles.identityRow}>
        {showArtwork ? (
          <CoverImage
            fallbackLabel={t('media.image')}
            opensViewer={false}
            style={styles.image}
            uri={row.imageUrl}
          />
        ) : null}
        <View style={styles.identityText}>
          {channelLabel !== null ? (
            <Text
              numberOfLines={1}
              style={styles.channelTitle}
              testID={`home-feed-row-subtitle-${row.id}`}
            >
              {channelLabel}
            </Text>
          ) : null}
          <Text numberOfLines={2} style={styles.title} testID={`home-feed-row-title-${row.id}`}>
            {row.title}
          </Text>
          {updatedLabel !== null ? (
            <Text numberOfLines={1} style={styles.date} testID={`home-feed-row-updated-${row.id}`}>
              {updatedLabel}
            </Text>
          ) : null}
          {metadataSegments.length > 0 ? (
            <View style={styles.metadataRow}>
              {metadataSegments.map((segment) =>
                segment.emphasis ? (
                  <Badge
                    key={segment.name}
                    label={segment.text}
                    testID={`home-feed-row-${segment.name}-${row.id}`}
                    tone="accent"
                  />
                ) : (
                  <Text
                    key={segment.name}
                    style={styles.metadataText}
                    testID={`home-feed-row-${segment.name}-${row.id}`}
                  >
                    {segment.text}
                  </Text>
                )
              )}
            </View>
          ) : null}
        </View>
        {download !== undefined ? (
          <DownloadRowControl item={download.item} testID={download.testID} />
        ) : null}
      </View>

      {description !== null ? (
        <Text numberOfLines={2} style={styles.description} testID={`home-feed-row-description-${row.id}`}>
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
    </Pressable>
  );
}
