export type ImageShrinkHint = {
  url: string;
  entityType: 'channel' | 'item';
  hintCreatedAt: string;
};

export type ImageHintsResult = {
  imageHints: ImageShrinkHint[];
};

export function hasImageHints(value: unknown): value is ImageHintsResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('imageHints' in value)) {
    return false;
  }
  const hints = (value as { imageHints?: unknown }).imageHints;
  return Array.isArray(hints);
}
