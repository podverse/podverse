import { z } from 'zod';

import { parsePlaybackSeconds } from '../playback/parsePlaybackSeconds';
import type { EmbedBuilderQueryParams } from './embedBuilderTypes';
import { EMBED_BUILDER_TYPES } from './embedBuilderTypes';
import { normalizeEmbedSearchParams } from './normalizeEmbedSearchParams';
import { parseEmbedAutoplay } from './parseEmbedAutoplay';
import { parseEmbedChapterMarkers } from './parseEmbedChapterMarkers';
import { defaultAutoplayForEmbedBuilderType } from './resolveEmbedBuilderPresentation';

const builderQuerySchema = z.object({
  type: z.enum(EMBED_BUILDER_TYPES).optional().default('audio'),
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
  autoplay: z.preprocess(parseEmbedAutoplay, z.boolean()).optional(),
  t: z
    .preprocess((value) => parsePlaybackSeconds(value) ?? 0, z.number())
    .optional()
    .default(0),
  play_id_text: z.string().trim().min(1).optional().nullable().default(null),
  chapter_markers: z.preprocess(parseEmbedChapterMarkers, z.boolean()).optional().default(true),
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
  const autoplay =
    parsed.autoplay !== undefined
      ? parsed.autoplay
      : defaultAutoplayForEmbedBuilderType(parsed.type);

  return {
    type: parsed.type,
    channel: parsed.channel,
    mediumId: parsed.medium_id,
    item: parsed.item,
    clip: parsed.clip,
    itemChapter: parsed.chapter,
    itemSoundbite: parsed.official_clip,
    playlist: parsed.playlist,
    playlistItem: parsed.playlist_item,
    sort: parsed.sort,
    autoplay,
    startSeconds: parsed.t,
    playIdText: parsed.play_id_text,
    showChapterMarkers: parsed.chapter_markers,
  };
}
