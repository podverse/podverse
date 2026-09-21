import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOItemChapter } from '@podverse/helpers/dto';
import { formatHHMMSS } from '@podverse/helpers/time';

import type { NowPlayingSegment } from '../../playback/nowPlayingSegment';
import {
  nowPlayingSegmentLabelKey,
  resolveNowPlayingSegment,
} from '../../playback/nowPlayingSegment';
import { usePlaybackProgress, usePlaybackSession } from '../../playback/PlaybackProvider';
import { usePlaybackScrubPreview } from '../../playback/playbackScrubPreviewStore';
import { FULL_PLAYER_SEGMENT_BAND_HEIGHT } from '../../screens/player/fullPlayerLayout';
import { useTheme } from '../../theme/useTheme';
import { MarqueeText } from '../primitives/MarqueeText';
import { ChapterLinkButton } from './ChapterLinkButton';
import { nowPlayingSegmentLeadingIcon } from './nowPlayingSegmentIcon';

const CONDENSED_ICON_SIZE = 14;

type FullPlayerSegmentBandProps = {
  chapters: DTOItemChapter[];
};

const formatSegmentTimeLabel = (
  segment: NowPlayingSegment,
  formatRange: (start: string, end: string) => string
): string | null => {
  if (segment.startTime === null) {
    return null;
  }
  const timeStart = formatHHMMSS(Number(segment.startTime));
  if (segment.endTime === null) {
    return timeStart;
  }
  return formatRange(timeStart, formatHHMMSS(Number(segment.endTime)));
};

/**
 * Names the clip, official clip, or chapter under the playhead, in the row below the artwork. The
 * row keeps its height with nothing to name, so a chapter arriving fades in without moving the
 * artwork above it or the transport below it. Subscribes to progress so the full-player shell can
 * stay off the tick path. When the named segment is a chapter with a link, the whole band opens
 * that URL; the link glyph is only a marker.
 */
export function FullPlayerSegmentBand({ chapters }: FullPlayerSegmentBandProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { activeTarget } = usePlaybackSession();
  const { positionSeconds } = usePlaybackProgress();
  const previewPositionSeconds = usePlaybackScrubPreview();
  const segment = resolveNowPlayingSegment({
    chapters,
    positionSeconds,
    previewPositionSeconds,
    target: activeTarget,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        segmentBand: {
          alignItems: 'center',
          height: FULL_PLAYER_SEGMENT_BAND_HEIGHT,
          justifyContent: 'center',
          minWidth: 0,
          width: '100%',
        },
        segmentCluster: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
          minWidth: 0,
          width: '100%',
        },
        segmentClusterPressed: {
          opacity: 0.7,
        },
        segmentCopy: {
          alignItems: 'center',
          flex: 1,
          gap: tokens.spacing.md,
          minWidth: 0,
        },
        segmentText: {
          color: themeStyles.textSecondary.color,
          fontSize: 18,
          fontWeight: '600',
          lineHeight: 22,
        },
        segmentTime: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          lineHeight: 16,
          textAlign: 'center',
        },
        segmentTitle: {
          flex: 1,
          minWidth: 0,
        },
        titleRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          minWidth: 0,
          width: '100%',
        },
      }),
    [themeStyles, tokens]
  );

  const chapterWebUrl = segment?.kind === 'chapter' ? segment.webUrl : null;

  const openChapterLink = useCallback(async () => {
    if (chapterWebUrl === null) {
      return;
    }
    try {
      await Linking.openURL(chapterWebUrl);
    } catch (error) {
      console.warn('Could not open a chapter link', chapterWebUrl, error);
    }
  }, [chapterWebUrl]);

  const iconName = segment === null ? null : nowPlayingSegmentLeadingIcon(segment.kind);
  const showChapterLink = chapterWebUrl !== null;
  const timeLabel =
    segment === null
      ? null
      : formatSegmentTimeLabel(segment, (timeStart, timeEnd) =>
          t('info.time.start_end', { timeEnd, timeStart })
        );
  const accessibilityLabel =
    segment === null
      ? undefined
      : timeLabel === null
        ? `${t(nowPlayingSegmentLabelKey(segment.kind))}: ${segment.title}`
        : `${t(nowPlayingSegmentLabelKey(segment.kind))}: ${segment.title}, ${timeLabel}`;
  const chapterLinkAccessibilityLabel =
    accessibilityLabel === undefined
      ? t('media_player.open_chapter_link')
      : `${accessibilityLabel}. ${t('media_player.open_chapter_link')}`;

  const copy =
    segment === null ? null : (
      <View pointerEvents="none" style={styles.segmentCopy}>
        <View style={styles.titleRow}>
          {iconName !== null ? (
            <Ionicons
              color={themeStyles.textSecondary.color}
              name={iconName}
              size={CONDENSED_ICON_SIZE}
            />
          ) : null}
          <View style={styles.segmentTitle}>
            <MarqueeText
              align={iconName === null ? 'center' : 'left'}
              style={styles.segmentText}
              testID="full-player-segment-title"
            >
              {segment.title}
            </MarqueeText>
          </View>
        </View>
        {timeLabel !== null ? (
          <Text numberOfLines={1} style={styles.segmentTime} testID="full-player-segment-time">
            {timeLabel}
          </Text>
        ) : null}
      </View>
    );

  return (
    <View pointerEvents="box-none" style={styles.segmentBand} testID="full-player-segment-band">
      {segment !== null && copy !== null ? (
        showChapterLink ? (
          <Pressable
            accessibilityLabel={chapterLinkAccessibilityLabel}
            accessibilityRole="link"
            onPress={() => {
              void openChapterLink();
            }}
            pointerEvents="auto"
            style={({ pressed }) => [
              styles.segmentCluster,
              pressed ? styles.segmentClusterPressed : null,
            ]}
            testID="full-player-chapter-link"
          >
            {copy}
            <ChapterLinkButton />
          </Pressable>
        ) : (
          <View
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="text"
            accessible
            pointerEvents="none"
            style={styles.segmentCluster}
          >
            {copy}
          </View>
        )
      ) : null}
    </View>
  );
}
