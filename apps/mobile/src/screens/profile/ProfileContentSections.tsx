import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOClip, DTOPlaylist } from '@podverse/helpers';

import { ListSection } from '../../components/section/ListSection';
import { SectionCard } from '../../components/section/SectionCard';
import { channelToHomeRow, clipToHomeRow } from '../../lib/rows/homeRowMappers';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';

type ProfileContentSectionsProps = {
  albums: DTOChannel[];
  clips: DTOClip[];
  emptyTestIdPrefix: 'my-profile' | 'profile';
  playlists: DTOPlaylist[];
  playlistVariant: 'card' | 'plain';
  podcasts: DTOChannel[];
};

export function ProfileContentSections({
  albums,
  clips,
  emptyTestIdPrefix,
  playlists,
  playlistVariant,
  podcasts,
}: ProfileContentSectionsProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        playlistCard: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          padding: tokens.spacing.md,
        },
        playlistSubtitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        playlistTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <>
      <SectionCard heading={t('media.podcast.podcasts')}>
        <ListSection
          emptyTestID={`${emptyTestIdPrefix}-podcasts-empty`}
          items={podcasts}
          renderItem={(podcast: DTOChannel) => (
            <HomeFeedRow
              key={podcast.id_text}
              mediaType="podcasts"
              onPlayPress={() => {}}
              onPress={() => {}}
              onQueuePress={() => {}}
              row={channelToHomeRow(podcast)}
            />
          )}
        />
      </SectionCard>

      <SectionCard heading={t('media.music.albums')}>
        <ListSection
          emptyTestID={`${emptyTestIdPrefix}-albums-empty`}
          items={albums}
          renderItem={(album: DTOChannel) => (
            <HomeFeedRow
              key={album.id_text}
              mediaType="albums"
              onPlayPress={() => {}}
              onPress={() => {}}
              onQueuePress={() => {}}
              row={channelToHomeRow(album)}
            />
          )}
        />
      </SectionCard>

      <SectionCard heading={t('features.playlist.playlists')}>
        <ListSection
          emptyTestID={`${emptyTestIdPrefix}-playlists-empty`}
          items={playlists}
          renderItem={(playlist: DTOPlaylist) =>
            playlistVariant === 'card' ? (
              <Pressable key={playlist.id_text} style={styles.playlistCard}>
                <Text style={styles.playlistTitle}>{playlist.title ?? playlist.id_text}</Text>
                <Text style={styles.playlistSubtitle}>
                  {t('features.playlist.item_count', { count: playlist.item_count })}
                </Text>
              </Pressable>
            ) : (
              <View key={playlist.id_text}>
                <Text>{playlist.title ?? playlist.id_text}</Text>
                <Text>{t('features.playlist.item_count', { count: playlist.item_count })}</Text>
              </View>
            )
          }
        />
      </SectionCard>

      <SectionCard heading={t('features.clip.clips')}>
        <ListSection
          emptyTestID={`${emptyTestIdPrefix}-clips-empty`}
          items={clips}
          renderItem={(clip: DTOClip) => (
            <HomeFeedRow
              key={clip.id_text}
              mediaType="clips"
              onPlayPress={() => {}}
              onPress={() => {}}
              onQueuePress={() => {}}
              row={clipToHomeRow(clip)}
            />
          )}
        />
      </SectionCard>
    </>
  );
}
