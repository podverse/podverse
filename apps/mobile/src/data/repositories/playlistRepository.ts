import { asc, eq, inArray } from 'drizzle-orm';

import type {
  AddByRSSResourceData,
  BetweenParams,
  DTOPlaylist,
  DTOPlaylistResource,
  QueryParamsQueueMedium,
} from '@podverse/helpers';
import { articleStrippedTitle, MediumEnum } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';
import type { ApiListResponse } from '@podverse/helpers-requests';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { isOfflineModeEnabled, OfflineModeEnabledError } from '../../prefs/offlineMode';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { NativeCacheBrowseNode } from '../nativeCache';
import { projectLibraryBrowseIndexToNativeCache } from '../nativeCache';
import {
  isWatermarkStale,
  readSyncWatermark,
  readThroughOrFetch,
  writeSyncWatermark,
} from '../sync';
import {
  mapPlaylistToNode,
  mapSubscribedChannelToNode,
  mergeLibraryBrowseNodes,
} from './libraryBrowseProjection';
import { subscriptionsRepository } from './subscriptionsRepository';
import type { MobileAuthRequestContext } from './types';

/**
 * Offline-first playlist repository. Reads return SQLite state immediately; writes require network
 * and are refused while Offline Mode is on (no playlist mutation outbox).
 */

const PLAYLIST_TTL_MS = 5 * 60 * 1000;

/**
 * Advances when playlist data is cleared. A response that started under an older generation
 * belongs to a session that has ended, so its write is dropped.
 */
let playlistCacheGeneration = 0;
const PLAYLIST_PAGE_LIMIT = 20;
const RESOURCE_PAGE_LIMIT = 20;

type PlaylistListKind = 'owned' | 'followed';

export type PlaylistListParams = {
  medium: QueryParamsQueueMedium;
  page: number;
  range: QueryParamsStatsRange | null;
  sort: QueryParamsSubscribedFullSort;
};

type PlaylistListReadOptions = {
  refresh?: boolean;
};

type PlaylistDetailReadOptions = {
  refresh?: boolean;
};

type PlaylistResourceReadOptions = {
  refresh?: boolean;
};

const playlistListWatermarkKey = (kind: PlaylistListKind): string =>
  `playlist.list.${kind}.lastSyncedAt`;
const playlistResourceAllWatermarkKey = (playlistIdText: string): string =>
  `playlist.resources.${playlistIdText}.all.lastSyncedAt`;
const playlistResourcePageWatermarkKey = (playlistIdText: string, page: number): string =>
  `playlist.resources.${playlistIdText}.page.${page}.lastSyncedAt`;
const playlistDetailWatermarkKey = (playlistIdText: string): string =>
  `playlist.detail.${playlistIdText}.lastSyncedAt`;

const listPositionAsNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return parsed;
};

const toPlaylistNodes = (playlists: DTOPlaylist[]): NativeCacheBrowseNode[] => {
  const nodes: NativeCacheBrowseNode[] = [];
  for (const playlist of playlists) {
    const node = mapPlaylistToNode(playlist);
    if (node !== null) {
      nodes.push(node);
    }
  }
  return nodes;
};

const projectLibraryBrowseFromCache = async (): Promise<void> => {
  const [subscriptions, followedPlaylists] = await Promise.all([
    subscriptionsRepository.list(),
    playlistRepository.listFollowedCached(),
  ]);
  const channelNodes = subscriptions.map(mapSubscribedChannelToNode);
  const playlistNodes = toPlaylistNodes(followedPlaylists);
  const nodes = mergeLibraryBrowseNodes(channelNodes, playlistNodes);
  await projectLibraryBrowseIndexToNativeCache({ nodes });
};

const toBetweenParams = (position1: number, position2: number): BetweenParams => ({
  position1: String(position1),
  position2: String(position2),
});

const applyMediumFilter = (
  playlists: DTOPlaylist[],
  medium: QueryParamsQueueMedium
): DTOPlaylist[] => {
  if (medium === 'all') {
    return playlists;
  }
  if (medium === 'music') {
    return playlists.filter((playlist) => playlist.medium_id === MediumEnum.Music);
  }
  return playlists.filter((playlist) => playlist.medium_id === MediumEnum.AV);
};

