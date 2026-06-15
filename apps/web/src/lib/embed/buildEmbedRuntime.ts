import type { EmbedRouteKind, EmbedRuntimeModel } from './embedTypes';
import { EMBED_PLAYBACK_GUARDRAILS } from './embedTypes';
import { requiresPublicListVisibility } from './embedVisibility';
import { getEmbedLayoutType } from './getEmbedLayoutType';
import {
  parseEmbedAlbumListQueryParams,
  parseEmbedEpisodeChaptersListQueryParams,
  parseEmbedPlaylistListQueryParams,
  parseEmbedPodcastListQueryParams,
  parseEmbedSingleQueryParams,
} from './parseEmbedQueryParams';

type BuildEmbedRuntimeInput = {
  routeKind: EmbedRouteKind;
  resourceId: string | null;
  rawSearchParams: Record<string, string | string[] | undefined>;
};

export function buildEmbedRuntime(input: BuildEmbedRuntimeInput): EmbedRuntimeModel {
  const layoutType = getEmbedLayoutType(input.routeKind);
  const sharedQuery = parseEmbedSingleQueryParams(input.rawSearchParams);

  let listQuery: EmbedRuntimeModel['listQuery'] = null;

  if (input.routeKind === 'podcast') {
    listQuery = parseEmbedPodcastListQueryParams(input.rawSearchParams);
  } else if (input.routeKind === 'album') {
    listQuery = parseEmbedAlbumListQueryParams(input.rawSearchParams);
  } else if (input.routeKind === 'playlist') {
    listQuery = parseEmbedPlaylistListQueryParams(input.rawSearchParams);
  } else if (input.routeKind === 'episode-chapters') {
    listQuery = parseEmbedEpisodeChaptersListQueryParams(input.rawSearchParams);
  }

  return {
    routeKind: input.routeKind,
    resourceId: input.resourceId,
    layoutType,
    mediaType: 'unknown',
    playbackGuardrails: EMBED_PLAYBACK_GUARDRAILS,
    requiresPublicListVisibility: requiresPublicListVisibility(input.routeKind),
    sharedQuery: listQuery ?? sharedQuery,
    listQuery,
  };
}
