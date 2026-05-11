import { getStorageObjectDownloadUrl as getStorageObjectDownloadUrlFromPackage } from '@podverse/management-api-requests';

import { getManagementApiClientBaseUrl } from './managementApiBaseUrl';

import './configureManagementApiRequests';

export * from '@podverse/management-api-requests';

/** Same-origin URL for `<a href>` download (browser sends auth cookies). */
export function getStorageObjectDownloadUrl(key: string): string {
  return getStorageObjectDownloadUrlFromPackage(key, getManagementApiClientBaseUrl());
}
