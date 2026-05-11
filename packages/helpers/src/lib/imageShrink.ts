export type ImageShrinkHint = {
  url: string;
  entityType: 'channel' | 'item';
  hintCreatedAt: string;
};

export type ImageHintsResult = {
  imageHints: ImageShrinkHint[];
};

export const SHRINK_ELIGIBLE_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;

export type ShrinkEligibleImageExtension = (typeof SHRINK_ELIGIBLE_IMAGE_EXTENSIONS)[number];

/** Match image extension before optional query/hash (`.jpg`, `?format=webp` style path suffixes not supported). */
const extractImageExtension = (url: string): string | null => {
  const match = url.match(/(\.|\?)(jpg|jpeg|png|webp|gif)(?=($|\?|#))/i);
  if (!match || !match[2]) {
    return null;
  }
  return match[2].toLowerCase();
};

export function isShrinkEligibleImageUrl(url: string): boolean {
  const extension = extractImageExtension(url);
  if (extension === null) {
    return false;
  }
  return (SHRINK_ELIGIBLE_IMAGE_EXTENSIONS as readonly string[]).includes(extension);
}

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
