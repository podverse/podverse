import type {
  QueryParamsChannelMusicAlbumSort,
  QueryParamsChannelMusicAlbumType,
  QueryParamsChannelSort,
  QueryParamsChannelType,
  QueryParamsStatsRange,
} from '@podverse/helpers-requests';

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
  | 'playlist';

export type EmbedPlaybackGuardrails = {
  isEmbedRoute: boolean;
  skipAnonymousPlaybackRestore: boolean;
  skipAutoQueueMutations: boolean;
  skipMainAppLayoutMutations: boolean;
};

export const EMBED_PLAYBACK_GUARDRAILS: EmbedPlaybackGuardrails = {
  isEmbedRoute: true,
  skipAnonymousPlaybackRestore: true,
  skipAutoQueueMutations: true,
  skipMainAppLayoutMutations: true,
};

export type EmbedSharedQueryParams = {
  autoplay: boolean;
  startSeconds: number;
  showChapterMarkers: boolean;
};

export type EmbedSingleQueryParams = EmbedSharedQueryParams;

export type EmbedPodcastListQueryParams = EmbedSharedQueryParams & {
  type: QueryParamsChannelType;
  sort: QueryParamsChannelSort;
  page: number;
  range: QueryParamsStatsRange | null;
  playIdText: string | null;
};

export type EmbedAlbumListQueryParams = EmbedSharedQueryParams & {
  type: QueryParamsChannelMusicAlbumType;
  sort: QueryParamsChannelMusicAlbumSort;
  page: number;
  range: QueryParamsStatsRange | null;
  playIdText: string | null;
};

export type EmbedPlaylistListQueryParams = EmbedSharedQueryParams & {
  page: number;
  playIdText: string | null;
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
    | null;
};
