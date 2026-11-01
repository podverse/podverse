import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { DTOChannel, DTOClip, DTOPlaylist } from '@podverse/helpers';

import { PlaylistListRow } from '../../components/content';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { MenuSelectChip, SectionChipRow } from '../../components/form';
import { FillList } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import {
  channelToHomeRow,
  clipToHomeRow,
  MIXED_SOURCE_CLIP_ROW_OPTIONS,
} from '../../lib/rows/homeRowMappers';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import type { ProfileStackContentRequest } from './openProfileStackContent';

type ProfileContentSectionsProps = {
  albums: DTOChannel[];
  clips: DTOClip[];
  emptyTestIdPrefix: 'my-profile' | 'profile';
  header?: ReactNode;
  onContentPress: (request: ProfileStackContentRequest) => void;
  playlists: DTOPlaylist[];
  podcasts: DTOChannel[];
};

export type ProfileContentChip = 'albums' | 'clips' | 'playlists' | 'podcasts';

type ProfileListItem =
  | { channel: DTOChannel; kind: 'album' }
  | { clip: DTOClip; kind: 'clip' }
  | { kind: 'playlist'; playlist: DTOPlaylist }
  | { channel: DTOChannel; kind: 'podcast' };

const noopPlayPress = (_row: HomeFeedRowData): void => undefined;
const noopQueuePress = (_row: HomeFeedRowData, _position: QueueActionPosition): void => undefined;

function profileListItemKeyExtractor(item: ProfileListItem): string {
  if (item.kind === 'podcast' || item.kind === 'album') {
    return `${item.kind}:${item.channel.id_text}`;
  }
  if (item.kind === 'playlist') {
    return `playlist:${item.playlist.id_text}`;
  }
  return `clip:${item.clip.id_text}`;
}

function ProfileChannelRow({
  channel,
  mediaType,
  onContentPress,
}: {
  channel: DTOChannel;
  mediaType: 'albums' | 'podcasts';
  onContentPress: (request: ProfileStackContentRequest) => void;
}) {
  const row = useMemo(() => channelToHomeRow(channel), [channel]);

  const handlePress = useCallback(
    (pressed: HomeFeedRowData) => {
      onContentPress({
        kind: mediaType === 'albums' ? 'album' : 'podcast',
        row: pressed,
      });
    },
    [mediaType, onContentPress]
  );

  return (
    <HomeFeedRow
      mediaType={mediaType}
      onPlayPress={noopPlayPress}
      onPress={handlePress}
      onQueuePress={noopQueuePress}
      row={row}
    />
  );
}

function ProfilePlaylistRow({
  emptyTestIdPrefix,
  onContentPress,
  playlist,
}: {
  emptyTestIdPrefix: 'my-profile' | 'profile';
  onContentPress: (request: ProfileStackContentRequest) => void;
  playlist: DTOPlaylist;
}) {
  const handlePress = useCallback(() => {
    onContentPress({ id: playlist.id_text, kind: 'playlist' });
  }, [onContentPress, playlist.id_text]);

  return (
    <PlaylistListRow
      onPress={handlePress}
      playlist={playlist}
      showCreator={false}
      testID={`${emptyTestIdPrefix}-playlist-row-${playlist.id_text}`}
    />
  );
}

function ProfileClipRow({
  clip,
  onContentPress,
}: {
  clip: DTOClip;
  onContentPress: (request: ProfileStackContentRequest) => void;
}) {
  const row = useMemo(() => clipToHomeRow(clip, MIXED_SOURCE_CLIP_ROW_OPTIONS), [clip]);

  const handlePress = useCallback(
    (pressed: HomeFeedRowData) => {
      onContentPress({ id: pressed.id, kind: 'clip' });
    },
    [onContentPress]
  );

  return (
    <HomeFeedRow
      mediaType="clips"
      onPlayPress={noopPlayPress}
      onPress={handlePress}
      onQueuePress={noopQueuePress}
      row={row}
    />
  );
}

function emptyMessageKeyForChip(chip: ProfileContentChip): string {
  if (chip === 'podcasts') {
    return 'media.podcast.no_podcasts_found';
  }
  if (chip === 'albums') {
    return 'media.music.no_albums_found';
  }
  if (chip === 'playlists') {
    return 'features.playlist.no_playlists_found';
  }
  return 'features.clip.no_clips_found';
}

