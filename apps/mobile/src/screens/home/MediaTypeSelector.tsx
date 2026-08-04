import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HomeMediaType } from '../../prefs/preferredMediaType';
import { useTheme } from '../../theme/useTheme';

type MediaTypeSelectorProps = {
  onChange: (mediaType: HomeMediaType) => void;
  selectedMediaType: HomeMediaType;
};

const MEDIA_TYPE_ORDER: HomeMediaType[] = [
  'podcasts',
  'episodes',
  'clips',
  'artists',
  'albums',
  'tracks',
];

const MEDIA_TYPE_LABEL_KEYS: Record<HomeMediaType, string> = {
  albums: 'media.music.albums',
  artists: 'media.music.artists',
  clips: 'features.clip.clips',
  episodes: 'media.podcast.episodes',
  podcasts: 'media.podcast.podcasts',
  tracks: 'media.music.tracks',
};

export function MediaTypeSelector({ onChange, selectedMediaType }: MediaTypeSelectorProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        chipActive: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        chipLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        chipLabelActive: {
          color: themeStyles.buttonPrimary.color,
        },
        container: {
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: 1,
          paddingBottom: tokens.spacing.md,
        },
        scrollContent: {
          paddingHorizontal: tokens.spacing.lg,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID="home-media-type-selector">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {MEDIA_TYPE_ORDER.map((mediaType) => {
          const isSelected = mediaType === selectedMediaType;

          return (
            <Pressable
              accessibilityRole="button"
              key={mediaType}
              onPress={() => {
                onChange(mediaType);
              }}
              style={[styles.chip, isSelected ? styles.chipActive : null]}
              testID={`home-media-type-${mediaType}`}
            >
              <Text style={[styles.chipLabel, isSelected ? styles.chipLabelActive : null]}>
                {t(MEDIA_TYPE_LABEL_KEYS[mediaType] ?? MEDIA_TYPE_LABEL_KEYS.podcasts)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
