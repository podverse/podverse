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
  EmbedPlaylistListQueryParams,
  EmbedPodcastListQueryParams,
  EmbedSharedQueryParams,
  EmbedSingleQueryParams,
} from './embedTypes';
import { normalizeEmbedSearchParams } from './normalizeEmbedSearchParams';
import { parseEmbedAutoplay } from './parseEmbedAutoplay';
import { parseEmbedChapterMarkers } from './parseEmbedChapterMarkers';

const sharedQuerySchema = z.object({
  autoplay: z.preprocess(parseEmbedAutoplay, z.boolean()).optional().default(false),
  t: z.preprocess((value) => parsePlaybackSeconds(value) ?? 0, z.number()).optional().default(0),
  chapter_markers: z
    .preprocess(parseEmbedChapterMarkers, z.boolean())
    .optional()
    .default(true),
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
  range: z
    .enum(QUERY_PARAMS_STATS_RANGE_VALUES)
    .optional()
    .nullable()
    .default(null),
  play_id_text: z.string().trim().min(1).optional().nullable().default(null),
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
  range: z
    .enum(QUERY_PARAMS_STATS_RANGE_VALUES)
    .optional()
    .nullable()
    .default(null),
  play_id_text: z.string().trim().min(1).optional().nullable().default(null),
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

function mapSharedQuery(parsed: z.infer<typeof sharedQuerySchema>): EmbedSharedQueryParams {
  return {
    autoplay: parsed.autoplay,
    startSeconds: parsed.t,
    showChapterMarkers: parsed.chapter_markers,
  };
}

export function parseEmbedSingleQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedSingleQueryParams {
  const parsed = parseSchemaWithDefaults(singleQuerySchema, raw);
  return mapSharedQuery(parsed);
}

export function parseEmbedPodcastListQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedPodcastListQueryParams {
  const parsed = parseSchemaWithDefaults(podcastListQuerySchema, raw);

  return {
    ...mapSharedQuery(parsed),
    type: parsed.type,
    sort: parsed.sort,
    page: parsed.page,
    range: parsed.range,
    playIdText: parsed.play_id_text,
  };
}

export function parseEmbedAlbumListQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedAlbumListQueryParams {
  const parsed = parseSchemaWithDefaults(albumListQuerySchema, raw);

  return {
    ...mapSharedQuery(parsed),
    type: parsed.type,
    sort: parsed.sort,
    page: parsed.page,
    range: parsed.range,
    playIdText: parsed.play_id_text,
  };
}

export function parseEmbedPlaylistListQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedPlaylistListQueryParams {
  const parsed = parseSchemaWithDefaults(playlistListQuerySchema, raw);

  return {
    ...mapSharedQuery(parsed),
    page: parsed.page,
    playIdText: parsed.play_id_text,
  };
}