const comparePlaylistsAlphabetical = (a: DTOPlaylist, b: DTOPlaylist): number => {
  const aTitle = articleStrippedTitle(a.title ?? a.id_text);
  const bTitle = articleStrippedTitle(b.title ?? b.id_text);
  return aTitle.localeCompare(bTitle);
};

const comparePlaylistsRecent = (a: DTOPlaylist, b: DTOPlaylist): number => {
  const aTime = Date.parse(a.last_updated);
  const bTime = Date.parse(b.last_updated);
  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }
  return comparePlaylistsAlphabetical(a, b);
};

const comparePlaylistsOldest = (a: DTOPlaylist, b: DTOPlaylist): number => {
  return -comparePlaylistsRecent(a, b);
};

const comparePlaylistsTop = (a: DTOPlaylist, b: DTOPlaylist): number => {
  if (a.item_count !== b.item_count) {
    return b.item_count - a.item_count;
  }
  return comparePlaylistsRecent(a, b);
};

const sortPlaylists = (
  playlists: DTOPlaylist[],
  sort: QueryParamsSubscribedFullSort
): DTOPlaylist[] => {
  const sorted = [...playlists];
  if (sort === 'a_z') {
    sorted.sort(comparePlaylistsAlphabetical);
    return sorted;
  }
  if (sort === 'oldest') {
    sorted.sort(comparePlaylistsOldest);
    return sorted;
  }
  if (sort === 'top') {
    sorted.sort(comparePlaylistsTop);
    return sorted;
  }
  sorted.sort(comparePlaylistsRecent);
  return sorted;
};

const paginateList = <T>(values: T[], page: number, limit: number): ApiListResponse<T> => {
  const safePage = page > 0 ? page : 1;
  const start = (safePage - 1) * limit;
  return {
    data: values.slice(start, start + limit),
    meta: {
      page: safePage,
      count: values.length,
      limit,
    },
  };
};

const playlistFromRow = (row: typeof schema.playlist.$inferSelect): DTOPlaylist => {
  const parsed = safeJsonParse<DTOPlaylist>(row.payloadJson);
  if (parsed !== null) {
    return parsed;
  }
  return {
    id: row.id,
    id_text: row.idText,
    title: row.title,
    description: row.description,
    medium_id: row.mediumId,
    sharable_status_id: row.sharableStatusId,
    is_default_likes: row.isDefaultLikes === 1,
    item_count: row.itemCount,
    last_updated: row.lastUpdated,
  };
};

const playlistResourceFromRow = (
  row: typeof schema.playlistResource.$inferSelect
): DTOPlaylistResource | null => {
  return safeJsonParse<DTOPlaylistResource>(row.payloadJson);
};

