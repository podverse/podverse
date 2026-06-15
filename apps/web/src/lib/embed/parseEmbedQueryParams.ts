import { z } from 'zod';

import {
  QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES,
  QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES,
  QUERY_PARAMS_CHANNEL_SORT_VALUES,
  QUERY_PARAMS_CHANNEL_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
} from '@podverse/helpers-requests';

import { parsePlaybackSeconds } from '../playback/parsePlaybackSeconds';
import type {
  EmbedAlbumListQueryParams,
  EmbedEpisodeChaptersListQueryParams,
  EmbedPlaylistListQueryParams,
  EmbedPodcastListQueryParams,
  EmbedSharedQueryParams,
  EmbedSingleQueryParams,
} from './embedTypes';
import { normalizeEmbedSearchParams } from './normalizeEmbedSearchParams';
import { parseEmbedAspectRatio } from './parseEmbedAspectRatio';
import { parseEmbedAutoResize } from './parseEmbedAutoResize';
import { parseEmbedChapterMarkers } from './parseEmbedChapterMarkers';
import { EMBED_LIST_VISIBLE_ROWS_DEFAULT, parseEmbedListRows } from './parseEmbedListRows';
import { resolvePlayerSizeFromPresentation } from './resolvePlayerSizeFromPresentation';

const sharedQuerySchema = z.object({
  t: z
    .preprocess((value) => parsePlaybackSeconds(value) ?? 0, z.number())
    .optional()
    .default(0),
  chapter_markers: z.preprocess(parseEmbedChapterMarkers, z.boolean()).optional().default(true),
  ar: z
    .preprocess(parseEmbedAspectRatio, z.enum(['16x9', '4x3', '1x1']))
    .optional()
    .default('16x9'),
  presentation: z.enum(['audio', 'video']).optional().default('audio'),
  player: z.enum(['short', 'tall']).optional(),
});

const singleQuerySchema = sharedQuerySchema;

const podcastListQuerySchema = sharedQuerySchema.extend({
  type: z.enum(QUERY_PARAMS_CHANNEL_TYPE_VALUES).optional().default('episodes'),
  sort: z.enum(QUERY_PARAMS_CHANNEL_SORT_VALUES).optional().default('recent'),
  page: z
    .preprocess((value) => {
      const parsed = parsePlaybackSeconds(value);
      if (parsed === undefined) {
        return 1;
      }
      const page = Math.floor(parsed);
      return page >= 1 ? page : 1;
    }, z.number())
    .optional()
    .default(1),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
  play_id_text: z.string().trim().min(1).optional().nullable().default(null),
  rows: z
    .preprocess(parseEmbedListRows, z.number())
    .optional()
    .default(EMBED_LIST_VISIBLE_ROWS_DEFAULT),
  resize: z.preprocess(parseEmbedAutoResize, z.boolean()).optional().default(false),
});

const albumListQuerySchema = sharedQuerySchema.extend({
  type: z.enum(QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES).optional().default('tracks'),
  sort: z.enum(QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES).optional().default('forward'),
  page: z
    .preprocess((value) => {
      const parsed = parsePlaybackSeconds(value);
      if (parsed === undefined) {
        return 1;
      }
      const page = Math.floor(parsed);
      return page >= 1 ? page : 1;
    }, z.number())
    .optional()
    .default(1),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
  play_id_text: z.string().trim().min(1).optional().nullable().default(null),
  rows: z
    .preprocess(parseEmbedListRows, z.number())
    .optional()
    .default(EMBED_LIST_VISIBLE_ROWS_DEFAULT),
  resize: z.preprocess(parseEmbedAutoResize, z.boolean()).optional().default(false),
});

