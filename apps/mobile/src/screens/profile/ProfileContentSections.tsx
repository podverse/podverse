import { useTranslation } from 'react-i18next';

import type { DTOChannel, DTOClip, DTOPlaylist } from '@podverse/helpers';

import { PlaylistListRow } from '../../components/content';
import { ListSection } from '../../components/section/ListSection';
import { SectionCard } from '../../components/section/SectionCard';
import {
  channelToHomeRow,
  clipToHomeRow,
  MIXED_SOURCE_CLIP_ROW_OPTIONS,
} from '../../lib/rows/homeRowMappers';
import { HomeFeedRow } from '../home/HomeFeedRow';

type ProfileContentSectionsProps = {
  albums: DTOChannel[];
  clips: DTOClip[];
  emptyTestIdPrefix: 'my-profile' | 'profile';
  onPlaylistPress: (playlistId: string) => void;
  playlists: DTOPlaylist[];
  podcasts: DTOChannel[];
};

export function ProfileContentSections({
  albums,
  clips,
  emptyTestIdPrefix,
  onPlaylistPress,
  playlists,
  podcasts,
}: ProfileContentSectionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <SectionCard heading={t('media.podcast.podcasts')}>
        <ListSection
          emptyTestID={`${emptyTestIdPrefix}-podcasts-empty`}
          items={podcasts}
          renderItem={(podcast: DTOChannel, _index, isLast) => (
            <HomeFeedRow
              isLast={isLast}
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
          renderItem={(album: DTOChannel, _index, isLast) => (
            <HomeFeedRow
              isLast={isLast}
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
          renderItem={(playlist: DTOPlaylist, _index, isLast) => (
            <PlaylistListRow
              isLast={isLast}
              key={playlist.id_text}
              onPress={() => {
                onPlaylistPress(playlist.id_text);
              }}
              playlist={playlist}
              showCreator={false}
              testID={`${emptyTestIdPrefix}-playlist-row-${playlist.id_text}`}
            />
          )}
        />
      </SectionCard>

      <SectionCard heading={t('features.clip.clips')}>
        <ListSection
          emptyTestID={`${emptyTestIdPrefix}-clips-empty`}
          items={clips}
          renderItem={(clip: DTOClip, _index, isLast) => (
            <HomeFeedRow
              isLast={isLast}
              key={clip.id_text}
              mediaType="clips"
              onPlayPress={() => {}}
              onPress={() => {}}
              onQueuePress={() => {}}
              row={clipToHomeRow(clip, MIXED_SOURCE_CLIP_ROW_OPTIONS)}
            />
          )}
        />
      </SectionCard>
    </>
  );
}
