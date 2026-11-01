import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { buildAlbumDetailParams } from '../../navigation/albumDetailParams';
import { buildPodcastDetailParams } from '../../navigation/podcastDetailParams';
import type { HomeFeedRowData } from '../home/homeFeedData';

export type ProfileChannelRowInput = Pick<HomeFeedRowData, 'id' | 'imageUrl' | 'title'>;

export type ProfileStackContentRequest =
  | { kind: 'album'; row: ProfileChannelRowInput }
  | { kind: 'clip'; id: string }
  | { kind: 'playlist'; id: string }
  | { kind: 'podcast'; row: ProfileChannelRowInput };

export type ProfileStackContentTarget =
  | {
      name: 'AlbumDetail';
      params: ReturnType<typeof buildAlbumDetailParams>;
    }
  | {
      name: 'ClipDetail';
      params: { clipId: string };
    }
  | {
      name: 'PlaylistDetail';
      params: { playlistId: string };
    }
  | {
      name: 'PodcastDetail';
      params: ReturnType<typeof buildPodcastDetailParams>;
    };

/**
 * Build the next screen on the stack that is already showing the profile. Podcasts, albums,
 * clips, and playlists stay on that stack; Back returns to the profile.
 */
export function buildProfileStackContentTarget(
  request: ProfileStackContentRequest
): ProfileStackContentTarget {
  if (request.kind === 'podcast') {
    return {
      name: 'PodcastDetail',
      params: buildPodcastDetailParams({
        podcastId: request.row.id,
        previewImageUrl: request.row.imageUrl,
        previewTitle: request.row.title,
      }),
    };
  }
  if (request.kind === 'album') {
    return {
      name: 'AlbumDetail',
      params: buildAlbumDetailParams({
        albumId: request.row.id,
        previewImageUrl: request.row.imageUrl,
        previewTitle: request.row.title,
      }),
    };
  }
  if (request.kind === 'clip') {
    return {
      name: 'ClipDetail',
      params: { clipId: request.id },
    };
  }
  return {
    name: 'PlaylistDetail',
    params: { playlistId: request.id },
  };
}

export function openProfileStackContent(
  navigation: NativeStackNavigationProp<ParamListBase>,
  request: ProfileStackContentRequest
): void {
  const target = buildProfileStackContentTarget(request);
  navigation.navigate(target.name, target.params);
}
