import { EmbedListShell } from '../../components/embed/EmbedListShell';
import { EmbedNotAvailableShell } from '../../components/embed/EmbedNotAvailableShell';
import { EmbedNotFoundShell } from '../../components/embed/EmbedNotFoundShell';
import { EmbedSingleShell } from '../../components/embed/EmbedSingleShell';
import { buildEmbedRuntime } from '../../lib/embed/buildEmbedRuntime';
import type {
  EmbedAlbumListQueryParams,
  EmbedEpisodeChaptersListQueryParams,
  EmbedPlaylistListQueryParams,
  EmbedPodcastListQueryParams,
  EmbedPresentationQuery,
  EmbedRouteKind,
} from '../../lib/embed/embedTypes';
import { fetchEmbedListData } from '../../lib/embed/fetchEmbedListData';
import { fetchEmbedSingleResource } from '../../lib/embed/fetchEmbedSingleResource';
import {
  parseEmbedAlbumListQueryParams,
  parseEmbedEpisodeChaptersListQueryParams,
  parseEmbedPlaylistListQueryParams,
  parseEmbedPodcastListQueryParams,
} from '../../lib/embed/parseEmbedQueryParams';
import {
  resolveEmbedMediaType,
  resolveEmbedPlayerSizeFromChannel,
} from '../../lib/embed/resolveEmbedMediaType';

type EmbedTypedRoutePageProps = {
  routeKind: EmbedRouteKind;
  resourceId: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function EmbedTypedRoutePage({
  routeKind,
  resourceId,
  searchParams,
}: EmbedTypedRoutePageProps) {
  const rawSearchParams = await searchParams;
  const runtime = buildEmbedRuntime({
    routeKind,
    resourceId,
    rawSearchParams,
  });

  if (runtime.layoutType === 'list') {
    if (runtime.listQuery === null) {
      return <EmbedNotFoundShell />;
    }

    let listResult;

    if (routeKind === 'playlist') {
      listResult = await fetchEmbedListData({
        routeKind: 'playlist',
        resourceId,
        listQuery: parseEmbedPlaylistListQueryParams(rawSearchParams),
      });
    } else if (routeKind === 'album') {
      listResult = await fetchEmbedListData({
        routeKind: 'album',
        resourceId,
        listQuery: parseEmbedAlbumListQueryParams(rawSearchParams),
      });
    } else if (routeKind === 'podcast') {
      listResult = await fetchEmbedListData({
        routeKind: 'podcast',
        resourceId,
        listQuery: parseEmbedPodcastListQueryParams(rawSearchParams),
      });
    } else if (routeKind === 'episode-chapters') {
      listResult = await fetchEmbedListData({
        routeKind: 'episode-chapters',
        resourceId,
        listQuery: parseEmbedEpisodeChaptersListQueryParams(rawSearchParams),
      });
    } else {
      return <EmbedNotFoundShell />;
    }

    if (listResult.status === 'not_found') {
      return <EmbedNotFoundShell />;
    }

    if (listResult.status === 'not_available') {
      return <EmbedNotAvailableShell />;
    }

    const playIdText = getPlayIdTextFromListQuery(runtime.listQuery);

    return (
      <EmbedListShell
        listData={listResult.listData}
        listQuery={runtime.listQuery}
        playIdText={playIdText}
        sharedQuery={runtime.sharedQuery}
      />
    );
  }

  const resource = await fetchEmbedSingleResource(routeKind, resourceId);

  if (resource === null) {
    return <EmbedNotFoundShell />;
  }

  const mediaPreference: EmbedPresentationQuery = runtime.sharedQuery.presentationLocked
    ? runtime.sharedQuery.presentation
    : resolveEmbedMediaType(resource.channel);

  const effectiveSharedQuery = {
    ...runtime.sharedQuery,
    playerSize: runtime.sharedQuery.playerSizeLocked
      ? runtime.sharedQuery.playerSize
      : resolveEmbedPlayerSizeFromChannel(resource.channel),
  };

  return (
    <EmbedSingleShell
      mediaPreference={mediaPreference}
      resource={resource}
      sharedQuery={effectiveSharedQuery}
    />
  );
}

function getPlayIdTextFromListQuery(
  listQuery:
    | EmbedPodcastListQueryParams
    | EmbedAlbumListQueryParams
    | EmbedPlaylistListQueryParams
    | EmbedEpisodeChaptersListQueryParams
): string | null {
  return listQuery.playIdText;
}
