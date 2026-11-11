import type { ImageShrinkFormat } from '@workers/config/index.js';

import type { HttpCacheMetadata } from '@podverse/helpers-backend';

export type ShrinkSourceCacheSnapshot = {
  etag?: string | null;
  lastModified?: string | null;
  contentLength?: number | null;
  checksumSha256?: string | null;
};

/**
 * When HEAD returns comparable cache headers, treat as unchanged only when:
 * - both sides have ETag and they match, or
 * - neither side has ETag and Last-Modified matches on both sides.
 * Content-Length alone is not trusted (same length, different bytes).
 */
export const trustHeadUnchanged = (
  source: ShrinkSourceCacheSnapshot | null,
  headMeta: HttpCacheMetadata
): boolean => {
  if (!source) {
    return false;
  }
  const headEtag = headMeta.etag ?? null;
  const srcEtag = source.etag ?? null;
  const headLm = headMeta.lastModified ?? null;
  const srcLm = source.lastModified ?? null;

  const headHasEtag = headEtag !== null && headEtag !== '';
  const srcHasEtag = srcEtag !== null && srcEtag !== '';

  if (headHasEtag || srcHasEtag) {
    return headHasEtag && srcHasEtag && headEtag === srcEtag;
  }
  if (headLm !== null && headLm !== '' && srcLm !== null && srcLm !== '') {
    return headLm === srcLm;
  }
  return false;
};

export const bytesMatchStoredChecksum = (
  source: ShrinkSourceCacheSnapshot | null,
  originalBuffer: Uint8Array,
  checksumOf: (buffer: Uint8Array) => string
): boolean => {
  if (!source?.checksumSha256) {
    return false;
  }
  return source.checksumSha256 === checksumOf(originalBuffer);
};

export const shrinkFileExtension = (format: ImageShrinkFormat): 'jpg' | 'webp' => {
  return format === 'jpeg' ? 'jpg' : 'webp';
};

export const shrinkContentType = (format: ImageShrinkFormat): 'image/jpeg' | 'image/webp' => {
  return format === 'jpeg' ? 'image/jpeg' : 'image/webp';
};

/** True when a resized row's URL was encoded in a format other than `format`. */
export const isResizedUrlInOtherFormat = (url: string, format: ImageShrinkFormat): boolean => {
  const path = url.split(/[?#]/)[0] ?? url;
  return !path.toLowerCase().endsWith(`.${shrinkFileExtension(format)}`);
};

export const buildShrinkImageKey = (params: {
  entityType: 'channel' | 'item';
  entityId: number;
  widthPx: number;
  contentChecksumSha256Hex: string;
  urlHash: string;
  format: ImageShrinkFormat;
}): string => {
  const suffix = params.contentChecksumSha256Hex.slice(0, 16);
  const extension = shrinkFileExtension(params.format);
  return `images/${params.entityType}/${params.entityId}/${params.urlHash}-w${params.widthPx}-c${suffix}.${extension}`;
};
