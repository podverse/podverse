import { getTotalPages } from '@podverse/helpers';

import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { getChannelForSeoPage, getItemForSeoPage, getPlaylistForSeoPage } from '../seo/fetchers';
import type { EmbedListData, EmbedListFetchResult, EmbedListGroup } from './embedListTypes';
import type {
  EmbedAlbumListQueryParams,
  EmbedEpisodeChaptersListQueryParams,
  EmbedPlaylistListQueryParams,
  EmbedPodcastListQueryParams,
} from './embedTypes';
import { isEmbedChannelEmbeddable, isEmbedPlaylistEmbeddable } from './embedVisibility';
import {
  mapAlbumItemsToEmbedListGroups,
  mapChannelClipsToEmbedListRows,
  mapChannelItemsToEmbedListRows,
  mapChannelSoundbitesToEmbedListRows,
  mapItemChaptersToEmbedListRows,
  mapPlaylistResourcesToEmbedListRows,
  sortEmbedItemChapters,
} from './mapEmbedListRows';
import { filterEmbedCurrentlyLiveChannelItems } from './resolveEmbedLiveItemStatus';

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
    }
  | {
      routeKind: 'episode-chapters';
      resourceId: string;
      listQuery: EmbedEpisodeChaptersListQueryParams;
    };

export async function fetchEmbedListData(
  input: FetchEmbedListDataInput
): Promise<EmbedListFetchResult> {
  try {
    if (input.routeKind === 'playlist') {
      return await fetchEmbedPlaylistListData(input.resourceId, input.listQuery);
    }

    if (input.routeKind === 'episode-chapters') {
      return await fetchEmbedEpisodeChaptersListData(input.resourceId, input.listQuery);
    }

    if (input.routeKind === 'album') {
      return await fetchEmbedChannelListData('album', input.resourceId, input.listQuery);
    }

    return await fetchEmbedChannelListData('podcast', input.resourceId, input.listQuery);
  } catch {
    return { status: 'not_found' };
  }
}

