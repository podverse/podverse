import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/primitives';
import type { HomeMediaType } from '../../prefs/preferredMediaType';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from './homeFeedData';
import { isPlayableHomeMediaType } from './useHomeRowPlaybackStub';

type HomeFeedRowProps = {
  mediaType: HomeMediaType;
  onPress: (row: HomeFeedRowData) => void;
  onQueuePress: (row: HomeFeedRowData) => void;
  onPlayPress: (row: HomeFeedRowData) => void;
  row: HomeFeedRowData;
  testID?: string;
};

const MEDIA_TYPE_LABEL_KEYS: Record<HomeMediaType, string> = {
  albums: 'media.music.albums',
  artists: 'media.music.artists',
  clips: 'features.clip.clips',
  episodes: 'media.podcast.episodes',
  podcasts: 'media.podcast.podcasts',
  tracks: 'media.music.tracks',
};

const stopPressPropagation = (event: GestureResponderEvent) => {
  event.stopPropagation();
};

export function HomeFeedRow({
  mediaType,
  onPress,
  onPlayPress,
  onQueuePress,
  row,
  testID,
}: HomeFeedRowProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const isPlayable = isPlayableHomeMediaType(mediaType);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionRow: {
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.sm,
        },
        image: {
          backgroundColor: tokens.background.secondary,
          borderRadius: tokens.radii.sm,
          height: 56,
          width: 56,
        },
        imageFallback: {
          alignItems: 'center',
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.sm,
          borderWidth: 1,
          height: 56,
          justifyContent: 'center',
          width: 56,
        },
        imageFallbackText: {
          color: themeStyles.textSecondary.color,
          fontSize: 11,
          fontWeight: '600',
          textAlign: 'center',
        },
        mediaTypeBadge: {
          alignSelf: 'flex-start',
          backgroundColor: themeStyles.buttonSecondary.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginBottom: tokens.spacing.xs,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 2,
        },
        mediaTypeBadgeLabel: {
          color: themeStyles.buttonSecondary.color,
          fontSize: 11,
          fontWeight: '600',
        },
        row: {
          alignItems: 'center',
          backgroundColor: themeStyles.screen.backgroundColor,
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: 1,
          flexDirection: 'row',
          paddingVertical: tokens.spacing.md,
        },
        rowContent: {
          flex: 1,
          marginLeft: tokens.spacing.md,
          minWidth: 0,
        },
        subtitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
          marginBottom: tokens.spacing.xs,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        onPress(row);
      }}
      style={styles.row}
      testID={testID ?? `home-feed-row-${row.id}`}
    >
      {row.imageUrl !== null ? (
        <Image source={{ uri: row.imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.imageFallback}>
          <Text style={styles.imageFallbackText}>{t('media.image')}</Text>
        </View>
      )}
      <View style={styles.rowContent}>
        <View style={styles.mediaTypeBadge}>
          <Text style={styles.mediaTypeBadgeLabel}>{t(MEDIA_TYPE_LABEL_KEYS[mediaType])}</Text>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {row.title}
        </Text>
        {row.subtitle !== null ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {row.subtitle}
          </Text>
        ) : null}
        {isPlayable ? (
          <View style={styles.actionRow}>
            <Button
              label={t('media_player.play')}
              onPress={(event) => {
                stopPressPropagation(event);
                onPlayPress(row);
              }}
              size="sm"
              testID={`home-row-play-${row.id}`}
              variant="secondary"
            />
            <Button
              label={t('features.queue.queue_next')}
              onPress={(event) => {
                stopPressPropagation(event);
                onQueuePress(row);
              }}
              size="sm"
              testID={`home-row-queue-${row.id}`}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
