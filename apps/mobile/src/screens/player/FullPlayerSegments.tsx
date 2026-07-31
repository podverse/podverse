import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers/dto';
import { formatClock } from '@podverse/helpers/time';

import { useAuth } from '../../auth/AuthProvider';
import { segmentsRepository } from '../../data';
import { usePlayback } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';

type FullPlayerSegmentsProps = {
  item: DTOItem;
  channel: DTOChannel;
};

/**
 * Full player chapter/soundbite segments (Track 11.10). Soundbites come embedded on the item DTO;
 * chapters are fetched once via `segmentsRepository` when the item advertises a chapters feed. Tap
 * a segment to start bounded playback (Track 10.17) through `playChapter` / `playSoundbite`. Renders
 * nothing when the item has neither chapters nor soundbites.
 */
export function FullPlayerSegments({ channel, item }: FullPlayerSegmentsProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { playChapter, playSoundbite } = usePlayback();

  const [chapters, setChapters] = useState<DTOItemChapter[]>([]);

  const hasChaptersFeed = item.item_chapters_feed !== null && item.item_chapters_feed !== undefined;
  const soundbites = item.item_soundbites ?? [];

  useEffect(() => {
    if (!hasChaptersFeed) {
      setChapters([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await segmentsRepository.getChaptersByItemIdText(
          { accessToken, clearSession, refreshToken, setTokens },
          item.id_text
        );
        if (!cancelled) {
          setChapters(rows);
        }
      } catch {
        if (!cancelled) {
          setChapters([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, clearSession, hasChaptersFeed, item.id_text, refreshToken, setTokens]);

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
          <Text style={styles.heading}>{t('info.chapter.chapters')}</Text>
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
                {formatClock(chapter.start_time, { fallback: '' })}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {soundbites.length > 0 ? (
        <View testID="full-player-soundbites">
          <Text style={styles.heading}>{t('info.soundbite.official_clips')}</Text>
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
                {formatClock(soundbite.start_time, { fallback: '' })}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