const upsertPlaylists = async (
  playlists: DTOPlaylist[],
  updates: { markFollowed?: boolean; markOwned?: boolean },
  generation: number
): Promise<void> => {
  if (generation !== playlistCacheGeneration || playlists.length === 0) {
    return;
  }

  const idTexts = playlists.map((playlist) => playlist.id_text);
  const existingRows = await getDb()
    .select({
      idText: schema.playlist.idText,
      isOwned: schema.playlist.isOwned,
      isFollowed: schema.playlist.isFollowed,
      ownerAccountIdText: schema.playlist.ownerAccountIdText,
      payloadJson: schema.playlist.payloadJson,
    })
    .from(schema.playlist)
    .where(inArray(schema.playlist.idText, idTexts));

  const existingFlags = new Map(
    existingRows.map((row) => [
      row.idText,
      {
        isFollowed: row.isFollowed,
        isOwned: row.isOwned,
        ownerAccountIdText: row.ownerAccountIdText,
        payload: safeJsonParse<DTOPlaylist>(row.payloadJson),
      },
    ])
  );

  const updatedAt = Date.now();
  for (const playlist of playlists) {
    const lastUpdated =
      playlist.last_updated !== undefined && playlist.last_updated.length > 0
        ? playlist.last_updated
        : new Date().toISOString();
    const existing = existingFlags.get(playlist.id_text);
    const account = playlist.account ?? existing?.payload?.account;
    const ownerAccountIdText = account?.id_text ?? existing?.ownerAccountIdText ?? null;
    const storedPlaylist: DTOPlaylist =
      account === undefined
        ? { ...playlist, last_updated: lastUpdated }
        : { ...playlist, account, last_updated: lastUpdated };
    const isOwned =
      updates.markOwned === true ? 1 : updates.markOwned === false ? 0 : (existing?.isOwned ?? 0);
    const isFollowed =
      updates.markFollowed === true
        ? 1
        : updates.markFollowed === false
          ? 0
          : (existing?.isFollowed ?? 0);

    await getDb()
      .insert(schema.playlist)
      .values({
        idText: playlist.id_text,
        id: playlist.id,
        title: playlist.title ?? null,
        description: playlist.description ?? null,
        mediumId: playlist.medium_id,
        sharableStatusId: playlist.sharable_status_id,
        isDefaultLikes: playlist.is_default_likes ? 1 : 0,
        itemCount: playlist.item_count,
        lastUpdated,
        ownerAccountIdText,
        isOwned,
        isFollowed,
        payloadJson: JSON.stringify(storedPlaylist),
        updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.playlist.idText,
        set: {
          id: playlist.id,
          title: playlist.title ?? null,
          description: playlist.description ?? null,
          mediumId: playlist.medium_id,
          sharableStatusId: playlist.sharable_status_id,
          isDefaultLikes: playlist.is_default_likes ? 1 : 0,
          itemCount: playlist.item_count,
          lastUpdated,
          ownerAccountIdText,
          isOwned,
          isFollowed,
          payloadJson: JSON.stringify(storedPlaylist),
          updatedAt,
        },
      });
  }
};

const replacePlaylistResources = async (
  playlistIdText: string,
  resources: DTOPlaylistResource[],
  generation: number
): Promise<void> => {
  if (generation !== playlistCacheGeneration) {
    return;
  }
  await getDb().transaction(async (transaction) => {
    await transaction
      .delete(schema.playlistResource)
      .where(eq(schema.playlistResource.playlistIdText, playlistIdText));

    if (resources.length === 0) {
      return;
    }

    const updatedAt = Date.now();
    await transaction.insert(schema.playlistResource).values(
      resources.map((resource) => ({
        id: resource.id,
        playlistId: resource.playlist_id,
        playlistIdText: playlistIdText,
        listPosition: resource.list_position,
        clipId: resource.clip_id,
        itemId: resource.item_id,
        itemSoundbiteId: resource.item_soundbite_id,
        addByRssHashId: resource.add_by_rss_hash_id ?? null,
        payloadJson: JSON.stringify(resource),
        updatedAt,
      }))
    );
  });
};

const upsertPlaylistResources = async (
  playlistIdText: string,
  resources: DTOPlaylistResource[],
  generation: number
): Promise<void> => {
  if (generation !== playlistCacheGeneration || resources.length === 0) {
    return;
  }
  const updatedAt = Date.now();
  for (const resource of resources) {
    await getDb()
      .insert(schema.playlistResource)
      .values({
        id: resource.id,
        playlistId: resource.playlist_id,
        playlistIdText,
        listPosition: resource.list_position,
        clipId: resource.clip_id,
        itemId: resource.item_id,
        itemSoundbiteId: resource.item_soundbite_id,
        addByRssHashId: resource.add_by_rss_hash_id ?? null,
        payloadJson: JSON.stringify(resource),
        updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.playlistResource.id,
        set: {
          playlistId: resource.playlist_id,
          listPosition: resource.list_position,
          clipId: resource.clip_id,
          itemId: resource.item_id,
          itemSoundbiteId: resource.item_soundbite_id,
          addByRssHashId: resource.add_by_rss_hash_id ?? null,
          payloadJson: JSON.stringify(resource),
          updatedAt,
        },
      });
  }
};

