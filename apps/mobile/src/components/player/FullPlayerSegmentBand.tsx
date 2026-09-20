import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

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
 * stay off the tick path.
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
          gap: tokens.spacing.md,
          height: FULL_PLAYER_SEGMENT_BAND_HEIGHT,
          justifyContent: 'center',
          minWidth: 0,
          width: '100%',
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

  const iconName = segment === null ? null : nowPlayingSegmentLeadingIcon(segment.kind);
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

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={segment === null ? undefined : 'text'}
      accessible={segment !== null}
      style={styles.segmentBand}
      testID="full-player-segment-band"
    >
      {segment !== null ? (
        <>
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
        </>
      ) : null}
    </View>
  );
}
