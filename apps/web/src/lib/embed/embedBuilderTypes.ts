import { MediumEnum } from '@podverse/helpers';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

import type { EmbedAspectRatioQuery } from './embedAspectRatio';
import type { EmbedPresentationQuery } from './embedTypes';

export const EMBED_BUILDER_TYPES = ['short', 'tall', 'short-list', 'tall-list'] as const;

export type EmbedBuilderType = (typeof EMBED_BUILDER_TYPES)[number];

/** Legacy builder `type` query values accepted for backwards compatibility. */
export const EMBED_BUILDER_TYPE_LEGACY_ALIASES: Record<string, EmbedBuilderType> = {
  audio: 'short',
  video: 'tall',
  'audio-list': 'short-list',
  'video-list': 'tall-list',
};

export function normalizeEmbedBuilderType(value: string): EmbedBuilderType | undefined {
  if ((EMBED_BUILDER_TYPES as readonly string[]).includes(value)) {
    return value as EmbedBuilderType;
  }

  return EMBED_BUILDER_TYPE_LEGACY_ALIASES[value];
}

export const EMBED_BUILDER_LIST_CONTENT_TYPES = ['episodes', 'clips', 'tracks', 'chapters'] as const;

export type EmbedBuilderListContentType = (typeof EMBED_BUILDER_LIST_CONTENT_TYPES)[number];

export const EMBED_BUILDER_LIST_SORT_VALUES = [
  'recent',
  'oldest',
  'top',
  'forward',
  'backward',
  'asc',
  'desc',
] as const;

export type EmbedBuilderListSort = (typeof EMBED_BUILDER_LIST_SORT_VALUES)[number];

/**
 * The sort that maps to the underlying list route default (and therefore is omitted from the embed
 * URL) for each list content type.
 */
export const EMBED_BUILDER_LIST_DEFAULT_SORT_BY_CONTENT: Record<
  EmbedBuilderListContentType,
  EmbedBuilderListSort
> = {
  episodes: 'recent',
  clips: 'recent',
  tracks: 'forward',
  chapters: 'asc',
};

/**
 * The sort options offered for each list content type, in display order. The first entry is the
 * default sort for that content type.
 */
export const EMBED_BUILDER_LIST_SORT_OPTIONS_BY_CONTENT: Record<
  EmbedBuilderListContentType,
  readonly EmbedBuilderListSort[]
> = {
  episodes: ['recent', 'oldest', 'top'],
  clips: ['recent', 'top'],
  tracks: ['forward', 'backward', 'top'],
  chapters: ['asc', 'desc'],
};

/**
 * Resolves the list content types that make sense for the builder's current source resource.
 *
 * - playlist source -> no content selector (playlist order is fixed)
 * - music/album channel -> tracks
 * - podcast channel -> episodes or clips
 * - episode/item (non-music) -> chapters
 */
export function resolveEmbedBuilderListContentOptions(params: {
  channel: string | null;
  mediumId: number | null;
  item: string | null;
  playlist: string | null;
}): EmbedBuilderListContentType[] {
  if (params.playlist !== null) {
    return [];
  }

  const options: EmbedBuilderListContentType[] = [];

  if (params.channel !== null) {
    if (params.mediumId === MediumEnum.Music) {
      options.push('tracks');
    } else {
      options.push('episodes', 'clips');
    }
  }

  if (params.item !== null && params.mediumId !== MediumEnum.Music) {
    options.push('chapters');
  }

  return options;
}

export type EmbedBuilderQueryParams = {
  type: EmbedBuilderType;
  mediaPreference: EmbedPresentationQuery;
  channel: string | null;
  mediumId: number | null;
  item: string | null;
  clip: string | null;
  itemChapter: string | null;
  itemSoundbite: string | null;
  playlist: string | null;
  playlistItem: string | null;
  sort: string | null;
  listContentType: EmbedBuilderListContentType;
  listSort: EmbedBuilderListSort;
  listRange: QueryParamsStatsRange | null;
  startSeconds: number;
  playIdText: string | null;
  listVisibleRows: number;
  autoResize: boolean;
  showChapterMarkers: boolean;
  aspectRatio: EmbedAspectRatioQuery;
  borderColor: string;
};

export type EmbedBuilderPresentation = {
  layout: 'single' | 'list';
  playerSize: 'short' | 'tall';
  mediaPreference: EmbedPresentationQuery;
};