const listPlaylistsByKindCached = async (kind: PlaylistListKind): Promise<DTOPlaylist[]> => {
  const rows =
    kind === 'owned'
      ? await getDb().select().from(schema.playlist).where(eq(schema.playlist.isOwned, 1))
      : await getDb().select().from(schema.playlist).where(eq(schema.playlist.isFollowed, 1));
  return rows.map(playlistFromRow);
};

const listResponseFromCache = async (
  kind: PlaylistListKind,
  params: PlaylistListParams
): Promise<ApiListResponse<DTOPlaylist> | null> => {
  const watermark = await readSyncWatermark(playlistListWatermarkKey(kind));
  const playlists = await listPlaylistsByKindCached(kind);
  if (watermark === null && playlists.length === 0) {
    return null;
  }

  const filtered = applyMediumFilter(playlists, params.medium);
  const sorted = sortPlaylists(filtered, params.sort);
  return paginateList(sorted, params.page, PLAYLIST_PAGE_LIMIT);
};

const fetchRemoteList = async (
  context: MobileAuthRequestContext,
  kind: PlaylistListKind,
  params: PlaylistListParams,
  generation: number
): Promise<ApiListResponse<DTOPlaylist>> => {
  const response = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqPlaylistGetMany({
      page: params.page,
      medium: params.medium,
      type: kind === 'owned' ? 'private' : 'private_followed',
      sort: params.sort,
      range: params.range,
    })
  );
  await upsertPlaylists(
    response.data,
    {
      markOwned: kind === 'owned' ? true : undefined,
      markFollowed: kind === 'followed' ? true : undefined,
    },
    generation
  );
  if (generation === playlistCacheGeneration) {
    await writeSyncWatermark(playlistListWatermarkKey(kind), Date.now());
  }
  return response;
};

const fetchRemotePlaylistByIdText = async (
  context: MobileAuthRequestContext,
  playlistIdText: string,
  generation: number
): Promise<DTOPlaylist> => {
  const playlist = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqPlaylistGet(playlistIdText)
  );
  await upsertPlaylists([playlist], {}, generation);
  if (generation === playlistCacheGeneration) {
    await writeSyncWatermark(playlistDetailWatermarkKey(playlistIdText), Date.now());
  }
  return playlist;
};

const readPlaylistResourcesCached = async (
  playlistIdText: string
): Promise<DTOPlaylistResource[]> => {
  const rows = await getDb()
    .select()
    .from(schema.playlistResource)
    .where(eq(schema.playlistResource.playlistIdText, playlistIdText))
    .orderBy(asc(schema.playlistResource.listPosition));

  return rows
    .map((row) => playlistResourceFromRow(row))
    .filter((resource): resource is DTOPlaylistResource => resource !== null)
    .sort((a, b) => listPositionAsNumber(a.list_position) - listPositionAsNumber(b.list_position));
};

const fetchAndReplaceResourcesPrivateAll = async (
  context: MobileAuthRequestContext,
  playlistIdText: string,
  generation: number
): Promise<DTOPlaylistResource[]> => {
  const resources = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqPlaylistResourceGetAllByPlaylistIdTextPrivate(playlistIdText)
  );
  await replacePlaylistResources(playlistIdText, resources, generation);
  if (generation === playlistCacheGeneration) {
    const now = Date.now();
    await Promise.all([
      writeSyncWatermark(playlistResourceAllWatermarkKey(playlistIdText), now),
      writeSyncWatermark(playlistResourcePageWatermarkKey(playlistIdText, 1), now),
    ]);
  }
  return resources;
};

const updateFollowState = async (
  playlistIdText: string,
  isFollowed: boolean,
  generation: number
): Promise<void> => {
  if (generation !== playlistCacheGeneration) {
    return;
  }
  await getDb()
    .update(schema.playlist)
    .set({ isFollowed: isFollowed ? 1 : 0, updatedAt: Date.now() })
    .where(eq(schema.playlist.idText, playlistIdText));
};