export function ProfileContentSections({
  albums,
  clips,
  emptyTestIdPrefix,
  header,
  onContentPress,
  playlists,
  podcasts,
}: ProfileContentSectionsProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [selectedChip, setSelectedChip] = useState<ProfileContentChip>('podcasts');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerSlot: {
          marginBottom: tokens.spacing.base,
        },
        list: {
          flex: 1,
        },
        listContent: {
          flexGrow: 1,
        },
      }),
    [tokens]
  );

  const chipItems = useMemo<SectionChipItem<ProfileContentChip>[]>(
    () => [
      {
        key: 'podcasts',
        label: t('media.podcast.podcasts'),
        testID: `${emptyTestIdPrefix}-chip-podcasts`,
      },
      {
        key: 'albums',
        label: t('media.music.albums'),
        testID: `${emptyTestIdPrefix}-chip-albums`,
      },
      {
        key: 'playlists',
        label: t('features.playlist.playlists'),
        testID: `${emptyTestIdPrefix}-chip-playlists`,
      },
      {
        key: 'clips',
        label: t('features.clip.clips'),
        testID: `${emptyTestIdPrefix}-chip-clips`,
      },
    ],
    [emptyTestIdPrefix, t]
  );

  const sortValue = selectedChip === 'clips' ? 'recent' : 'a_z';
  const sortOptions = useMemo<MenuSelectChipOption<'a_z' | 'recent'>[]>(
    () => [
      {
        label: selectedChip === 'clips' ? t('filters.sort.recent') : t('filters.sort.a_z'),
        value: sortValue,
      },
    ],
    [selectedChip, sortValue, t]
  );

  const listItems = useMemo((): ProfileListItem[] => {
    if (selectedChip === 'podcasts') {
      return podcasts.map((channel) => ({ channel, kind: 'podcast' }));
    }
    if (selectedChip === 'albums') {
      return albums.map((channel) => ({ channel, kind: 'album' }));
    }
    if (selectedChip === 'playlists') {
      return playlists.map((playlist) => ({ kind: 'playlist', playlist }));
    }
    return clips.map((clip) => ({ clip, kind: 'clip' }));
  }, [albums, clips, playlists, podcasts, selectedChip]);

  const listHeader = useMemo(
    () => (
      <>
        {header !== undefined && header !== null ? (
          <View style={styles.headerSlot}>{header}</View>
        ) : null}
        <SectionChipRow
          items={chipItems}
          onSelect={setSelectedChip}
          selectedKey={selectedChip}
          testID={`${emptyTestIdPrefix}-content-chips`}
          trailing={
            <MenuSelectChip
              heading={t('filters.screen.sort_heading')}
              onSelect={() => undefined}
              options={sortOptions}
              testID={`${emptyTestIdPrefix}-sort`}
              value={sortValue}
            />
          }
        />
      </>
    ),
    [
      chipItems,
      emptyTestIdPrefix,
      header,
      selectedChip,
      sortOptions,
      sortValue,
      styles.headerSlot,
      t,
    ]
  );

  const renderItem = useCallback(
    ({ item }: { item: ProfileListItem }) => {
      if (item.kind === 'podcast') {
        return (
          <ProfileChannelRow
            channel={item.channel}
            mediaType="podcasts"
            onContentPress={onContentPress}
          />
        );
      }
      if (item.kind === 'album') {
        return (
          <ProfileChannelRow
            channel={item.channel}
            mediaType="albums"
            onContentPress={onContentPress}
          />
        );
      }
      if (item.kind === 'playlist') {
        return (
          <ProfilePlaylistRow
            emptyTestIdPrefix={emptyTestIdPrefix}
            onContentPress={onContentPress}
            playlist={item.playlist}
          />
        );
      }
      return <ProfileClipRow clip={item.clip} onContentPress={onContentPress} />;
    },
    [emptyTestIdPrefix, onContentPress]
  );

  return (
    <FillList
      ListEmptyComponent={
        <ListEmpty
          messageKey={emptyMessageKeyForChip(selectedChip)}
          testID={`${emptyTestIdPrefix}-${selectedChip}-empty`}
        />
      }
      ListHeaderComponent={listHeader}
      contentContainerStyle={styles.listContent}
      data={listItems}
      keyExtractor={profileListItemKeyExtractor}
      keyboardShouldPersistTaps="handled"
      renderItem={renderItem}
      style={styles.list}
    />
  );
}
