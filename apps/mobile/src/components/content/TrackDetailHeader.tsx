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

export type TrackDetailHeaderProps = {
  /** Album or feed name; a link when `onAlbumPress` is set. */
  albumTitle: string;
  /** Feed URL of a private Add by RSS feed's artwork; set wherever `artworkHeaders` is set. */
  artworkAddByRssFeedUrl?: string | null;
  artworkHeaders?: Record<string, string>;
  artworkUri: string | null;
  dateLabel: string | null;
  /** Drives the one-tap download control left of More; null hides it. */
  downloadItem: DTOItem | null;
  durationLabel: string | null;
  /** Suffix for the play bar ids and the playback match. */
  mediaIdText: string;
  moreActions: MediaRowMoreAction[];
  onAlbumPress?: () => void;
  onPlayPress: () => void;
  testIDPrefix: string;
  title: string;
  /** Largest original for the image viewer; defaults to `artworkUri` when omitted. */
  viewerUri?: string | null;
};

/**
 * The track page header: full-width artwork, an album link, the title, the date, and the play
 * bar with download immediately left of More. Shared by the track page and the Add by RSS track
 * page.
 */
export function TrackDetailHeader({
  albumTitle,
  artworkAddByRssFeedUrl,
  artworkHeaders,
  artworkUri,
  dateLabel,
  downloadItem,
  durationLabel,
  mediaIdText,
  moreActions,
  onAlbumPress,
  onPlayPress,
  testIDPrefix,
  title,
  viewerUri,
}: TrackDetailHeaderProps) {
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
        root: {
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.md,
        },
        subtitleLink: {
          ...typography.heading,
          color: tokens.text.link,
        },
        subtitleMuted: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
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

  const downloadControl =
    downloadItem !== null ? (
      <DownloadRowControl
        completeTestID={`${testIDPrefix}-download-complete`}
        item={downloadItem}
        testID={`${testIDPrefix}-download`}
      />
    ) : null;

  return (
    <View accessible={false} style={styles.root} testID={`${testIDPrefix}-playback-chrome`}>
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
        {onAlbumPress !== undefined ? (
          <Pressable
            accessibilityLabel={albumTitle}
            accessibilityRole="link"
            onPress={onAlbumPress}
            testID={`${testIDPrefix}-album-title`}
          >
            <Text style={styles.subtitleLink}>{albumTitle}</Text>
          </Pressable>
        ) : (
          <Text style={styles.subtitleMuted} testID={`${testIDPrefix}-album-title`}>
            {albumTitle}
          </Text>
        )}
        <Text accessibilityRole="header" style={styles.title} testID={`${testIDPrefix}-title`}>
          {title}
        </Text>
        {dateLabel !== null ? (
          <Text style={styles.date} testID={`${testIDPrefix}-date`}>
            {dateLabel}
          </Text>
        ) : null}
      </View>
      <View style={styles.playChrome}>
        <MediaRowActions
          appearance="icons"
          beforeMore={downloadControl}
          durationLabel={durationLabel}
          durationTestID={`${testIDPrefix}-duration-${mediaIdText}`}
          idSuffix={`-${mediaIdText}`}
          moreActions={moreActions}
          moreTestID={`${testIDPrefix}-more-${mediaIdText}`}
          onPlayPress={onPlayPress}
          playbackMediaId={mediaIdText}
          playLabel={t('media_player.play')}
          playTestID={`${testIDPrefix}-play-${mediaIdText}`}
        />
      </View>
    </View>
  );
}
