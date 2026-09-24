import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';

import type { DTOChannel, DTOClip, DTOPlaylist } from '@podverse/helpers';

import { PlaylistListRow } from '../../components/content';
import {
  applyFillListRenderWindow,
  LIST_REMOVE_CLIPPED_SUBVIEWS,
} from '../../components/primitives/listVirtualization';
import { SectionHeading } from '../../components/section/SectionHeading';
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

type ProfileContentSectionsProps = {
  albums: DTOChannel[];
  clips: DTOClip[];
  emptyTestIdPrefix: 'my-profile' | 'profile';
  header?: ReactNode;
  onPlaylistPress: (playlistId: string) => void;
  playlists: DTOPlaylist[];
  podcasts: DTOChannel[];
};

type ProfileSectionKey = 'albums' | 'clips' | 'playlists' | 'podcasts';

type ProfileSectionItem =
  | { channel: DTOChannel; kind: 'album' }
  | { clip: DTOClip; kind: 'clip' }
  | { emptyTestID: string; kind: 'empty' }
  | { kind: 'playlist'; playlist: DTOPlaylist }
  | { channel: DTOChannel; kind: 'podcast' };

type ProfileSection = {
  data: ProfileSectionItem[];
  key: ProfileSectionKey;
  title: string;
};

const noopPlayPress = (_row: HomeFeedRowData): void => undefined;
const noopPress = (_row: HomeFeedRowData): void => undefined;
const noopQueuePress = (_row: HomeFeedRowData, _position: QueueActionPosition): void => undefined;

function withEmptyFallback(items: ProfileSectionItem[], emptyTestID: string): ProfileSectionItem[] {
  if (items.length === 0) {
    return [{ emptyTestID, kind: 'empty' }];
  }
  return items;
}

function profileSectionItemKeyExtractor(item: ProfileSectionItem): string {
  if (item.kind === 'empty') {
    return item.emptyTestID;
  }
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
  isLast,
  mediaType,
}: {
  channel: DTOChannel;
  isLast: boolean;
  mediaType: 'albums' | 'podcasts';
}) {
  const row = useMemo(() => channelToHomeRow(channel), [channel]);

  return (
    <HomeFeedRow
      isLast={isLast}
      mediaType={mediaType}
      onPlayPress={noopPlayPress}
      onPress={noopPress}
      onQueuePress={noopQueuePress}
      row={row}
    />
  );
}

function ProfilePlaylistRow({
  emptyTestIdPrefix,
  isLast,
  onPlaylistPress,
  playlist,
}: {
  emptyTestIdPrefix: 'my-profile' | 'profile';
  isLast: boolean;
  onPlaylistPress: (playlistId: string) => void;
  playlist: DTOPlaylist;
}) {
  const handlePress = useCallback(() => {
    onPlaylistPress(playlist.id_text);
  }, [onPlaylistPress, playlist.id_text]);

  return (
    <PlaylistListRow
      isLast={isLast}
      onPress={handlePress}
      playlist={playlist}
      showCreator={false}
      testID={`${emptyTestIdPrefix}-playlist-row-${playlist.id_text}`}
    />
  );
}

function ProfileClipRow({ clip, isLast }: { clip: DTOClip; isLast: boolean }) {
  const row = useMemo(() => clipToHomeRow(clip, MIXED_SOURCE_CLIP_ROW_OPTIONS), [clip]);

  return (
    <HomeFeedRow
      isLast={isLast}
      mediaType="clips"
      onPlayPress={noopPlayPress}
      onPress={noopPress}
      onQueuePress={noopQueuePress}
      row={row}
    />
  );
}

export function ProfileContentSections({
  albums,
  clips,
  emptyTestIdPrefix,
  header,
  onPlaylistPress,
  playlists,
  podcasts,
}: ProfileContentSectionsProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerSlot: {
          marginBottom: tokens.spacing.md,
        },
        list: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          flex: 1,
        },
        listContent: {
          flexGrow: 1,
          padding: tokens.spacing.lg,
        },
        sectionHeading: {
          marginBottom: tokens.spacing.sm,
          marginTop: tokens.spacing.md,
        },
        sectionHeadingFirst: {
          marginBottom: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const sections = useMemo(
    (): ProfileSection[] => [
      {
        data: withEmptyFallback(
          podcasts.map((channel) => ({ channel, kind: 'podcast' })),
          `${emptyTestIdPrefix}-podcasts-empty`
        ),
        key: 'podcasts',
        title: t('media.podcast.podcasts'),
      },
      {
        data: withEmptyFallback(
          albums.map((channel) => ({ channel, kind: 'album' })),
          `${emptyTestIdPrefix}-albums-empty`
        ),
        key: 'albums',
        title: t('media.music.albums'),
      },
      {
        data: withEmptyFallback(
          playlists.map((playlist) => ({ kind: 'playlist', playlist })),
          `${emptyTestIdPrefix}-playlists-empty`
        ),
        key: 'playlists',
        title: t('features.playlist.playlists'),
      },
      {
        data: withEmptyFallback(
          clips.map((clip) => ({ clip, kind: 'clip' })),
          `${emptyTestIdPrefix}-clips-empty`
        ),
        key: 'clips',
        title: t('features.clip.clips'),
      },
    ],
    [albums, clips, emptyTestIdPrefix, playlists, podcasts, t]
  );

  const listHeader = useMemo(() => {
    if (header === undefined || header === null) {
      return null;
    }
    return <View style={styles.headerSlot}>{header}</View>;
  }, [header, styles.headerSlot]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: ProfileSection }) => (
      <SectionHeading
        style={section.key === 'podcasts' ? styles.sectionHeadingFirst : styles.sectionHeading}
      >
        {section.title}
      </SectionHeading>
    ),
    [styles.sectionHeading, styles.sectionHeadingFirst]
  );

  const renderItem = useCallback(
    ({
      index,
      item,
      section,
    }: {
      index: number;
      item: ProfileSectionItem;
      section: ProfileSection;
    }) => {
      const isLast = index === section.data.length - 1;
      if (item.kind === 'empty') {
        return <ListEmpty testID={item.emptyTestID} />;
      }
      if (item.kind === 'podcast') {
        return <ProfileChannelRow channel={item.channel} isLast={isLast} mediaType="podcasts" />;
      }
      if (item.kind === 'album') {
        return <ProfileChannelRow channel={item.channel} isLast={isLast} mediaType="albums" />;
      }
      if (item.kind === 'playlist') {
        return (
          <ProfilePlaylistRow
            emptyTestIdPrefix={emptyTestIdPrefix}
            isLast={isLast}
            onPlaylistPress={onPlaylistPress}
            playlist={item.playlist}
          />
        );
      }
      return <ProfileClipRow clip={item.clip} isLast={isLast} />;
    },
    [emptyTestIdPrefix, onPlaylistPress]
  );

  return (
    <SectionList
      {...applyFillListRenderWindow({})}
      ListHeaderComponent={listHeader}
      contentContainerStyle={styles.listContent}
      keyExtractor={profileSectionItemKeyExtractor}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      sections={sections}
      stickySectionHeadersEnabled={false}
      style={styles.list}
    />
  );
}
