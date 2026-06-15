import { getTotalPages } from '@podverse/helpers';

import { getApiRequestService } from '../../factories/apiRequestService';
import type { EmbedListData, EmbedListGroup } from './embedListTypes';
import type {
  EmbedAlbumListQueryParams,
  EmbedEpisodeChaptersListQueryParams,
  EmbedPlaylistListQueryParams,
  EmbedPodcastListQueryParams,
} from './embedTypes';
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

type FetchEmbedListPageClientInput =
  | {
      routeKind: 'podcast';
      resourceId: string;
      listQuery: EmbedPodcastListQueryParams;
      headerTitle: string;
    }
  | {
      routeKind: 'album';
      resourceId: string;
      listQuery: EmbedAlbumListQueryParams;
      headerTitle: string;
    }
  | {
      routeKind: 'playlist';
      resourceId: string;
      listQuery: EmbedPlaylistListQueryParams;
      headerTitle: string;
    }
  | {
      routeKind: 'episode-chapters';
      resourceId: string;
      listQuery: EmbedEpisodeChaptersListQueryParams;
      headerTitle: string;
    };

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

export async function fetchEmbedListPageClient(
  input: FetchEmbedListPageClientInput
): Promise<EmbedListData | null> {
  const api = getApiRequestService();

  if (input.routeKind === 'episode-chapters') {
    const item = await api.reqItemGetByIdOrIdText(input.resourceId);
    const channel = item.channel ?? (await api.reqChannelGetByIdOrIdText(item.channel_id));
    if (!channel) {
      return null;
    }

    const chaptersResponse = await api.reqItemParseAndGetChapters(item.id_text);
    const chapters = sortEmbedItemChapters(chaptersResponse.data, input.listQuery.sort);

    return buildEmbedListData({
      routeKind: 'episode-chapters',
      resourceId: item.id_text,
      headerTitle: input.headerTitle,
      groups: mapItemChaptersToEmbedListRows(channel, item, chapters),
      page: 1,
      totalPages: 1,
    });
  }

  if (input.routeKind === 'playlist') {
    const response = await api.reqPlaylistResourceGetManyByPlaylistIdText(input.resourceId, {
      page: input.listQuery.page,
    });
    const totalPages = getTotalPages(
      response.meta.count,
      response.meta.limit,
      response.data.length,
      input.listQuery.page
    );

    return buildEmbedListData({
      routeKind: 'playlist',
      resourceId: input.resourceId,
      headerTitle: input.headerTitle,
      groups: mapPlaylistResourcesToEmbedListRows(response.data),
      page: input.listQuery.page,
      totalPages,
    });
  }

  if (input.routeKind === 'album') {
    if (input.listQuery.type !== 'tracks') {
      return buildEmbedListData({
        routeKind: 'album',
        resourceId: input.resourceId,
        headerTitle: input.headerTitle,
        groups: [],
        page: input.listQuery.page,
        totalPages: 1,
      });
    }

    const liveItems =
      input.listQuery.page === 1
        ? filterEmbedCurrentlyLiveChannelItems(
            await api.reqLiveItemGetManyByChannel(input.resourceId)
          )
        : [];
    const responseItems = await api.reqItemGetManyByChannelBySeason({
      idOrIdText: input.resourceId,
      page: input.listQuery.page,
      sort: input.listQuery.sort,
      range: input.listQuery.range,
    });
    const channel = responseItems.data[0]?.channel ?? liveItems[0]?.channel;
    if (!channel) {
      return null;
    }

    const items = [...liveItems, ...responseItems.data];
    const totalPages = getTotalPages(
      responseItems.meta.count,
      responseItems.meta.limit,
      responseItems.data.length,
      input.listQuery.page
    );

    return buildEmbedListData({
      routeKind: 'album',
      resourceId: input.resourceId,
      headerTitle: input.headerTitle,
      groups: mapAlbumItemsToEmbedListGroups(channel, items),
      page: input.listQuery.page,
      totalPages,
    });
  }

  const podcastQuery = input.listQuery;

  if (podcastQuery.type === 'clips') {
    const responseClips = await api.reqClipGetManyByChannelPublic({
      idOrIdText: input.resourceId,
      page: podcastQuery.page,
      sort: podcastQuery.sort,
      range: podcastQuery.range,
    });
    const channel = responseClips.data[0]?.item?.channel;
    if (!channel) {
      return null;
    }

    const totalPages = getTotalPages(
      responseClips.meta.count,
      responseClips.meta.limit,
      responseClips.data.length,
      podcastQuery.page
    );

    return buildEmbedListData({
      routeKind: 'podcast',
      resourceId: input.resourceId,
      headerTitle: input.headerTitle,
      groups: mapChannelClipsToEmbedListRows(channel, responseClips.data),
      page: podcastQuery.page,
      totalPages,
    });
  }

  if (podcastQuery.type === 'soundbites') {
    const responseSoundbites = await api.reqItemSoundbiteGetManyByChannelIdText(input.resourceId, {
      page: podcastQuery.page,
      sort: podcastQuery.sort !== 'top' ? podcastQuery.sort : 'recent',
    });
    const channel = responseSoundbites.data[0]?.item?.channel;
    if (!channel) {
      return null;
    }

    const totalPages = getTotalPages(
      responseSoundbites.meta.count,
      responseSoundbites.meta.limit,
      responseSoundbites.data.length,
      podcastQuery.page
    );

    return buildEmbedListData({
      routeKind: 'podcast',
      resourceId: input.resourceId,
      headerTitle: input.headerTitle,
      groups: mapChannelSoundbitesToEmbedListRows(channel, responseSoundbites.data),
      page: podcastQuery.page,
      totalPages,
    });
  }

  const liveItems =
    podcastQuery.page === 1
      ? filterEmbedCurrentlyLiveChannelItems(
          await api.reqLiveItemGetManyByChannel(input.resourceId)
        )
      : [];
  const responseItems = await api.reqItemGetManyByChannel({
    idOrIdText: input.resourceId,
    page: podcastQuery.page,
    sort: podcastQuery.sort,
    range: podcastQuery.range,
  });
  const channel = responseItems.data[0]?.channel ?? liveItems[0]?.channel;
  if (!channel) {
    return null;
  }

  const items = [...liveItems, ...responseItems.data];
  const totalPages = getTotalPages(
    responseItems.meta.count,
    responseItems.meta.limit,
    responseItems.data.length,
    podcastQuery.page
  );

  return buildEmbedListData({
    routeKind: 'podcast',
    resourceId: input.resourceId,
    headerTitle: input.headerTitle,
    groups: mapChannelItemsToEmbedListRows(channel, items),
    page: podcastQuery.page,
    totalPages,
  });
}

export function mergeEmbedListGroups(
  existingGroups: EmbedListGroup[],
  nextGroups: EmbedListGroup[]
): EmbedListGroup[] {
  const merged = new Map<string, EmbedListGroup>();

  for (const group of existingGroups) {
    merged.set(group.groupKey, { ...group, rows: [...group.rows] });
  }

  for (const group of nextGroups) {
    const existing = merged.get(group.groupKey);
    if (existing) {
      existing.rows.push(...group.rows);
      continue;
    }

    merged.set(group.groupKey, { ...group, rows: [...group.rows] });
  }

  return [...merged.values()];
}
