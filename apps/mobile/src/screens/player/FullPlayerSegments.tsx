import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers/dto';
import { formatHHMMSS } from '@podverse/helpers/time';

import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useNowPlayingChapters } from '../../playback/useNowPlayingChapters';
import { useTheme } from '../../theme/useTheme';

type FullPlayerSegmentsProps = {
  item: DTOItem;
  channel: DTOChannel;
};

/**
 * Full player chapter/soundbite segments. Soundbites come embedded on the item DTO; chapters come
 * from `useNowPlayingChapters`. Tap a segment to start bounded playback through `playChapter` /
 * `playSoundbite`. Renders nothing when the item has neither chapters nor soundbites.
 */
export function FullPlayerSegments({ channel, item }: FullPlayerSegmentsProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { playChapter, playSoundbite } = usePlaybackSession();
  const { chapters } = useNowPlayingChapters();

  const soundbites = item.item_soundbites ?? [];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        heading: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
          marginBottom: tokens.spacing.sm,
          marginTop: tokens.spacing.md,
        },
        row: {
          alignItems: 'center',
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: tokens.spacing.md,
          justifyContent: 'space-between',
          paddingVertical: tokens.spacing.sm,
        },
        rowTime: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
        },
        rowTitle: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 14,
        },
      }),
    [themeStyles, tokens]
  );

  if (chapters.length === 0 && soundbites.length === 0) {
    return null;
  }

  return (
    <View testID="full-player-segments">
      {chapters.length > 0 ? (
        <View testID="full-player-chapters">
          <Text accessibilityRole="header" style={styles.heading}>
            {t('info.chapter.chapters')}
          </Text>
          {chapters.map((chapter) => (
            <Pressable
              accessibilityRole="button"
              key={chapter.id_text}
              onPress={() => {
                void playChapter(chapter, item, channel);
              }}
              style={styles.row}
              testID={`full-player-chapter-${chapter.id_text}`}
            >
              <Text numberOfLines={1} style={styles.rowTitle}>
                {chapter.title ?? chapter.id_text}
              </Text>
              <Text style={styles.rowTime}>
                {Number.isFinite(Number(chapter.start_time))
                  ? formatHHMMSS(Number(chapter.start_time))
                  : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {soundbites.length > 0 ? (
        <View testID="full-player-soundbites">
          <Text accessibilityRole="header" style={styles.heading}>
            {t('info.soundbite.official_clips')}
          </Text>
          {soundbites.map((soundbite, index) => (
            <Pressable
              accessibilityRole="button"
              key={soundbite.id_text}
              onPress={() => {
                void playSoundbite(soundbite, item, channel);
              }}
              style={styles.row}
              testID={`full-player-soundbite-${soundbite.id_text}`}
            >
              <Text numberOfLines={1} style={styles.rowTitle}>
                {soundbite.title ?? `${t('info.soundbite.official_clip')} ${index + 1}`}
              </Text>
              <Text style={styles.rowTime}>
                {Number.isFinite(Number(soundbite.start_time))
                  ? formatHHMMSS(Number(soundbite.start_time))
                  : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
