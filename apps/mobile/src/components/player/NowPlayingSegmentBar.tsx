import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { breakpoints } from '@podverse/design-tokens';

import {
  nowPlayingSegmentLabelKey,
  resolveNowPlayingSegment,
} from '../../playback/nowPlayingSegment';
import { usePlaybackProgress, usePlaybackSession } from '../../playback/PlaybackProvider';
import { usePlaybackScrubPreview } from '../../playback/playbackScrubPreviewStore';
import { useNowPlayingChapters } from '../../playback/useNowPlayingChapters';
import { typography } from '../../theme/typography';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import { nowPlayingSegmentLeadingIcon } from './nowPlayingSegmentIcon';

const SEGMENT_ICON_SIZE = 14;

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
  const previewPositionSeconds = usePlaybackScrubPreview();
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
        labelCentered: {
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  const segment = resolveNowPlayingSegment({
    chapters,
    positionSeconds,
    previewPositionSeconds,
    target: activeTarget,
  });

  if (segment === null) {
    return null;
  }

  const iconName = nowPlayingSegmentLeadingIcon(segment.kind);

  return (
    <View
      accessibilityLabel={`${t(nowPlayingSegmentLabelKey(segment.kind))}: ${segment.title}`}
      accessibilityRole="text"
      accessible
      style={[styles.container, isTablet ? styles.containerTablet : undefined]}
      testID="now-playing-segment-bar"
    >
      {iconName !== null ? (
        <Ionicons
          color={themeStyles.textSecondary.color}
          name={iconName}
          size={SEGMENT_ICON_SIZE}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.label, iconName === null ? styles.labelCentered : null]}
        testID="now-playing-segment-title"
      >
        {segment.title}
      </Text>
    </View>
  );
}