const removePlaylistIfUnownedAndUnfollowed = async (
  playlistIdText: string,
  generation: number
): Promise<void> => {
  if (generation !== playlistCacheGeneration) {
    return;
  }
  const rows = await getDb()
    .select({
      isOwned: schema.playlist.isOwned,
      isFollowed: schema.playlist.isFollowed,
    })
    .from(schema.playlist)
    .where(eq(schema.playlist.idText, playlistIdText))
    .limit(1);
  const row = rows[0];
  if (row === undefined) {
    return;
  }
  if (row.isOwned === 0 && row.isFollowed === 0) {
    await getDb().delete(schema.playlist).where(eq(schema.playlist.idText, playlistIdText));
  }
};

const assertOnlineWrite = (): void => {
  if (isOfflineModeEnabled()) {
    throw new OfflineModeEnabledError();
  }
};

export type PlaylistMutationResourceType = 'item' | 'clip' | 'soundbite' | 'add-by-rss';

export const playlistRepository = {
  listOwned: async (
    context: MobileAuthRequestContext,
    params: PlaylistListParams,
    options: PlaylistListReadOptions = {}
  ): Promise<ApiListResponse<DTOPlaylist>> => {
    const generation = playlistCacheGeneration;
    await initializeDatabase();
    if (options.refresh === true) {
      return fetchRemoteList(context, 'owned', params, generation);
    }
    return (
      (await readThroughOrFetch<ApiListResponse<DTOPlaylist>>({
        readLocal: async () => listResponseFromCache('owned', params),
        isStale: async () => isWatermarkStale(playlistListWatermarkKey('owned'), PLAYLIST_TTL_MS),
        fetchRemote: async () => fetchRemoteList(context, 'owned', params, generation),
      })) ?? paginateList([], params.page, PLAYLIST_PAGE_LIMIT)
    );
  },

  listFollowed: async (
    context: MobileAuthRequestContext,
    params: PlaylistListParams,
    options: PlaylistListReadOptions = {}
  ): Promise<ApiListResponse<DTOPlaylist>> => {
    const generation = playlistCacheGeneration;
    await initializeDatabase();
    if (options.refresh === true) {
      return fetchRemoteList(context, 'followed', params, generation);
    }
    return (
      (await readThroughOrFetch<ApiListResponse<DTOPlaylist>>({
        readLocal: async () => listResponseFromCache('followed', params),
        isStale: async () =>
          isWatermarkStale(playlistListWatermarkKey('followed'), PLAYLIST_TTL_MS),
        fetchRemote: async () => fetchRemoteList(context, 'followed', params, generation),
      })) ?? paginateList([], params.page, PLAYLIST_PAGE_LIMIT)
    );
  },

  listFollowedCached: async (): Promise<DTOPlaylist[]> => {
    await initializeDatabase();
    return listPlaylistsByKindCached('followed');
  },

  hasListCache: async (kind: PlaylistListKind): Promise<boolean> => {
    return (await readSyncWatermark(playlistListWatermarkKey(kind))) !== null;
  },

  getByIdText: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    options: PlaylistDetailReadOptions = {}
  ): Promise<DTOPlaylist> => {
    const generation = playlistCacheGeneration;
    await initializeDatabase();
    if (options.refresh === true) {
      return fetchRemotePlaylistByIdText(context, playlistIdText, generation);
    }

    const localOrRemote = await readThroughOrFetch<DTOPlaylist>({
      readLocal: async () => {
        const rows = await getDb()
          .select()
          .from(schema.playlist)
          .where(eq(schema.playlist.idText, playlistIdText))
          .limit(1);
        const row = rows[0];
        return row === undefined ? null : playlistFromRow(row);
      },
      isStale: async () =>
        isWatermarkStale(playlistDetailWatermarkKey(playlistIdText), PLAYLIST_TTL_MS),
      fetchRemote: async () => fetchRemotePlaylistByIdText(context, playlistIdText, generation),
    });
    if (localOrRemote === null) {
      return fetchRemotePlaylistByIdText(context, playlistIdText, generation);
    }
    return localOrRemote;
  },

  create: async (
    context: MobileAuthRequestContext,
    params: {
      title: string;
      description?: string;
      medium: QueryParamsQueueMedium;
      sharable_status_id: number;
    }
  ): Promise<DTOPlaylist> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await initializeDatabase();
    const playlist = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistCreate(params)
    );
    await upsertPlaylists([playlist], { markOwned: true }, generation);
    if (generation === playlistCacheGeneration) {
      await writeSyncWatermark(playlistListWatermarkKey('owned'), Date.now());
      await projectLibraryBrowseFromCache();
    }
    return playlist;
  },

  edit: async (
    context: MobileAuthRequestContext,
    params: {
      id_text: string;
      title: string;
      description?: string;
      sharable_status_id: number;
    }
  ): Promise<DTOPlaylist> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await initializeDatabase();
    const playlist = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistEdit(params)
    );
    await upsertPlaylists([playlist], { markOwned: true }, generation);
    if (generation === playlistCacheGeneration) {
      await projectLibraryBrowseFromCache();
    }
    return playlist;
  },

  delete: async (context: MobileAuthRequestContext, playlistIdText: string): Promise<void> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await initializeDatabase();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistDelete(playlistIdText)
    );
    if (generation !== playlistCacheGeneration) {
      return;
    }
    await getDb().transaction(async (transaction) => {
      await transaction.delete(schema.playlist).where(eq(schema.playlist.idText, playlistIdText));
      await transaction
        .delete(schema.playlistResource)
        .where(eq(schema.playlistResource.playlistIdText, playlistIdText));
    });
    await writeSyncWatermark(playlistResourceAllWatermarkKey(playlistIdText), Date.now());
    await projectLibraryBrowseFromCache();
  },

  follow: async (context: MobileAuthRequestContext, playlistIdText: string): Promise<void> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await initializeDatabase();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqAccountFollowPlaylist({ playlist_id_text: playlistIdText })
    );
    const playlist = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistGet(playlistIdText)
    );
    await upsertPlaylists([playlist], { markFollowed: true }, generation);
    if (generation === playlistCacheGeneration) {
      await writeSyncWatermark(playlistListWatermarkKey('followed'), Date.now());
      await projectLibraryBrowseFromCache();
    }
  },

  unfollow: async (context: MobileAuthRequestContext, playlistIdText: string): Promise<void> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await initializeDatabase();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqAccountUnfollowPlaylist({ playlist_id_text: playlistIdText })
    );
    await updateFollowState(playlistIdText, false, generation);
    await removePlaylistIfUnownedAndUnfollowed(playlistIdText, generation);
    if (generation === playlistCacheGeneration) {
      await writeSyncWatermark(playlistListWatermarkKey('followed'), Date.now());
      await projectLibraryBrowseFromCache();
    }
  },

  getResourcesPrivateAll: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    options: PlaylistResourceReadOptions = {}
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    await initializeDatabase();
    if (options.refresh === true) {
      return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
    }
    return (
      (await readThroughOrFetch<DTOPlaylistResource[]>({
        readLocal: async () => {
          const watermark = await readSyncWatermark(
            playlistResourceAllWatermarkKey(playlistIdText)
          );
          const resources = await readPlaylistResourcesCached(playlistIdText);
          if (watermark === null && resources.length === 0) {
            return null;
          }
          return resources;
        },
        isStale: async () =>
          isWatermarkStale(playlistResourceAllWatermarkKey(playlistIdText), PLAYLIST_TTL_MS),
        fetchRemote: async () =>
          fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation),
      })) ?? []
    );
  },

  getResourcesPage: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    page: number,
    options: PlaylistResourceReadOptions = {}
  ): Promise<ApiListResponse<DTOPlaylistResource>> => {
    const generation = playlistCacheGeneration;
    await initializeDatabase();
    const safePage = page > 0 ? page : 1;
    if (options.refresh === true) {
      const response = await requestWithMobileAuthRefresh(context, async (api) =>
        api.reqPlaylistResourceGetManyByPlaylistIdText(playlistIdText, { page: safePage })
      );
      await upsertPlaylistResources(playlistIdText, response.data, generation);
      if (generation === playlistCacheGeneration) {
        await writeSyncWatermark(
          playlistResourcePageWatermarkKey(playlistIdText, safePage),
          Date.now()
        );
      }
      return response;
    }
    return (
      (await readThroughOrFetch<ApiListResponse<DTOPlaylistResource>>({
        readLocal: async () => {
          const watermark = await readSyncWatermark(
            playlistResourcePageWatermarkKey(playlistIdText, safePage)
          );
          const resources = await readPlaylistResourcesCached(playlistIdText);
          const paged = paginateList(resources, safePage, RESOURCE_PAGE_LIMIT);
          if (watermark === null && paged.data.length === 0) {
            return null;
          }
          return paged;
        },
        isStale: async () =>
          isWatermarkStale(
            playlistResourcePageWatermarkKey(playlistIdText, safePage),
            PLAYLIST_TTL_MS
          ),
        fetchRemote: async () => {
          const response = await requestWithMobileAuthRefresh(context, async (api) =>
            api.reqPlaylistResourceGetManyByPlaylistIdText(playlistIdText, { page: safePage })
          );
          await upsertPlaylistResources(playlistIdText, response.data, generation);
          if (generation === playlistCacheGeneration) {
            await writeSyncWatermark(
              playlistResourcePageWatermarkKey(playlistIdText, safePage),
              Date.now()
            );
          }
          return response;
        },
      })) ?? paginateList([], safePage, RESOURCE_PAGE_LIMIT)
    );
  },

  addItemFirst: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    itemIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemAddFirst(playlistIdText, itemIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addItemLast: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    itemIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemAddLast(playlistIdText, itemIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addItemBetween: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    itemIdText: string,
    position1: number,
    position2: number
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemAddBetween(
        playlistIdText,
        itemIdText,
        toBetweenParams(position1, position2)
      )
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  deleteItem: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    itemIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemDelete(playlistIdText, itemIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addClipFirst: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    clipIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceClipAddFirst(playlistIdText, clipIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addClipLast: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    clipIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceClipAddLast(playlistIdText, clipIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addClipBetween: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    clipIdText: string,
    position1: number,
    position2: number
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceClipAddBetween(
        playlistIdText,
        clipIdText,
        toBetweenParams(position1, position2)
      )
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  deleteClip: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    clipIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceClipDelete(playlistIdText, clipIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addSoundbiteFirst: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    soundbiteIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemSoundbiteAddFirst(playlistIdText, soundbiteIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addSoundbiteLast: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    soundbiteIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemSoundbiteAddLast(playlistIdText, soundbiteIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addSoundbiteBetween: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    soundbiteIdText: string,
    position1: number,
    position2: number
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemSoundbiteAddBetween(
        playlistIdText,
        soundbiteIdText,
        toBetweenParams(position1, position2)
      )
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  deleteSoundbite: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    soundbiteIdText: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemSoundbiteDelete(playlistIdText, soundbiteIdText)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addAddByRssFirst: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    addByRssResourceData: AddByRSSResourceData
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemAddByRSSAddFirst(playlistIdText, {
        add_by_rss_resource_data: addByRssResourceData,
      })
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addAddByRssLast: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    addByRssResourceData: AddByRSSResourceData
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemAddByRSSAddLast(playlistIdText, {
        add_by_rss_resource_data: addByRssResourceData,
      })
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  addAddByRssBetween: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    addByRssResourceData: AddByRSSResourceData,
    position1: number,
    position2: number
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemAddByRSSAddBetween(playlistIdText, {
        add_by_rss_resource_data: addByRssResourceData,
        ...toBetweenParams(position1, position2),
      })
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  deleteAddByRss: async (
    context: MobileAuthRequestContext,
    playlistIdText: string,
    addByRssHashId: string
  ): Promise<DTOPlaylistResource[]> => {
    const generation = playlistCacheGeneration;
    assertOnlineWrite();
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqPlaylistResourceItemAddByRSSDelete(playlistIdText, addByRssHashId)
    );
    return fetchAndReplaceResourcesPrivateAll(context, playlistIdText, generation);
  },

  /** Drop every cached playlist and its resources, then refresh the car browse index. */
  clearAll: async (): Promise<void> => {
    playlistCacheGeneration += 1;
    await initializeDatabase();
    await getDb().transaction(async (transaction) => {
      await transaction.delete(schema.playlist);
      await transaction.delete(schema.playlistResource);
    });
    await projectLibraryBrowseFromCache();
  },
};
