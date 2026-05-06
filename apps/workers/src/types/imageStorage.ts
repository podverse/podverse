/**
 * Provider-agnostic contract for image CDN storage used by the image shrink pipeline.
 * Implementations upload by key and expose public URLs as (cdnBaseUrl + key).
 * Swappable via bootstrap when `BUCKET_PROVIDER` selects an S3-compatible backend.
 */

import type {
  ObjectStorageDeleteParams,
  ObjectStorageListObjectsParams,
  ObjectStorageListObjectsResult,
  ObjectStorageObjectExistsParams,
  ObjectStoragePublicUrlParams,
  ObjectStorageUploadParams,
} from '@podverse/external-services-object-storage';

export type ImageStorageUploadParams = ObjectStorageUploadParams;

export type ImageStoragePublicUrlParams = ObjectStoragePublicUrlParams;

export type ImageStorageListObjectsParams = ObjectStorageListObjectsParams;

export type ImageStorageListObjectsResult = ObjectStorageListObjectsResult;

export type ImageStorageDeleteParams = ObjectStorageDeleteParams;

export type ImageStorageObjectExistsParams = ObjectStorageObjectExistsParams;

export type ImageStorageService = {
  uploadResizedImage(params: ImageStorageUploadParams): Promise<void>;
  getPublicUrl(params: ImageStoragePublicUrlParams): string;
  listObjects(params: ImageStorageListObjectsParams): Promise<ImageStorageListObjectsResult>;
  deleteImageByKey(params: ImageStorageDeleteParams): Promise<void>;
  objectExists(params: ImageStorageObjectExistsParams): Promise<boolean>;
};
