import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { HomeMediaType } from '../../prefs/preferredMediaType';
import { typography } from '../../theme/typography';
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

/**
 * Horizontal media-type pills. Home renders this in the page body under the stack title, the same
 * way Search keeps its field under the Search title.
 */
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
          ...typography.label,
          color: themeStyles.textPrimary.color,
        },
        chipLabelActive: {
          color: themeStyles.buttonPrimary.color,
        },
        scrollContent: {
          alignItems: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID="home-media-type-selector"
    >
      {MEDIA_TYPE_ORDER.map((mediaType) => {
        const isSelected = selectedMediaType === mediaType;
        const label = t(MEDIA_TYPE_LABEL_KEYS[mediaType] ?? MEDIA_TYPE_LABEL_KEYS.podcasts);

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            key={mediaType}
            onPress={() => {
              onChange(mediaType);
            }}
            style={[styles.chip, isSelected ? styles.chipActive : null]}
            testID={`home-media-type-${mediaType}`}
          >
            <Text style={[styles.chipLabel, isSelected ? styles.chipLabelActive : null]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