const playlistListQuerySchema = sharedQuerySchema.extend({
  page: z
    .preprocess((value) => {
      const parsed = parsePlaybackSeconds(value);
      if (parsed === undefined) {
        return 1;
      }
      const page = Math.floor(parsed);
      return page >= 1 ? page : 1;
    }, z.number())
    .optional()
    .default(1),
  play_id_text: z.string().trim().min(1).optional().nullable().default(null),
  rows: z
    .preprocess(parseEmbedListRows, z.number())
    .optional()
    .default(EMBED_LIST_VISIBLE_ROWS_DEFAULT),
  resize: z.preprocess(parseEmbedAutoResize, z.boolean()).optional().default(false),
});

const episodeChaptersListQuerySchema = sharedQuerySchema.extend({
  sort: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z
    .preprocess((value) => {
      const parsed = parsePlaybackSeconds(value);
      if (parsed === undefined) {
        return 1;
      }
      const page = Math.floor(parsed);
      return page >= 1 ? page : 1;
    }, z.number())
    .optional()
    .default(1),
  play_id_text: z.string().trim().min(1).optional().nullable().default(null),
  rows: z
    .preprocess(parseEmbedListRows, z.number())
    .optional()
    .default(EMBED_LIST_VISIBLE_ROWS_DEFAULT),
  resize: z.preprocess(parseEmbedAutoResize, z.boolean()).optional().default(false),
});

function parseSchemaWithDefaults<T extends z.ZodTypeAny>(
  schema: T,
  raw: Record<string, string | string[] | undefined>
): z.infer<T> {
  const normalized = normalizeEmbedSearchParams(raw);
  const parsed = schema.safeParse(normalized);

  if (parsed.success) {
    return parsed.data;
  }

  return schema.parse({});
}

function mapSharedQuery(
  parsed: z.infer<typeof sharedQuerySchema>,
  raw: Record<string, string | string[] | undefined>
): EmbedSharedQueryParams {
  const normalized = normalizeEmbedSearchParams(raw);
  const playerSize = parsed.player ?? resolvePlayerSizeFromPresentation(parsed.presentation);

  return {
    startSeconds: parsed.t,
    showChapterMarkers: parsed.chapter_markers,
    aspectRatio: parsed.ar,
    presentation: parsed.presentation,
    presentationLocked: normalized.presentation !== undefined,
    playerSize,
    playerSizeLocked: normalized.player !== undefined,
  };
}

export function parseEmbedSingleQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedSingleQueryParams {
  const parsed = parseSchemaWithDefaults(singleQuerySchema, raw);
  return mapSharedQuery(parsed, raw);
}

export function parseEmbedPodcastListQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedPodcastListQueryParams {
  const parsed = parseSchemaWithDefaults(podcastListQuerySchema, raw);

  return {
    ...mapSharedQuery(parsed, raw),
    type: parsed.type,
    sort: parsed.sort,
    page: parsed.page,
    range: parsed.range,
    playIdText: parsed.play_id_text,
    listVisibleRows: parsed.rows,
    autoResize: parsed.resize,
  };
}

export function parseEmbedAlbumListQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedAlbumListQueryParams {
  const parsed = parseSchemaWithDefaults(albumListQuerySchema, raw);

  return {
    ...mapSharedQuery(parsed, raw),
    type: parsed.type,
    sort: parsed.sort,
    page: parsed.page,
    range: parsed.range,
    playIdText: parsed.play_id_text,
    listVisibleRows: parsed.rows,
    autoResize: parsed.resize,
  };
}

export function parseEmbedPlaylistListQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedPlaylistListQueryParams {
  const parsed = parseSchemaWithDefaults(playlistListQuerySchema, raw);

  return {
    ...mapSharedQuery(parsed, raw),
    page: parsed.page,
    playIdText: parsed.play_id_text,
    listVisibleRows: parsed.rows,
    autoResize: parsed.resize,
  };
}

export function parseEmbedEpisodeChaptersListQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedEpisodeChaptersListQueryParams {
  const parsed = parseSchemaWithDefaults(episodeChaptersListQuerySchema, raw);

  return {
    ...mapSharedQuery(parsed, raw),
    sort: parsed.sort,
    page: parsed.page,
    playIdText: parsed.play_id_text,
    listVisibleRows: parsed.rows,
    autoResize: parsed.resize,
  };
}
