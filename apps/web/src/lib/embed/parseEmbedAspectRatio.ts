import type { EmbedAspectRatioQuery } from './embedAspectRatio';
import { DEFAULT_EMBED_ASPECT_RATIO, isEmbedAspectRatioQuery } from './embedAspectRatio';

export function parseEmbedAspectRatio(value: unknown): EmbedAspectRatioQuery {
  if (typeof value !== 'string') {
    return DEFAULT_EMBED_ASPECT_RATIO;
  }

  const normalized = value.trim();
  if (normalized === '') {
    return DEFAULT_EMBED_ASPECT_RATIO;
  }

  return isEmbedAspectRatioQuery(normalized) ? normalized : DEFAULT_EMBED_ASPECT_RATIO;
}
