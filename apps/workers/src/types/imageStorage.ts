/**
 * Provider-agnostic contract for image CDN storage used by the image shrink pipeline.
 * Implementations upload by key and expose public URLs as (cdnBaseUrl + key).
 * Allows swapping Digital Ocean Spaces for another provider (e.g. AWS S3, Cloudflare R2)
 * by supplying a different implementation at bootstrap.
 */

export type ImageStorageUploadParams = {
  bucket: string;
  key: string;
  body: Uint8Array;
  contentType: string;
  cacheControl?: string;
};

export type ImageStoragePublicUrlParams = {
  cdnBaseUrl: string;
  key: string;
};

export type ImageStorageService = {
  uploadResizedImage(params: ImageStorageUploadParams): Promise<void>;
  getPublicUrl(params: ImageStoragePublicUrlParams): string;
};
