export const EMBED_ASPECT_RATIO_VALUES = ['16x9', '4x3', '1x1'] as const;

export type EmbedAspectRatioQuery = (typeof EMBED_ASPECT_RATIO_VALUES)[number];

export const DEFAULT_EMBED_ASPECT_RATIO: EmbedAspectRatioQuery = '16x9';

export function isEmbedAspectRatioQuery(value: string): value is EmbedAspectRatioQuery {
  return EMBED_ASPECT_RATIO_VALUES.includes(value as EmbedAspectRatioQuery);
}

export function embedAspectRatioToCssValue(ar: EmbedAspectRatioQuery): string {
  switch (ar) {
    case '16x9':
      return '16 / 9';
    case '4x3':
      return '4 / 3';
    case '1x1':
      return '1 / 1';
  }
}

export function embedAspectRatioToPaddingBottomPercent(ar: EmbedAspectRatioQuery): number {
  switch (ar) {
    case '16x9':
      return 56.25;
    case '4x3':
      return 75;
    case '1x1':
      return 100;
  }
}

export function embedAspectRatioToValue(ar: EmbedAspectRatioQuery): number {
  switch (ar) {
    case '16x9':
      return 16 / 9;
    case '4x3':
      return 4 / 3;
    case '1x1':
      return 1;
  }
}
