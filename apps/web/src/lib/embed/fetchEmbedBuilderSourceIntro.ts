import { ROUTES } from '../../constants/routes';
import type { EmbedBuilderQueryParams } from './embedBuilderTypes';
import {
  resolveEmbedBuilderSourceKind,
  type EmbedBuilderSourceKind,
  type EmbedBuilderSourceKindParams,
} from './resolveEmbedBuilderSourceKind';

export function buildEmbedBuilderSourcePagePath(
  params: EmbedBuilderSourceKindParams
): string | null {
  const kind = resolveEmbedBuilderSourceKind(params);

  switch (kind) {
    case 'official_clip':
      return params.itemSoundbite !== null
        ? `${ROUTES.OFFICIAL_CLIP}/${params.itemSoundbite}`
        : null;
    case 'chapter':
      return params.itemChapter !== null ? `${ROUTES.CHAPTER}/${params.itemChapter}` : null;
    case 'clip':
      return params.clip !== null ? `${ROUTES.CLIP}/${params.clip}` : null;
    case 'playlist':
      return params.playlist !== null ? `${ROUTES.PLAYLIST}/${params.playlist}` : null;
    case 'track':
      return params.item !== null ? `${ROUTES.TRACK}/${params.item}` : null;
    case 'episode':
      return params.item !== null ? `${ROUTES.EPISODE}/${params.item}` : null;
    case 'album':
      return params.channel !== null ? `${ROUTES.ALBUM}/${params.channel}` : null;
    case 'podcast':
      return params.channel !== null ? `${ROUTES.PODCAST}/${params.channel}` : null;
    default:
      return null;
  }
}

function resolveEmbedBuilderSourceTitleFallback(
  params: EmbedBuilderSourceKindParams,
  kind: EmbedBuilderSourceKind
): string {
  switch (kind) {
    case 'official_clip':
      return params.itemSoundbite ?? '';
    case 'chapter':
      return params.itemChapter ?? '';
    case 'clip':
      return params.clip ?? '';
    case 'playlist':
      return params.playlist ?? '';
    case 'track':
    case 'episode':
      return params.item ?? '';
    case 'album':
    case 'podcast':
      return params.channel ?? '';
    default:
      return '';
  }
}

export type EmbedBuilderSourceIntroModel = {
  kind: Exclude<EmbedBuilderSourceKind, 'default'>;
  title: string;
  sourcePagePath: string;
};

export async function fetchEmbedBuilderSourceIntro(
  params: EmbedBuilderQueryParams
): Promise<EmbedBuilderSourceIntroModel | null> {
  const kind = resolveEmbedBuilderSourceKind(params);
  const sourcePagePath = buildEmbedBuilderSourcePagePath(params);

  if (kind === 'default' || sourcePagePath === null) {
    return null;
  }

  const {
    getChannelForSeoPage,
    getClipForSeoPage,
    getItemChapterForSeoPage,
    getItemForSeoPage,
    getItemSoundbiteForSeoPage,
    getPlaylistForSeoPage,
  } = await import('../seo/fetchers');

  let title: string | null = null;

  try {
    if (kind === 'podcast' || kind === 'album') {
      if (params.channel !== null) {
        const channel = await getChannelForSeoPage(params.channel);
        title = channel?.title ?? null;
      }
    } else if (kind === 'episode' || kind === 'track') {
      if (params.item !== null) {
        const item = await getItemForSeoPage(params.item);
        title = item?.title ?? null;
      }
    } else if (kind === 'playlist') {
      if (params.playlist !== null) {
        const playlist = await getPlaylistForSeoPage(params.playlist);
        title = playlist?.title ?? null;
      }
    } else if (kind === 'clip') {
      if (params.clip !== null) {
        const clip = await getClipForSeoPage(params.clip);
        title = clip?.title ?? null;
      }
    } else if (kind === 'chapter') {
      if (params.itemChapter !== null) {
        const chapter = await getItemChapterForSeoPage(params.itemChapter);
        title = chapter?.title ?? null;
      }
    } else if (kind === 'official_clip') {
      if (params.itemSoundbite !== null) {
        const soundbite = await getItemSoundbiteForSeoPage(params.itemSoundbite);
        title = soundbite?.title ?? null;
      }
    }
  } catch {
    title = null;
  }

  const resolvedTitle = title ?? resolveEmbedBuilderSourceTitleFallback(params, kind);
  if (resolvedTitle === '') {
    return null;
  }

  return {
    kind,
    title: resolvedTitle,
    sourcePagePath,
  };
}
