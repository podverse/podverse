export type HttpCacheMetadata = {
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
};

export type HttpCacheMetadataOptional = {
  etag?: string | null;
  lastModified?: string | null;
  contentLength?: number | null;
};

/**
 * Normalizes a header value: trims and returns null for empty string.
 */
export function normalizeHeader(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Extracts cache-related metadata from a Response Headers object
 * (etag, last-modified, content-length).
 */
export function getHttpCacheMetadata(headers: Headers): HttpCacheMetadata {
  const etag = normalizeHeader(headers.get('etag'));
  const lastModified = normalizeHeader(headers.get('last-modified'));
  const contentLengthValue = headers.get('content-length');
  const contentLength =
    contentLengthValue && contentLengthValue.trim() !== '' ? Number(contentLengthValue) : null;
  return {
    etag,
    lastModified,
    contentLength: contentLength !== null && !Number.isNaN(contentLength) ? contentLength : null,
  };
}

/**
 * Builds request headers for conditional GET (If-None-Match, If-Modified-Since)
 * from cached metadata.
 */
export function buildConditionalRequestHeaders(source?: {
  etag?: string | null;
  lastModified?: string | null;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (source?.etag) {
    headers['If-None-Match'] = source.etag;
  }
  if (source?.lastModified) {
    headers['If-Modified-Since'] = source.lastModified;
  }
  return headers;
}

/**
 * Converts null cache metadata values to undefined for storage/API use.
 */
export function sanitizeHttpCacheMetadata(metadata: HttpCacheMetadata): HttpCacheMetadataOptional {
  return {
    etag: metadata.etag ?? undefined,
    lastModified: metadata.lastModified ?? undefined,
    contentLength: metadata.contentLength ?? undefined,
  };
}
