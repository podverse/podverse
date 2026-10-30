import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import { getChannelRouteKind, getItemTypeFromMedium } from '@podverse/helpers/medium';

import type { RemoteItemListEntry } from '../lib/remoteItems/remoteItemListEntries';
import type { ChannelBrowseStackParamList } from '../navigation';
import {
  buildAlbumDetailParams,
  buildArtistDetailParams,
  buildPodcastDetailParams,
  buildSearchResultDetailParams,
  buildTrackDetailParams,
  CHANNEL_BROWSE_STACK_ROUTES,
} from '../navigation';

type ChannelBrowseNavigation = NativeStackNavigationProp<ChannelBrowseStackParamList>;

const openParsedChannel = (
  navigation: ChannelBrowseNavigation,
  entry: Extract<RemoteItemListEntry, { kind: 'channel' }>
): void => {
  const routeKind = getChannelRouteKind(entry.mediumId);
  if (routeKind === 'artist') {
    navigation.navigate(
      CHANNEL_BROWSE_STACK_ROUTES.ArtistDetail,
      buildArtistDetailParams({
        artistId: entry.channelIdText,
        previewImageUrl: entry.imageUrl,
        previewTitle: entry.title,
      })
    );
    return;
  }
  if (routeKind === 'album') {
    navigation.navigate(
      CHANNEL_BROWSE_STACK_ROUTES.AlbumDetail,
      buildAlbumDetailParams({
        albumId: entry.channelIdText,
        previewImageUrl: entry.imageUrl,
        previewTitle: entry.title,
      })
    );
    return;
  }
  navigation.navigate(
    CHANNEL_BROWSE_STACK_ROUTES.PodcastDetail,
    buildPodcastDetailParams({
      podcastId: entry.channelIdText,
      previewImageUrl: entry.imageUrl,
      previewTitle: entry.title,
    })
  );
};

const openParsedItem = (
  navigation: ChannelBrowseNavigation,
  entry: Extract<RemoteItemListEntry, { kind: 'item' }>
): void => {
  if (getItemTypeFromMedium(entry.mediumId) === 'track') {
    navigation.navigate(
      CHANNEL_BROWSE_STACK_ROUTES.TrackDetail,
      buildTrackDetailParams({
        previewImageUrl: entry.imageUrl,
        previewTitle: entry.title,
        trackId: entry.itemIdText,
      })
    );
    return;
  }
  navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, {
    episodeId: entry.itemIdText,
  });
};

/**
 * Opens a podroll or remote-item row on this tab's stack. A parsed channel or item opens its
 * detail screen. A remote stub opens the provider search detail for its feed.
 */
export function useOpenRemoteItemListEntry(): (entry: RemoteItemListEntry) => void {
  const navigation = useNavigation<ChannelBrowseNavigation>();

  return useCallback(
    (entry: RemoteItemListEntry) => {
      switch (entry.kind) {
        case 'channel':
          openParsedChannel(navigation, entry);
          return;
        case 'item':
          openParsedItem(navigation, entry);
          return;
        case 'channel_stub':
        case 'item_stub':
          navigation.navigate(
            CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail,
            buildSearchResultDetailParams(entry.target)
          );
          return;
        default: {
          const unreachable: never = entry;
          return unreachable;
        }
      }
    },
    [navigation]
  );
}
