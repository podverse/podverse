import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOItemChapter } from '@podverse/helpers/dto';

import { resolveNowPlayingSegment } from '../../playback/nowPlayingSegment';
import { usePlaybackProgress, usePlaybackSession } from '../../playback/PlaybackProvider';
import { FULL_PLAYER_SEGMENT_BAND_HEIGHT } from '../../screens/player/fullPlayerLayout';
import { useTheme } from '../../theme/useTheme';

const CONDENSED_ICON_SIZE = 14;

const segmentIcon = (
  kind: 'chapter' | 'clip' | 'official-clip'
): ComponentProps<typeof Ionicons>['name'] => {
  switch (kind) {
    case 'chapter':
      return 'bookmark-outline';
    case 'clip':
      return 'cut-outline';
    case 'official-clip':
      return 'mic-outline';
  }
};

type FullPlayerSegmentBandProps = {
  chapters: DTOItemChapter[];
};

/**
 * Names the clip, official clip, or chapter under the playhead, in the row below the artwork. The
 * row keeps its height with nothing to name, so a chapter arriving fades in without moving the
 * artwork above it or the transport below it. Subscribes to progress so the full-player shell can
 * stay off the tick path.
 */
export function FullPlayerSegmentBand({ chapters }: FullPlayerSegmentBandProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const { activeTarget } = usePlaybackSession();
  const { positionSeconds } = usePlaybackProgress();
  const segment = resolveNowPlayingSegment({
    chapters,
    positionSeconds,
    target: activeTarget,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        segmentBand: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          height: FULL_PLAYER_SEGMENT_BAND_HEIGHT,
          justifyContent: 'center',
        },
        segmentText: {
          color: themeStyles.textSecondary.color,
          flexShrink: 1,
          fontSize: 13,
          minWidth: 0,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.segmentBand} testID="full-player-segment-band">
      {segment !== null ? (
        <>
          <Ionicons
            color={themeStyles.textSecondary.color}
            name={segmentIcon(segment.kind)}
            size={CONDENSED_ICON_SIZE}
          />
          <Text numberOfLines={1} style={styles.segmentText} testID="full-player-segment-title">
            {segment.title}
          </Text>
        </>
      ) : null}
    </View>
  );
}
