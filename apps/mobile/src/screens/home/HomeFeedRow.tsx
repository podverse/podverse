import type { ReactNode } from 'react';
import { memo, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
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
import { perfCount } from '../../lib/perf/perfSpans';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { clipListTimeRangeLabel } from '../../lib/rows/homeRowMappers';
import { usePlaybackRow } from '../../playback/PlaybackProvider';
import {
  LIST_ROW_ARTWORK_SIZE,
  LIST_ROW_SHOW_VERTICAL_INSET,
  listRowArtworkGap,
  listRowDescriptionGap,
  listRowVerticalPadding,
} from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { DirectoryMediaType } from '../browse/browseTypes';
import { isPlayableDirectoryMediaType } from '../browse/browseTypes';
import type { HomeFeedRowData } from './homeFeedData';
import { resolveHomeFeedRowDownload } from './homeFeedRowDownload';
import { isShareOnlyLivestreamRow, resolveItemRowLiveStatus } from './homeFeedRowLiveStatus';
import type { HomeRowMetadata } from './homeRowMetadata';
import { epochMsFromRowUpdatedAt, itemRowShowsUnseenDot } from './itemUnseen';
import type { QueueActionPosition } from './useHomeRowPlayback';

type HomeFeedRowProps = {
  mediaType: DirectoryMediaType;
  onPress: (row: HomeFeedRowData) => void;
  /** Omit for rows that cannot be queued. */
  onQueuePress?: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onPlayPress: (row: HomeFeedRowData) => void;
  /** Optional action controls for locally-backed resources with a different playback path. */
  customActions?: ReactNode;
  /** When provided, adds an "Add to Playlist" more-action. Omit for unsupported kinds. */
  onAddToPlaylistPress?: (row: HomeFeedRowData) => void;
  /** When provided, adds a "Mark as Played" more-action. */
  onMarkAsPlayedPress?: (row: HomeFeedRowData) => void;
  /** When provided, adds a "Share" more-action. */
  onSharePress?: (row: HomeFeedRowData) => void;
  /** Additional more-menu actions shown before the standard queue/download/share actions. */
  extraMoreActions?: MediaRowMoreAction[];
  /** Track lists: open TrackDetail from More. */
  onGoToTrackPress?: (row: HomeFeedRowData) => void;
  /** Track lists: open the parent album or artist from More. */
  onGoToChannelPress?: (row: HomeFeedRowData) => void;
  /**
   * The item this row stands for. Supplying it puts a one-tap download control on the row; the
   * control decides whether there is anything to offer, so a livestream or HLS-only item renders
   * no affordance. `downloadTestID` is required alongside it.
   */
  downloadItem?: DTOItem;
  downloadTestID?: string;
  row: HomeFeedRowData;
  /**
   * Timestamp stored before this visit marked the subscription seen. Undefined or null shows no
   * item dots. A number shows the new-content dot on items published after it. Channel rows
   * ignore it; their dot stays in the side rail.
   */
  itemLastSeenAtMs?: number | null;
  testID?: string;
  /** Play button testID in the default action band; defaults to `home-row-play-${row.id}`. */
  playTestID?: string;
  /**
   * When true (default), show list artwork and, unless `showContextLine` says otherwise, the
   * channel/context line above the title. When false, omit artwork so an in-channel screen does
   * not repeat the header's identity on every row.
   */
  showChannelContext?: boolean;
  /**
   * When set, controls the context line independently of artwork. Podcast clip rows name the
   * episode without repeating channel art. Defaults to `showChannelContext`.
   */
  showContextLine?: boolean;
  /** Merged onto the row container — use to match a parent surface. */
  style?: StyleProp<ViewStyle>;
  /**
   * Far-right content inside the row press target (for example a decorative reorder grip).
   * Vertically centered beside the row body; stays part of the same tap and long-press.
   */
  trailing?: ReactNode;
};

/** Title line box. The item-row unseen slot uses the same height so the dot sits on that line. */
const TITLE_LINE_HEIGHT = 26;

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    artworkWrap: {
      height: LIST_ROW_ARTWORK_SIZE,
      width: LIST_ROW_ARTWORK_SIZE,
    },
    channelTitle: {
      ...typography.body,
      color: themeStyles.textPrimary.color,
    },
    dateRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    description: {
      color: themeStyles.textSecondary.color,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
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
    itemUnseenSlot: {
      height: TITLE_LINE_HEIGHT,
      justifyContent: 'flex-start',
      width: UNSEEN_INDICATOR_SIZE,
    },
    // Solid fill: this pill sits on cover art; the translucent danger tone washes out on bright images.
    liveBadge: {
      alignSelf: 'center',
      backgroundColor: tokens.button.dangerBg,
      borderColor: tokens.button.dangerBg,
    },
    liveOnArtwork: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: {
      alignItems: 'stretch',
      backgroundColor: themeStyles.screen.backgroundColor,
      borderTopColor: themeStyles.border.borderColor,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    rowActions: {
      marginTop: tokens.spacing.sm,
    },
    rowActionsEnd: {
      alignItems: 'flex-end',
    },
    rowBody: {
      flex: 1,
      gap: tokens.spacing.md,
      minWidth: 0,
      ...listRowVerticalPadding(tokens.spacing.lg),
    },
    showRowBody: {
      ...listRowVerticalPadding(LIST_ROW_SHOW_VERTICAL_INSET),
    },
    unseenRail: {
      alignItems: 'center',
      justifyContent: 'center',
      width: UNSEEN_INDICATOR_SIZE,
    },
    showDate: {
      color: tokens.text.link,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
    showFooter: {
      color: themeStyles.textSecondary.color,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    showFooterReserve: {
      height: 20,
    },
    textGroup: {
      gap: listRowDescriptionGap(tokens.spacing),
    },
    title: {
      ...typography.subheading,
      color: themeStyles.textPrimary.color,
      fontSize: 19,
      fontWeight: '400',
      lineHeight: TITLE_LINE_HEIGHT,
    },
    titleFlex: {
      flex: 1,
    },
    titleLine: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    trailing: {
      alignSelf: 'center',
    },
  });

type ChannelListMediaType = 'albums' | 'artists' | 'podcasts';

const isChannelListMediaType = (mediaType: DirectoryMediaType): mediaType is ChannelListMediaType =>
  mediaType === 'podcasts' || mediaType === 'albums' || mediaType === 'artists';

type ChannelListFooter =
  | { kind: 'author'; label: string }
  | { kind: 'count'; label: string }
  | { kind: 'none' }
  | { kind: 'reserve' };

/**
 * Bottom line of a podcast, album, or artist row.
 *
 * A directory show draws its finished-download count once metadata exists, including zero, and
 * reserves that line until the count query returns so the title does not jump. Add by RSS shows
 * have no count line and do not reserve one. Podcasts and albums with no download metadata put
 * the author here when it is non-empty. Artists with no download metadata have no third line.
 */
const channelListFooter = (
  mediaType: ChannelListMediaType,
  row: HomeFeedRowData,
  formatCount: (count: number) => string
): ChannelListFooter => {
  if (row.source === 'addByRss') {
    return { kind: 'none' };
  }
  if (row.metadata !== undefined) {
    return { kind: 'count', label: formatCount(row.metadata.downloadedCount) };
  }
  if (row.source === 'directory') {
    return { kind: 'reserve' };
  }
  if (mediaType === 'artists') {
    return { kind: 'none' };
  }
  const author = row.subtitle === null ? '' : row.subtitle.trim();
  if (author.length === 0) {
    return { kind: 'none' };
  }
  return { kind: 'author', label: author };
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
    const epochMs = epochMsFromRowUpdatedAt(source);
    if (epochMs === null) {
      return null;
    }

    return formatDateAbbrev(new Date(epochMs), i18n.language);
  }, [fallbackMs, i18n.language, updatedAt]);
};

const useDurationLabel = (duration: string | null | undefined, hidden: boolean): string | null => {
  const { t } = useTranslation();

  return useMemo(() => {
    if (hidden) {
      return null;
    }
    if (duration === undefined || duration === null || duration.length === 0) {
      return null;
    }
    return formatPlaybackDurationLabel(Number(duration), t);
  }, [duration, hidden, t]);
};

const useClipRangeLabel = (row: HomeFeedRowData): string | null => {
  const { t } = useTranslation();

  return useMemo(() => {
    if (
      row.durationLabel !== undefined &&
      row.durationLabel !== null &&
      row.durationLabel.length > 0
    ) {
      return row.durationLabel;
    }
    return clipListTimeRangeLabel(row.clipStartTime, row.clipEndTime, (timeStart, timeEnd) =>
      t('features.clip.clip_time_range', { hhmmssEnd: timeEnd, hhmmssStart: timeStart })
    );
  }, [row.clipEndTime, row.clipStartTime, row.durationLabel, t]);
};

/**
 * Shared list row for channels and playable items.
 *
 * Episode and clip rows use three bands (identity, description, play/duration/download/more) so a
 * Home Episodes list can show channel context without stacking every control in one column, and an
 * in-channel list can drop artwork without inventing a second row component. The one-tap download
 * sits in the play band, immediately left of More, so the title uses the header width. The
 * description sits under the identity block with `listRowDescriptionGap` (`spacing.base`), the
 * same width as the gap beside the artwork, so the paragraph keeps that clearance under the image.
 * The play, duration, and progress band stays under that group. `showContextLine` keeps a parent
 * title when that artwork stays hidden.
 * Track rows omit the play band: download and More sit in the identity row, vertically centered
 * with the artwork and text, download immediately left of More. The row press still starts
 * playback. A livestream item row states Live, Scheduled, or Ended in the play band where an
 * episode row shows its duration: beside Play, or
 * at the band's leading edge when the row has no Play. Channel rows keep Live on the artwork and
 * never mount a More ellipsis; their actions stay on swipe-left (and the matching grid long-press).
 * A livestream row's More menu is Share only.
 */
export const HomeFeedRow = memo(function HomeFeedRow({
  mediaType,
  onPress,
  onPlayPress,
  onQueuePress,
  onAddToPlaylistPress,
  onMarkAsPlayedPress,
  onSharePress,
  extraMoreActions,
  onGoToTrackPress,
  onGoToChannelPress,
  customActions,
  downloadItem,
  downloadTestID,
  row,
  itemLastSeenAtMs,
  testID,
  playTestID,
  showChannelContext = true,
  showContextLine,
  style,
  trailing,
}: HomeFeedRowProps) {
  const { t } = useTranslation();
  // One count per mount. A later render of the same instance is not another mount.
  useEffect(() => {
    perfCount('home.row.mount');
  }, []);
  perfCount('home.row.render');
  const styles = useThemedStyles(createStyles);
  const isPlayable = row.playable !== false && isPlayableDirectoryMediaType(mediaType);
  const removedLabel = row.removed === true ? t('info.removed.content_removed') : null;
  const showInlineTrackMore = customActions === undefined && mediaType === 'tracks';
  const { liveLabel, unseenSpoken } = useMetadataAnnouncements(row.metadata);
  const unseenBadge = row.metadata?.unseenBadge ?? null;
  const isChannelList = isChannelListMediaType(mediaType);
  const updatedLabel = useUpdatedLabel(row.updatedAt, row.metadata?.latestItemPubDateMs);
  const isLive = row.metadata?.isLive === true;
  const showItemDot = itemRowShowsUnseenDot(isChannelList, row.updatedAt, itemLastSeenAtMs);
  const showArtwork = showChannelContext && row.removed !== true;
  const contextLineVisible = showContextLine ?? showChannelContext;
  const itemLiveStatus = useMemo(
    () => resolveItemRowLiveStatus(isChannelList, isLive, row.liveStatusId),
    [isChannelList, isLive, row.liveStatusId]
  );
  const itemLiveStatusLabel = itemLiveStatus === null ? null : t(itemLiveStatus.labelKey);
  const contextSubtitle = row.subtitle !== null && row.subtitle.length > 0 ? row.subtitle : null;
  const channelLabel = isChannelList || !contextLineVisible ? null : contextSubtitle;
  /** A channel row with no artwork states Live on its date line. */
  const dateLineLiveLabel = isChannelList && !showArtwork ? liveLabel : null;
  const clipRangeLabel = useClipRangeLabel(row);
  const episodeDurationLabel = useDurationLabel(
    clipRangeLabel !== null ? null : row.duration,
    itemLiveStatus !== null
  );
  const durationLabel = itemLiveStatus !== null ? null : (clipRangeLabel ?? episodeDurationLabel);
  const { activeTarget, enclosureSelectedParams } = usePlaybackRow();
  const download = resolveHomeFeedRowDownload(downloadItem, downloadTestID);
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
  const channelFooter = isChannelList
    ? channelListFooter(mediaType, row, (count) =>
        t('subscriptions.row.downloaded_count', { count })
      )
    : null;
  const footerLabel =
    channelFooter?.kind === 'count' || channelFooter?.kind === 'author'
      ? channelFooter.label
      : null;

  const moreActions = useMemo(() => {
    // Podcast, album, and artist rows use swipe-left (and grid long-press), never More.
    if (isChannelList) {
      return [];
    }
    // A livestream has no fixed length to queue behind or finish. Share is the only more action.
    const isLivestreamRow = isShareOnlyLivestreamRow(mediaType, row.liveStatusId);
    const standardActions = buildMediaRowMoreActions(
      t,
      {
        onAddToPlaylist:
          !isLivestreamRow && onAddToPlaylistPress !== undefined
            ? () => {
                onAddToPlaylistPress(row);
              }
            : undefined,
        onMarkAsPlayed:
          !isLivestreamRow && onMarkAsPlayedPress !== undefined
            ? () => {
                onMarkAsPlayedPress(row);
              }
            : undefined,
        onQueueLast:
          !isLivestreamRow && onQueuePress !== undefined
            ? () => {
                onQueuePress(row, 'last');
              }
            : undefined,
        onQueueNext:
          !isLivestreamRow && onQueuePress !== undefined
            ? () => {
                onQueuePress(row, 'next');
              }
            : undefined,
        onGoToTrack:
          mediaType === 'tracks' && onGoToTrackPress !== undefined
            ? () => {
                onGoToTrackPress(row);
              }
            : undefined,
        onGoToAlbum:
          mediaType === 'tracks' &&
          onGoToChannelPress !== undefined &&
          row.channelId !== undefined &&
          row.channelKind !== 'artists'
            ? () => {
                onGoToChannelPress(row);
              }
            : undefined,
        onGoToArtist:
          mediaType === 'tracks' &&
          onGoToChannelPress !== undefined &&
          row.channelId !== undefined &&
          row.channelKind === 'artists'
            ? () => {
                onGoToChannelPress(row);
              }
            : undefined,
        onDownload:
          !isLivestreamRow && isDownloadable
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
    if (isLivestreamRow) {
      return standardActions;
    }
    return extraMoreActions !== undefined
      ? [...extraMoreActions, ...standardActions]
      : standardActions;
  }, [
    downloadStatus,
    extraMoreActions,
    isChannelList,
    isDownloadable,
    mediaType,
    onGoToChannelPress,
    onGoToTrackPress,
    onAddToPlaylistPress,
    onMarkAsPlayedPress,
    onQueuePress,
    onSharePress,
    removeDownload,
    row,
    startDownload,
    t,
  ]);
  const showPlayBand = mediaType !== 'tracks' && isPlayable;
  const showScheduledLivestreamMore =
    mediaType === 'livestreams' && !isPlayable && moreActions.length > 0;
  const showLiveStatusBand = itemLiveStatus !== null && mediaType !== 'tracks';

  const downloadControl =
    download !== undefined && mediaType !== 'livestreams' ? (
      <DownloadRowControl item={download.item} testID={download.testID} />
    ) : undefined;

  const dateLine = (dateStyle: TextStyle) =>
    updatedLabel !== null || dateLineLiveLabel !== null ? (
      <View style={styles.dateRow}>
        {dateLineLiveLabel !== null ? (
          <Badge label={dateLineLiveLabel} testID={`home-feed-row-live-${row.id}`} tone="danger" />
        ) : null}
        {updatedLabel !== null ? (
          <Text numberOfLines={1} style={dateStyle} testID={`home-feed-row-updated-${row.id}`}>
            {updatedLabel}
          </Text>
        ) : null}
      </View>
    ) : null;

  return (
    <Pressable
      // Composed rather than left to the default child walk, so the badges are heard as part of a
      // sentence about this show instead of as loose fragments after its title.
      accessibilityLabel={[
        ...(isChannelList
          ? [updatedLabel, row.title, footerLabel]
          : [channelLabel, removedLabel, row.title, updatedLabel]),
        description,
        durationLabel,
        isChannelList ? liveLabel : itemLiveStatusLabel,
        unseenSpoken,
        showItemDot ? t('subscriptions.row.unseen_indicator_aria') : null,
      ]
        .filter((part) => part !== null && part.length > 0)
        .join(', ')}
      accessibilityRole="button"
      onPress={() => {
        onPress(row);
      }}
      style={[styles.row, style]}
      testID={testID ?? `home-feed-row-${row.id}`}
    >
      <View style={[styles.rowBody, isChannelList ? styles.showRowBody : null]}>
        <View style={styles.textGroup}>
          <View style={styles.identityRow}>
            {showArtwork ? (
              <View style={styles.artworkWrap}>
                <CoverImage
                  decodeEdge={LIST_ROW_ARTWORK_SIZE}
                  opensViewer={false}
                  style={styles.image}
                  uri={row.imageUrl}
                />
                {isChannelList && liveLabel !== null ? (
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
              {isChannelList ? dateLine(styles.showDate) : null}
              {channelLabel !== null ? (
                <Text
                  numberOfLines={1}
                  style={styles.channelTitle}
                  testID={`home-feed-row-subtitle-${row.id}`}
                >
                  {channelLabel}
                </Text>
              ) : null}
              {removedLabel !== null ? (
                <Text
                  numberOfLines={1}
                  style={styles.channelTitle}
                  testID={`home-feed-row-removed-${row.id}`}
                >
                  {removedLabel}
                </Text>
              ) : null}
              {showItemDot ? (
                <View style={styles.titleLine}>
                  <Text
                    numberOfLines={2}
                    style={[styles.title, styles.titleFlex]}
                    testID={`home-feed-row-title-${row.id}`}
                  >
                    {row.title}
                  </Text>
                  <View pointerEvents="none" style={styles.itemUnseenSlot}>
                    <UnseenIndicator testID={`home-feed-row-unseen-${row.id}`} />
                  </View>
                </View>
              ) : (
                <Text
                  numberOfLines={2}
                  style={styles.title}
                  testID={`home-feed-row-title-${row.id}`}
                >
                  {row.title}
                </Text>
              )}
              {isChannelList ? null : dateLine(styles.showDate)}
              {channelFooter !== null && channelFooter.kind === 'count' ? (
                <Text
                  numberOfLines={1}
                  style={styles.showFooter}
                  testID={`home-feed-row-downloaded-${row.id}`}
                >
                  {channelFooter.label}
                </Text>
              ) : null}
              {channelFooter !== null && channelFooter.kind === 'author' ? (
                <Text
                  numberOfLines={1}
                  style={styles.showFooter}
                  testID={`home-feed-row-subtitle-${row.id}`}
                >
                  {channelFooter.label}
                </Text>
              ) : null}
              {channelFooter !== null && channelFooter.kind === 'reserve' ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={styles.showFooterReserve}
                />
              ) : null}
            </View>
            {showInlineTrackMore ? (
              <MediaRowActions
                appearance="icons"
                beforeMore={downloadControl}
                idSuffix={`-${row.id}`}
                moreActions={moreActions}
                moreTestID={`home-row-more-${row.id}`}
                showPlayButton={false}
              />
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
        </View>

        {customActions !== undefined ? (
          customActions
        ) : showPlayBand ||
          showScheduledLivestreamMore ||
          showLiveStatusBand ||
          moreActions.length > 0 ||
          (downloadControl !== undefined && !showInlineTrackMore) ? (
          <View
            style={[
              styles.rowActions,
              showPlayBand || showLiveStatusBand ? null : styles.rowActionsEnd,
            ]}
          >
            <MediaRowActions
              appearance="icons"
              beforeMore={showInlineTrackMore ? undefined : downloadControl}
              durationLabel={durationLabel}
              durationTestID={`home-feed-row-duration-${row.id}`}
              idSuffix={`-${row.id}`}
              moreActions={moreActions}
              moreTestID={`home-row-more-${row.id}`}
              onPlayPress={() => {
                onPlayPress(row);
              }}
              playbackMediaId={row.playbackMediaId ?? row.id}
              playLabel={t('media_player.play')}
              playTestID={playTestID ?? `home-row-play-${row.id}`}
              showPlayButton={showPlayBand}
              statusLabel={showLiveStatusBand ? itemLiveStatusLabel : null}
              statusTestID={
                itemLiveStatus === null ? undefined : `${itemLiveStatus.testIDPrefix}-${row.id}`
              }
              statusTone={itemLiveStatus?.tone}
            />
          </View>
        ) : null}
      </View>
      {isChannelList && unseenBadge !== null ? (
        <View pointerEvents="none" style={styles.unseenRail}>
          <UnseenIndicator testID={`home-feed-row-unseen-${row.id}`} />
        </View>
      ) : null}
      {trailing !== undefined ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
});
