import { ManagementApiRequestService } from './apiRequestService.js';

export type StorageFeatureResponse =
  { enabled: false } | { enabled: true; provider: string; bucketName: string };

export type StorageObjectListItem = {
  key: string;
  size: number;
  lastModified: string | null;
  etag: string | null;
};

export type StorageListObjectsResponse = {
  objects: StorageObjectListItem[];
  nextContinuationToken: string | null;
  isTruncated: boolean;
  prefix: string;
};

export type StorageObjectMetadataResponse = {
  key: string;
  contentType: string;
  contentLength: number;
  lastModified: string | null;
  etag: string | null;
};

export type StorageBulkDeleteResponse = {
  deleted: string[];
  failed: { key: string; error: string }[];
};

export type StorageCountResponse = {
  count: number;
  exact: boolean;
};

export type StorageDeleteAllByPrefixResponse = {
  deleted: number;
  failed: { key: string; error: string }[];
  requested: number;
};

export async function getStorageFeature(jwt?: string): Promise<StorageFeatureResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<StorageFeatureResponse>({
    path: '/storage',
    method: 'GET',
  });
}

/** Whether the bucket lists at least one object at the root prefix (no continuation scan). */
export async function probeStorageBucketHasObjects(jwt?: string): Promise<boolean> {
  const res = await listStorageObjects({ maxKeys: 1 }, jwt);
  return res.objects.length > 0 || res.isTruncated;
}

export async function listStorageObjects(
  params: {
    prefix?: string;
    continuationToken?: string;
    maxKeys?: number;
  },
  jwt?: string
): Promise<StorageListObjectsResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<StorageListObjectsResponse>({
    path: '/storage/objects',
    method: 'GET',
    config: {
      params: {
        ...(params.prefix !== undefined && params.prefix !== '' ? { prefix: params.prefix } : {}),
        ...(params.continuationToken !== undefined && params.continuationToken !== ''
          ? { continuationToken: params.continuationToken }
          : {}),
        ...(params.maxKeys !== undefined ? { maxKeys: params.maxKeys } : {}),
      },
    },
  });
}

export async function getStorageObjectMetadata(
  key: string,
  jwt?: string
): Promise<StorageObjectMetadataResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<StorageObjectMetadataResponse>({
    path: '/storage/objects/metadata',
    method: 'GET',
    config: { params: { key } },
  });
}

/** Same-origin URL for `<a href>` download (browser sends auth cookies). */
export function getStorageObjectDownloadUrl(key: string, apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  const encoded = new URLSearchParams({ key });
  return `${base}/storage/objects/download?${encoded.toString()}`;
}

export async function deleteStorageObject(
  key: string,
  jwt?: string
): Promise<{ deleted: string[] }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ deleted: string[] }>({
    path: '/storage/objects',
    method: 'DELETE',
    config: { params: { key } },
  });
}

export async function bulkDeleteStorageObjects(
  keys: string[],
  jwt?: string
): Promise<StorageBulkDeleteResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<StorageBulkDeleteResponse>({
    path: '/storage/objects/bulk-delete',
    method: 'POST',
    data: { keys },
  });
}

export async function countStorageObjectsByPrefix(
  prefix: string,
  jwt?: string
): Promise<StorageCountResponse> {
  const service = new ManagementApiRequestService({ jwt });
  const trimmed = prefix.trim();
  return service.apiRequest<StorageCountResponse>({
    path: '/storage/objects/count',
    method: 'GET',
    config: {
      params: trimmed === '' ? {} : { prefix: trimmed },
    },
  });
}

export async function deleteAllStorageObjectsByPrefix(
  prefix: string,
  jwt?: string
): Promise<StorageDeleteAllByPrefixResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<StorageDeleteAllByPrefixResponse>({
    path: '/storage/objects/delete-all-by-prefix',
    method: 'POST',
    data: { prefix },
  });
}
