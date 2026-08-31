import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { buildMediaRowMoreActions, MediaRowActions } from '../../components/player/MediaRowActions';
import { Badge } from '../../components/primitives';
import type { HomeMediaType } from '../../prefs/preferredMediaType';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from './homeFeedData';
import type { HomeRowMetadata } from './homeRowMetadata';
import type { QueueActionPosition } from './useHomeRowPlayback';
import { isPlayableHomeMediaType } from './useHomeRowPlayback';

type HomeFeedRowProps = {
  mediaType: HomeMediaType;
  onPress: (row: HomeFeedRowData) => void;
  onQueuePress: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onPlayPress: (row: HomeFeedRowData) => void;
  /** Optional action controls for locally-backed resources with a different playback path. */
  customActions?: ReactNode;
  /** When provided, adds an "Add to playlist" more-action (9d.4). Omit for unsupported kinds. */
  onAddToPlaylistPress?: (row: HomeFeedRowData) => void;
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

/**
 * One piece of the metadata line: the text, how it draws, and the name its `testID` ends in.
 *
 * `emphasis` is what a badge is for — something to notice — versus a fact to read. The badges say
 * "there is something here for you now"; the date and the download count describe the row.
 */
type MetadataSegment = {
  emphasis: boolean;
  name: string;
  text: string;
};

/**
 * What the metadata line says, in reading order, already localized.
 *
 * Built once and used for both the visible pills and the row's `accessibilityLabel`, so a screen
 * reader hears the same facts in the same order a sighted user reads them — rather than four
 * unattached fragments ("Live", "3 new", "2 downloaded") announced with no idea what they belong to.
 */
const useMetadataSegments = (metadata: HomeRowMetadata | undefined): MetadataSegment[] => {
  const { i18n, t } = useTranslation();

  return useMemo(() => {
    if (metadata === undefined) {
      return [];
    }

    const segments: MetadataSegment[] = [];

    if (metadata.isLive) {
      segments.push({ emphasis: true, name: 'live', text: t('media.livestream.live') });
    }
    if (metadata.unseenBadge !== null) {
      segments.push({
        emphasis: true,
        name: 'unseen',
        text: t(
          metadata.unseenBadge.isCapped
            ? 'subscriptions.row.unseen_count_capped'
            : 'subscriptions.row.unseen_count',
          { count: metadata.unseenBadge.count }
        ),
      });
    }
    if (metadata.latestItemPubDateMs !== null) {
      segments.push({
        emphasis: false,
        name: 'latest',
        text: t('subscriptions.row.latest_episode', {
          date: new Date(metadata.latestItemPubDateMs).toLocaleDateString(i18n.language),
        }),
      });
    }
    if (metadata.downloadedCount > 0) {
      segments.push({
        emphasis: false,
        name: 'downloaded',
        text: t('subscriptions.row.downloaded_count', { count: metadata.downloadedCount }),
      });
    }

    return segments;
  }, [i18n.language, metadata, t]);
};

export function HomeFeedRow({
  mediaType,
  onPress,
  onPlayPress,
  onQueuePress,
  onAddToPlaylistPress,
  customActions,
  row,
  testID,
}: HomeFeedRowProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const isPlayable = isPlayableHomeMediaType(mediaType);
  const metadataSegments = useMetadataSegments(row.metadata);

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
          marginBottom: tokens.spacing.xs,
        },
        metadataRow: {
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.xs,
        },
        metadataText: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
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
      // Composed rather than left to the default child walk, so the badges are heard as part of a
      // sentence about this show instead of as loose fragments after its title.
      accessibilityLabel={[row.title, row.subtitle, ...metadataSegments.map((s) => s.text)]
        .filter((part) => part !== null && part.length > 0)
        .join(', ')}
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
        <Badge
          label={t(MEDIA_TYPE_LABEL_KEYS[mediaType] ?? MEDIA_TYPE_LABEL_KEYS.podcasts)}
          style={styles.mediaTypeBadge}
        />
        {/* The title carries its own testID because it is what the Home filter matches on, so a
            test needs to read the text it is about to type. */}
        <Text numberOfLines={2} style={styles.title} testID={`home-feed-row-title-${row.id}`}>
          {row.title}
        </Text>
        {row.subtitle !== null ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {row.subtitle}
          </Text>
        ) : null}
        {metadataSegments.length > 0 ? (
          <View style={styles.metadataRow}>
            {metadataSegments.map((segment) =>
              segment.emphasis ? (
                <Badge
                  key={segment.name}
                  label={segment.text}
                  testID={`home-feed-row-${segment.name}-${row.id}`}
                  tone="accent"
                />
              ) : (
                <Text
                  key={segment.name}
                  style={styles.metadataText}
                  testID={`home-feed-row-${segment.name}-${row.id}`}
                >
                  {segment.text}
                </Text>
              )
            )}
          </View>
        ) : null}
        {customActions !== undefined ? (
          <View style={styles.actionRow}>{customActions}</View>
        ) : isPlayable ? (
          <View style={styles.actionRow}>
            <MediaRowActions
              idSuffix={`-${row.id}`}
              moreActions={buildMediaRowMoreActions(
                t,
                {
                  onAddToPlaylist:
                    onAddToPlaylistPress !== undefined
                      ? () => {
                          onAddToPlaylistPress(row);
                        }
                      : undefined,
                  onQueueLast: () => {
                    onQueuePress(row, 'last');
                  },
                  onQueueNext: () => {
                    onQueuePress(row, 'next');
                  },
                },
                { idSuffix: `-${row.id}` }
              )}
              moreTestID={`home-row-more-${row.id}`}
              onPlayPress={() => {
                onPlayPress(row);
              }}
              playLabel={t('media_player.play')}
              playTestID={`home-row-play-${row.id}`}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
