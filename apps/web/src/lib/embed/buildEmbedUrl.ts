import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOPlaylist,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { WEB } from '../../constants/web';
import type { EmbedRouteKind } from './embedTypes';

export type EmbedUrlEntityContext = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  clip: DTOClip | null;
  item_chapter: DTOItemChapter | null;
  item_soundbite: DTOItemSoundbite | null;
  playlist: DTOPlaylist | null;
};

export type EmbedUrlLayoutPreference = 'auto' | 'single' | 'list';

export type EmbedUrlOptions = {
  layout?: EmbedUrlLayoutPreference;
  autoplay?: boolean;
  startSeconds?: number;
  playIdText?: string | null;
  chapterMarkers?: boolean;
  origin?: string;
};

export type EmbedUrlBuildResult = {
  routeKind: EmbedRouteKind;
  pathname: string;
  isListRoute: boolean;
  resourceIdText: string;
};

function resolveChannelListRouteKind(channel: DTOChannel): EmbedRouteKind {
  if (channel.medium_id === MediumEnum.Music) {
    return 'album';
  }

  return 'podcast';
}

function resolveItemSingleRouteKind(channel: DTOChannel): EmbedRouteKind {
  if (channel.medium_id === MediumEnum.Music) {
    return 'track';
  }

  return 'episode';
}

function buildEmbedQueryString(options: {
  autoplay?: boolean;
  startSeconds?: number;
  playIdText?: string | null;
  chapterMarkers?: boolean;
  isListRoute: boolean;
}): string {
  const params = new URLSearchParams();

  if (options.autoplay === true) {
    params.set('autoplay', 'true');
  }

  const startSeconds = options.startSeconds ?? 0;
  if (startSeconds > 0) {
    params.set('t', String(startSeconds));
  }

  if (options.chapterMarkers === false) {
    params.set('chapter_markers', '0');
  }

  if (options.isListRoute && options.playIdText) {
    params.set('play_id_text', options.playIdText);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function resolveEmbedUrlTarget(
  context: EmbedUrlEntityContext,
  layout: EmbedUrlLayoutPreference = 'auto'
): EmbedUrlBuildResult | null {
  const { clip, item_chapter, item_soundbite, item, channel, playlist } = context;

  if (clip?.id_text) {
    return {
      routeKind: 'clip',
      pathname: `/embed/clip/${clip.id_text}`,
      isListRoute: false,
      resourceIdText: clip.id_text,
    };
  }

  if (item_chapter?.id_text) {
    return {
      routeKind: 'chapter',
      pathname: `/embed/chapter/${item_chapter.id_text}`,
      isListRoute: false,
      resourceIdText: item_chapter.id_text,
    };
  }

  if (item_soundbite?.id_text) {
    return {
      routeKind: 'official-clip',
      pathname: `/embed/official-clip/${item_soundbite.id_text}`,
      isListRoute: false,
      resourceIdText: item_soundbite.id_text,
    };
  }

  if (playlist?.id_text) {
    return {
      routeKind: 'playlist',
      pathname: `/embed/playlist/${playlist.id_text}`,
      isListRoute: true,
      resourceIdText: playlist.id_text,
    };
  }

  if (channel?.id_text) {
    const useListLayout = layout === 'list' || (layout === 'auto' && item === null);
    const useSingleLayout = layout === 'single' || (layout === 'auto' && item !== null);

    if (useSingleLayout && item?.id_text) {
      const routeKind = resolveItemSingleRouteKind(channel);
      return {
        routeKind,
        pathname: `/embed/${routeKind}/${item.id_text}`,
        isListRoute: false,
        resourceIdText: item.id_text,
      };
    }

    if (useListLayout) {
      const routeKind = resolveChannelListRouteKind(channel);
      return {
        routeKind,
        pathname: `/embed/${routeKind}/${channel.id_text}`,
        isListRoute: true,
        resourceIdText: channel.id_text,
      };
    }
  }

  return null;
}

export function buildEmbedUrlPath(
  context: EmbedUrlEntityContext,
  options: EmbedUrlOptions = {}
): string | null {
  const target = resolveEmbedUrlTarget(context, options.layout ?? 'auto');
  if (target === null) {
    return null;
  }

  const queryString = buildEmbedQueryString({
    autoplay: options.autoplay,
    startSeconds: options.startSeconds,
    playIdText: options.playIdText,
    chapterMarkers: options.chapterMarkers,
    isListRoute: target.isListRoute,
  });

  return `${target.pathname}${queryString}`;
}

export function buildEmbedUrl(
  context: EmbedUrlEntityContext,
  options: EmbedUrlOptions = {}
): string | null {
  const path = buildEmbedUrlPath(context, options);
  if (path === null) {
    return null;
  }

  const origin = options.origin ?? WEB.origin;
  return `${origin}${path}`;
}
