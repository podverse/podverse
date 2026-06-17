import type {
  QueryParamsChannelMusicAlbumSort,
  QueryParamsChannelMusicAlbumType,
  QueryParamsChannelSort,
  QueryParamsChannelType,
  QueryParamsStatsRange,
} from '@podverse/helpers-requests';

import type { EmbedAspectRatioQuery } from './embedAspectRatio';

export type EmbedLayoutType = 'single' | 'list' | 'index';

export type EmbedMediaType = 'audio' | 'video' | 'unknown';

export type EmbedRouteKind =
  | 'index'
  | 'episode'
  | 'track'
  | 'clip'
  | 'chapter'
  | 'official-clip'
  | 'podcast'
  | 'album'
  | 'playlist'
  | 'episode-chapters';

export type EmbedEpisodeChaptersSort = 'asc' | 'desc';

export type EmbedPlaybackGuardrails = {
  isEmbedRoute: boolean;
  skipAnonymousPlaybackRestore: boolean;
  skipAutoQueueMutations: boolean;
  skipMainAppLayoutMutations: boolean;
  /** When `compact`, video enclosures play through the audio orchestrator without responsive UI. */
  embedPlayerSize: EmbedPlayerSizeQuery | null;
};

export const EMBED_PLAYBACK_GUARDRAILS: EmbedPlaybackGuardrails = {
  isEmbedRoute: true,
  skipAnonymousPlaybackRestore: true,
  skipAutoQueueMutations: true,
  skipMainAppLayoutMutations: true,
  embedPlayerSize: null,
};

export type EmbedPresentationQuery = 'audio' | 'video';

export type EmbedPlayerSizeQuery = 'compact' | 'responsive';

export type EmbedSharedQueryParams = {
  startSeconds: number;
  showChapterMarkers: boolean;
  aspectRatio: EmbedAspectRatioQuery;
  /** Enclosure preference (prefer audio vs prefer video). */
  presentation: EmbedPresentationQuery;
  presentationLocked: boolean;
  /** Player chrome / iframe height (compact vs responsive). */
  playerSize: EmbedPlayerSizeQuery;
  playerSizeLocked: boolean;
};

export type EmbedSingleQueryParams = EmbedSharedQueryParams;

export type EmbedPodcastListQueryParams = EmbedSharedQueryParams & {
  type: QueryParamsChannelType;
  sort: QueryParamsChannelSort;
  page: number;
  range: QueryParamsStatsRange | null;
  playIdText: string | null;
  listVisibleRows: number;
};

export type EmbedAlbumListQueryParams = EmbedSharedQueryParams & {
  type: QueryParamsChannelMusicAlbumType;
  sort: QueryParamsChannelMusicAlbumSort;
  page: number;
  range: QueryParamsStatsRange | null;
  playIdText: string | null;
  listVisibleRows: number;
};

export type EmbedPlaylistListQueryParams = EmbedSharedQueryParams & {
  page: number;
  playIdText: string | null;
  listVisibleRows: number;
};

// Episode-chapters lists are not paginated; `sort` is applied client-side (asc/desc).
export type EmbedEpisodeChaptersListQueryParams = EmbedSharedQueryParams & {
  sort: EmbedEpisodeChaptersSort;
  page: number;
  playIdText: string | null;
  listVisibleRows: number;
};

export type EmbedRuntimeModel = {
  routeKind: EmbedRouteKind;
  resourceId: string | null;
  layoutType: EmbedLayoutType;
  mediaType: EmbedMediaType;
  playbackGuardrails: EmbedPlaybackGuardrails;
  requiresPublicListVisibility: boolean;
  sharedQuery: EmbedSharedQueryParams;
  listQuery:
    | EmbedPodcastListQueryParams
    | EmbedAlbumListQueryParams
    | EmbedPlaylistListQueryParams
    | EmbedEpisodeChaptersListQueryParams
    | null;
};
