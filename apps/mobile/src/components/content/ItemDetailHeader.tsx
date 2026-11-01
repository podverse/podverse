import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOItem } from '@podverse/helpers';

import { itemDetailArtworkEdge, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import { DownloadRowControl } from '../download/DownloadRowControl';
import type { MediaRowMoreAction } from '../player/MediaRowActions';
import { MediaRowActions } from '../player/MediaRowActions';
import { CoverImage } from '../primitives';

export type ItemDetailHeaderProps = {
  /** Feed URL of a private Add by RSS feed's artwork; set wherever `artworkHeaders` is set. */
  artworkAddByRssFeedUrl?: string | null;
  artworkHeaders?: Record<string, string>;
  artworkUri: string | null;
  channelTitle: string;
  dateLabel: string | null;
  /** Drives the one-tap download control left of More; null hides it. */
  downloadItem: DTOItem | null;
  durationLabel: string | null;
  /** Suffix for the play bar ids and the playback match, as list rows use. */
  mediaIdText: string;
  /** Playback match when it differs from `mediaIdText` (Add by RSS: the item hash). */
  playbackMediaId?: string;
  moreActions: MediaRowMoreAction[];
  onChannelPress?: () => void;
  /** Omit when the item cannot play now, such as a scheduled livestream. */
  onPlayPress?: () => void;
  testIDPrefix: string;
  title: string;
  viewerUri: string | null;
};

/**
 * Artwork, titles, pub date, and the play bar shared by the podcast episode page and the Add by
 * RSS episode page.
 *
 * Artwork is a full-width square on phone (capped and centered on tablet). Podcast name, episode
 * title, and pub date stack under that so a long title grows the header instead of covering the
 * chips below. The play bar is `MediaRowActions` in the icon appearance the list rows use, with
 * download immediately left of More. It is omitted when there is no play handler, no duration, no
 * download, and no More actions, so a scheduled livestream does not show an empty bar.
 */
export function ItemDetailHeader({
  artworkAddByRssFeedUrl,
  artworkHeaders,
  artworkUri,
  channelTitle,
  dateLabel,
  downloadItem,
  durationLabel,
  mediaIdText,
  playbackMediaId,
  moreActions,
  onChannelPress,
  onPlayPress,
  testIDPrefix,
  title,
  viewerUri,
}: ItemDetailHeaderProps) {
  const { t } = useTranslation();
  const { isTablet, width } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const pageGutter = Number(screenBodyInsets(tokens.spacing).paddingHorizontal ?? 0);
  const artworkEdge = itemDetailArtworkEdge(width, isTablet);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          height: artworkEdge,
          width: artworkEdge,
        },
        artworkRow: {
          alignItems: 'center',
          marginHorizontal: isTablet ? 0 : -pageGutter,
          width: isTablet ? '100%' : width,
        },
        date: {
          color: tokens.text.link,
          fontSize: 14,
          fontWeight: '700',
          lineHeight: 20,
        },
        playChrome: {
          marginTop: tokens.spacing.sm,
        },
        podcastTitle: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
        },
        podcastTitleLink: {
          ...typography.heading,
          color: tokens.text.link,
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
    [artworkEdge, isTablet, pageGutter, themeStyles, tokens, width]
  );

  const showPlayChrome =
    onPlayPress !== undefined ||
    durationLabel !== null ||
    moreActions.length > 0 ||
    downloadItem !== null;

  const downloadControl =
    downloadItem !== null ? (
      <DownloadRowControl
        completeTestID={`${testIDPrefix}-download-complete`}
        item={downloadItem}
        testID={`${testIDPrefix}-download`}
      />
    ) : null;

  const channelName =
    onChannelPress === undefined ? (
      <Text style={styles.podcastTitle} testID={`${testIDPrefix}-podcast-title`}>
        {channelTitle}
      </Text>
    ) : (
      <Pressable
        accessibilityLabel={channelTitle}
        accessibilityRole="link"
        onPress={onChannelPress}
        testID={`${testIDPrefix}-podcast-title`}
      >
        <Text style={styles.podcastTitleLink}>{channelTitle}</Text>
      </Pressable>
    );

  return (
    <View style={styles.root} testID={`${testIDPrefix}-header`}>
      <View style={styles.artworkRow}>
        <CoverImage
          accessibilityLabel={title}
          addByRssFeedUrl={artworkAddByRssFeedUrl}
          headers={artworkHeaders}
          style={styles.artwork}
          testID={`${testIDPrefix}-artwork`}
          uri={artworkUri}
          viewerUri={viewerUri}
        />
      </View>
      <View style={styles.titles}>
        {channelName}
        <Text accessibilityRole="header" style={styles.title} testID={`${testIDPrefix}-title`}>
          {title}
        </Text>
        {dateLabel !== null ? (
          <Text style={styles.date} testID={`${testIDPrefix}-date`}>
            {dateLabel}
          </Text>
        ) : null}
      </View>
      {showPlayChrome ? (
        <View style={styles.playChrome} testID={`${testIDPrefix}-play-chrome`}>
          <MediaRowActions
            appearance="icons"
            beforeMore={downloadControl}
            durationLabel={durationLabel}
            durationTestID={`home-feed-row-duration-${mediaIdText}`}
            idSuffix={`-${mediaIdText}`}
            moreActions={moreActions}
            moreTestID={`home-row-more-${mediaIdText}`}
            onPlayPress={onPlayPress}
            playbackMediaId={playbackMediaId ?? mediaIdText}
            playLabel={t('media_player.play')}
            playTestID={`home-row-play-${mediaIdText}`}
          />
        </View>
      ) : null}
    </View>
  );
}
