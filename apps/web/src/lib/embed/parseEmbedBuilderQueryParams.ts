import { z } from 'zod';

import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';

import { parsePlaybackSeconds } from '../playback/parsePlaybackSeconds';
import { DEFAULT_EMBED_BORDER_COLOR, sanitizeEmbedBorderColor } from './embedBorderColor';
import type { EmbedBuilderQueryParams } from './embedBuilderTypes';
import {
  EMBED_BUILDER_LIST_CONTENT_TYPES,
  EMBED_BUILDER_LIST_SORT_VALUES,
  EMBED_BUILDER_TYPES,
  normalizeEmbedBuilderType,
} from './embedBuilderTypes';
import { normalizeEmbedSearchParams } from './normalizeEmbedSearchParams';
import { parseEmbedAspectRatio } from './parseEmbedAspectRatio';
import { parseEmbedAutoResize } from './parseEmbedAutoResize';
import { parseEmbedChapterMarkers } from './parseEmbedChapterMarkers';
import { EMBED_LIST_VISIBLE_ROWS_DEFAULT, parseEmbedListRows } from './parseEmbedListRows';
import {
  resolveDefaultMediaPreferenceForPlayerSize,
  resolveEmbedBuilderPresentation,
} from './resolveEmbedBuilderPresentation';

function parseEmbedBuilderTypeValue(value: unknown): (typeof EMBED_BUILDER_TYPES)[number] {
  if (typeof value === 'string') {
    const normalized = normalizeEmbedBuilderType(value);
    if (normalized !== undefined) {
      return normalized;
    }
  }

  return 'short';
}

const builderQuerySchema = z.object({
  type: z
    .preprocess(parseEmbedBuilderTypeValue, z.enum(EMBED_BUILDER_TYPES))
    .optional()
    .default('short'),
  prefer: z.enum(['audio', 'video']).optional(),
  channel: z.string().trim().min(1).optional().nullable().default(null),
  medium_id: z
    .preprocess((value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }

      const parsed = Number.parseInt(String(value), 10);
      if (Number.isNaN(parsed)) {
        return null;
      }

      return parsed;
    }, z.number().int().nullable())
    .optional()
    .nullable()
    .default(null),
  item: z.string().trim().min(1).optional().nullable().default(null),
  clip: z.string().trim().min(1).optional().nullable().default(null),
  chapter: z.string().trim().min(1).optional().nullable().default(null),
  official_clip: z.string().trim().min(1).optional().nullable().default(null),
  playlist: z.string().trim().min(1).optional().nullable().default(null),
  playlist_item: z.string().trim().min(1).optional().nullable().default(null),
  sort: z.string().trim().min(1).optional().nullable().default(null),
  list_content: z.enum(EMBED_BUILDER_LIST_CONTENT_TYPES).optional().default('episodes'),
  list_sort: z.enum(EMBED_BUILDER_LIST_SORT_VALUES).optional().default('recent'),
  list_range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
  t: z
    .preprocess((value) => parsePlaybackSeconds(value) ?? 0, z.number())
    .optional()
    .default(0),
  play_id_text: z.string().trim().min(1).optional().nullable().default(null),
  rows: z
    .preprocess(parseEmbedListRows, z.number())
    .optional()
    .default(EMBED_LIST_VISIBLE_ROWS_DEFAULT),
  resize: z.preprocess(parseEmbedAutoResize, z.boolean()).optional().default(false),
  chapter_markers: z.preprocess(parseEmbedChapterMarkers, z.boolean()).optional().default(true),
  ar: z
    .preprocess(parseEmbedAspectRatio, z.enum(['16x9', '4x3', '1x1']))
    .optional()
    .default('16x9'),
  border: z.string().trim().min(1).optional().nullable().default(null),
});

function parseSchemaWithDefaults(
  raw: Record<string, string | string[] | undefined>
): z.infer<typeof builderQuerySchema> {
  const normalized = normalizeEmbedSearchParams(raw);
  const parsed = builderQuerySchema.safeParse(normalized);

  if (parsed.success) {
    return parsed.data;
  }

  return builderQuerySchema.parse({});
}

export function parseEmbedBuilderQueryParams(
  raw: Record<string, string | string[] | undefined>
): EmbedBuilderQueryParams {
  const parsed = parseSchemaWithDefaults(raw);
  const { playerSize } = resolveEmbedBuilderPresentation(parsed.type);
  const mediaPreference =
    parsed.prefer ?? resolveDefaultMediaPreferenceForPlayerSize(playerSize);

  return {
    type: parsed.type,
    mediaPreference,
    channel: parsed.channel,
    mediumId: parsed.medium_id,
    item: parsed.item,
    clip: parsed.clip,
    itemChapter: parsed.chapter,
    itemSoundbite: parsed.official_clip,
    playlist: parsed.playlist,
    playlistItem: parsed.playlist_item,
    sort: parsed.sort,
    listContentType: parsed.list_content,
    listSort: parsed.list_sort,
    listRange: parsed.list_range,
    startSeconds: parsed.t,
    playIdText: parsed.play_id_text,
    listVisibleRows: parsed.rows,
    autoResize: parsed.resize,
    showChapterMarkers: parsed.chapter_markers,
    aspectRatio: parsed.ar,
    borderColor:
      parsed.border !== null ? sanitizeEmbedBorderColor(parsed.border) : DEFAULT_EMBED_BORDER_COLOR,
  };
}