async function fetchEmbedEpisodeChaptersListData(
  itemId: string,
  listQuery: EmbedEpisodeChaptersListQueryParams
): Promise<EmbedListFetchResult> {
  const item = await getItemForSeoPage(itemId);

  if (!item) {
    return { status: 'not_found' };
  }

  const channel = await getChannelForSeoPage(item.channel_id);

  if (!channel) {
    return { status: 'not_found' };
  }

  if (!isEmbedChannelEmbeddable(channel)) {
    return { status: 'not_available' };
  }

  const { ssrApiRequestService } = await getSSRAuthService();
  const response = await ssrApiRequestService.reqItemParseAndGetChapters(item.id_text);
  const chapters = sortEmbedItemChapters(response.data, listQuery.sort);

  return {
    status: 'ok',
    listData: buildEmbedListData({
      routeKind: 'episode-chapters',
      resourceId: item.id_text,
      headerTitle: item.title ?? '',
      groups: mapItemChaptersToEmbedListRows(channel, item, chapters),
      page: 1,
      totalPages: 1,
    }),
  };
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
        listData: buildEmbedListData({
          routeKind: 'album',
          resourceId: channel.id_text,
          headerTitle: channel.title ?? '',
          groups: [],
          page: albumQuery.page,
          totalPages: 1,
        }),
      };
    }

    const liveItems =
      albumQuery.page === 1
        ? filterEmbedCurrentlyLiveChannelItems(
            await ssrApiRequestService.reqLiveItemGetManyByChannel(channel.id_text)
          )
        : [];
    const responseItems = await ssrApiRequestService.reqItemGetManyByChannelBySeason({
      idOrIdText: channel.id_text,
      page: albumQuery.page,
      sort: albumQuery.sort,
      range: albumQuery.range,
    });

    const items = [...liveItems, ...responseItems.data];
    const totalPages = getTotalPages(
      responseItems.meta.count,
      responseItems.meta.limit,
      responseItems.data.length,
      albumQuery.page
    );

    return {
      status: 'ok',
      listData: buildEmbedListData({
        routeKind: 'album',
        resourceId: channel.id_text,
        headerTitle: channel.title ?? '',
        groups: mapAlbumItemsToEmbedListGroups(channel, items),
        page: albumQuery.page,
        totalPages,
      }),
    };
  }

  const podcastQuery = listQuery as EmbedPodcastListQueryParams;

  if (podcastQuery.type === 'boosts') {
    return {
      status: 'ok',
      listData: buildEmbedListData({
        routeKind: 'podcast',
        resourceId: channel.id_text,
        headerTitle: channel.title ?? '',
        groups: [],
        page: podcastQuery.page,
        totalPages: 1,
      }),
    };
  }

  if (podcastQuery.type === 'clips') {
    const responseClips = await ssrApiRequestService.reqClipGetManyByChannelPublic({
      idOrIdText: channel.id_text,
      page: podcastQuery.page,
      sort: podcastQuery.sort,
      range: podcastQuery.range,
    });

    const totalPages = getTotalPages(
      responseClips.meta.count,
      responseClips.meta.limit,
      responseClips.data.length,
      podcastQuery.page
    );

    return {
      status: 'ok',
      listData: buildEmbedListData({
        routeKind: 'podcast',
        resourceId: channel.id_text,
        headerTitle: channel.title ?? '',
        groups: mapChannelClipsToEmbedListRows(channel, responseClips.data),
        page: podcastQuery.page,
        totalPages,
      }),
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

    const totalPages = getTotalPages(
      responseSoundbites.meta.count,
      responseSoundbites.meta.limit,
      responseSoundbites.data.length,
      podcastQuery.page
    );

    return {
      status: 'ok',
      listData: buildEmbedListData({
        routeKind: 'podcast',
        resourceId: channel.id_text,
        headerTitle: channel.title ?? '',
        groups: mapChannelSoundbitesToEmbedListRows(channel, responseSoundbites.data),
        page: podcastQuery.page,
        totalPages,
      }),
    };
  }

  const liveItems =
    podcastQuery.page === 1
      ? filterEmbedCurrentlyLiveChannelItems(
          await ssrApiRequestService.reqLiveItemGetManyByChannel(channel.id_text)
        )
      : [];
  const responseItems = await ssrApiRequestService.reqItemGetManyByChannel({
    idOrIdText: channel.id_text,
    page: podcastQuery.page,
    sort: podcastQuery.sort,
    range: podcastQuery.range,
  });

  const items = [...liveItems, ...responseItems.data];
  const totalPages = getTotalPages(
    responseItems.meta.count,
    responseItems.meta.limit,
    responseItems.data.length,
    podcastQuery.page
  );

  return {
    status: 'ok',
    listData: buildEmbedListData({
      routeKind: 'podcast',
      resourceId: channel.id_text,
      headerTitle: channel.title ?? '',
      groups: mapChannelItemsToEmbedListRows(channel, items),
      page: podcastQuery.page,
      totalPages,
    }),
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

  const totalPages = getTotalPages(
    response.meta.count,
    response.meta.limit,
    response.data.length,
    listQuery.page
  );

  return {
    status: 'ok',
    listData: buildEmbedListData({
      routeKind: 'playlist',
      resourceId: playlist.id_text,
      headerTitle: playlist.title ?? '',
      groups: mapPlaylistResourcesToEmbedListRows(response.data),
      page: listQuery.page,
      totalPages,
    }),
  };
}

function buildEmbedListData(input: {
  routeKind: EmbedListData['routeKind'];
  resourceId: string;
  headerTitle: string;
  groups: EmbedListGroup[];
  page: number;
  totalPages: number;
}): EmbedListData {
  return {
    headerTitle: input.headerTitle,
    groups: input.groups,
    routeKind: input.routeKind,
    resourceId: input.resourceId,
    pagination: {
      page: input.page,
      totalPages: input.totalPages,
      hasNextPage: input.page < input.totalPages,
    },
  };
}
