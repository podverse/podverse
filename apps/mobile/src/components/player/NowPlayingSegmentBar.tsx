import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { breakpoints } from '@podverse/design-tokens';

import type { NowPlayingSegmentKind } from '../../playback/nowPlayingSegment';
import { resolveNowPlayingSegment } from '../../playback/nowPlayingSegment';
import { usePlaybackProgress, usePlaybackSession } from '../../playback/PlaybackProvider';
import { useNowPlayingChapters } from '../../playback/useNowPlayingChapters';
import { typography } from '../../theme/typography';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';

const SEGMENT_ICON_SIZE = 14;

const segmentIcon = (kind: NowPlayingSegmentKind): ComponentProps<typeof Ionicons>['name'] => {
  switch (kind) {
    case 'chapter':
      return 'bookmark-outline';
    case 'clip':
      return 'cut-outline';
    case 'official-clip':
      return 'mic-outline';
  }
};

const segmentLabelKey = (kind: NowPlayingSegmentKind): string => {
  switch (kind) {
    case 'chapter':
      return 'media_player.now_playing_chapter';
    case 'clip':
      return 'media_player.now_playing_clip';
    case 'official-clip':
      return 'media_player.now_playing_official_clip';
  }
};

/**
 * Slim strip naming the clip, official clip, or chapter playing inside the current episode.
 * Chapters come from {@link useNowPlayingChapters}; the playhead drives which chapter is named.
 */
export function NowPlayingSegmentBar() {
  const { t } = useTranslation();
  const { isTablet } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const { activeTarget } = usePlaybackSession();
  const { positionSeconds } = usePlaybackProgress();
  const { chapters } = useNowPlayingChapters();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          backgroundColor: tokens.background.tertiary,
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          flexDirection: 'row',
          gap: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
        },
        containerTablet: {
          alignSelf: 'center',
          maxWidth: breakpoints.lg,
          width: '100%',
        },
        label: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          flex: 1,
        },
      }),
    [themeStyles, tokens]
  );

  const segment = resolveNowPlayingSegment({ chapters, positionSeconds, target: activeTarget });

  if (segment === null) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`${t(segmentLabelKey(segment.kind))}: ${segment.title}`}
      accessibilityRole="text"
      accessible
      style={[styles.container, isTablet ? styles.containerTablet : undefined]}
      testID="now-playing-segment-bar"
    >
      <Ionicons
        color={themeStyles.textSecondary.color}
        name={segmentIcon(segment.kind)}
        size={SEGMENT_ICON_SIZE}
      />
      <Text numberOfLines={1} style={styles.label} testID="now-playing-segment-title">
        {segment.title}
      </Text>
    </View>
  );
}
