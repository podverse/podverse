import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { getChannelForSeoPage, getPlaylistForSeoPage } from '../seo/fetchers';
import type { EmbedListFetchResult } from './embedListTypes';
import type {
  EmbedAlbumListQueryParams,
  EmbedPlaylistListQueryParams,
  EmbedPodcastListQueryParams,
} from './embedTypes';
import { isEmbedChannelEmbeddable, isEmbedPlaylistEmbeddable } from './embedVisibility';
import {
  mapAlbumItemsToEmbedListGroups,
  mapChannelClipsToEmbedListRows,
  mapChannelItemsToEmbedListRows,
  mapChannelSoundbitesToEmbedListRows,
  mapPlaylistResourcesToEmbedListRows,
} from './mapEmbedListRows';

type FetchEmbedListDataInput =
  | {
      routeKind: 'podcast';
      resourceId: string;
      listQuery: EmbedPodcastListQueryParams;
    }
  | {
      routeKind: 'album';
      resourceId: string;
      listQuery: EmbedAlbumListQueryParams;
    }
  | {
      routeKind: 'playlist';
      resourceId: string;
      listQuery: EmbedPlaylistListQueryParams;
    };

export async function fetchEmbedListData(
  input: FetchEmbedListDataInput
): Promise<EmbedListFetchResult> {
  try {
    if (input.routeKind === 'playlist') {
      return await fetchEmbedPlaylistListData(input.resourceId, input.listQuery);
    }

    if (input.routeKind === 'album') {
      return await fetchEmbedChannelListData('album', input.resourceId, input.listQuery);
    }

    return await fetchEmbedChannelListData('podcast', input.resourceId, input.listQuery);
  } catch {
    return { status: 'not_found' };
  }
}

async function fetchEmbedChannelListData(
  routeKind: 'podcast' | 'album',
  channelId: string,
  listQuery: EmbedPodcastListQueryParams | EmbedAlbumListQueryParams
): Promise<EmbedListFetchResult> {
  const channel = await getChannelForSeoPage(channelId);

  if (!channel) {
    return { status: 'not_found' };
  }

  if (!isEmbedChannelEmbeddable(channel)) {
    return { status: 'not_available' };
  }

  const { ssrApiRequestService } = await getSSRAuthService();

  if (routeKind === 'album') {
    const albumQuery = listQuery as EmbedAlbumListQueryParams;

    if (albumQuery.type !== 'tracks') {
      return {
        status: 'ok',
        listData: {
          headerTitle: channel.title ?? '',
          groups: [],
        },
      };
    }

    const liveItems = await ssrApiRequestService.reqLiveItemGetManyByChannel(channel.id_text);
    const responseItems = await ssrApiRequestService.reqItemGetManyByChannelBySeason({
      idOrIdText: channel.id_text,
      page: albumQuery.page,
      sort: albumQuery.sort,
      range: albumQuery.range,
    });

    const items = [...liveItems, ...responseItems.data];

    return {
      status: 'ok',
      listData: {
        headerTitle: channel.title ?? '',
        groups: mapAlbumItemsToEmbedListGroups(channel, items),
      },
    };
  }

  const podcastQuery = listQuery as EmbedPodcastListQueryParams;

  if (podcastQuery.type === 'boosts') {
    return {
      status: 'ok',
      listData: {
        headerTitle: channel.title ?? '',
        groups: [],
      },
    };
  }

  if (podcastQuery.type === 'clips') {
    const responseClips = await ssrApiRequestService.reqClipGetManyByChannelPublic({
      idOrIdText: channel.id_text,
      page: podcastQuery.page,
      sort: podcastQuery.sort,
      range: podcastQuery.range,
    });

    return {
      status: 'ok',
      listData: {
        headerTitle: channel.title ?? '',
        groups: mapChannelClipsToEmbedListRows(channel, responseClips.data),
      },
    };
  }

  if (podcastQuery.type === 'soundbites') {
    const responseSoundbites = await ssrApiRequestService.reqItemSoundbiteGetManyByChannelIdText(
      channel.id_text,
      {
        page: podcastQuery.page,
        sort: podcastQuery.sort !== 'top' ? podcastQuery.sort : 'recent',
      }
    );

    return {
      status: 'ok',
      listData: {
        headerTitle: channel.title ?? '',
        groups: mapChannelSoundbitesToEmbedListRows(channel, responseSoundbites.data),
      },
    };
  }

  const liveItems = await ssrApiRequestService.reqLiveItemGetManyByChannel(channel.id_text);
  const responseItems = await ssrApiRequestService.reqItemGetManyByChannel({
    idOrIdText: channel.id_text,
    page: podcastQuery.page,
    sort: podcastQuery.sort,
    range: podcastQuery.range,
  });

  const items = [...liveItems, ...responseItems.data];

  return {
    status: 'ok',
    listData: {
      headerTitle: channel.title ?? '',
      groups: mapChannelItemsToEmbedListRows(channel, items),
    },
  };
}

async function fetchEmbedPlaylistListData(
  playlistId: string,
  listQuery: EmbedPlaylistListQueryParams
): Promise<EmbedListFetchResult> {
  const playlist = await getPlaylistForSeoPage(playlistId);

  if (!playlist) {
    return { status: 'not_found' };
  }

  if (!isEmbedPlaylistEmbeddable(playlist)) {
    return { status: 'not_available' };
  }

  const { ssrApiRequestService } = await getSSRAuthService();
  const response = await ssrApiRequestService.reqPlaylistResourceGetManyByPlaylistIdText(
    playlist.id_text,
    {
      page: listQuery.page,
    }
  );

  return {
    status: 'ok',
    listData: {
      headerTitle: playlist.title ?? '',
      groups: mapPlaylistResourcesToEmbedListRows(response.data),
    },
  };
}
