import { ManagementApiRequestService } from './apiRequestService.js';

export type CatalogAllowlistOrigin = 'deployment' | 'admin';

export type CatalogAllowlistFeed = {
  podcast_index_id: number;
  resolved_podcast_index_id: number | null;
  origin: CatalogAllowlistOrigin;
  title: string | null;
  feed_url: string | null;
  stored: boolean;
  removable: boolean;
};

export type CatalogAllowlistDirectoryHit = {
  podcast_index_id: number;
  title: string;
  feed_url: string;
  author: string;
  already_allowed: boolean;
};

export type AddCatalogAllowlistFeedBody = {
  podcast_index_id: number;
  title?: string | null;
  feed_url?: string | null;
};

export async function getCatalogAllowlist(): Promise<{ feeds: CatalogAllowlistFeed[] }> {
  const service = new ManagementApiRequestService();
  return service.apiRequest({ path: '/feeds/catalog-allowlist' });
}

export async function searchCatalogAllowlistDirectory(
  query: string
): Promise<{ feeds: CatalogAllowlistDirectoryHit[] }> {
  const service = new ManagementApiRequestService();
  const params = new URLSearchParams({ q: query });
  return service.apiRequest({
    path: `/feeds/catalog-allowlist/directory-search?${params.toString()}`,
  });
}

export async function addCatalogAllowlistFeed(
  body: AddCatalogAllowlistFeedBody
): Promise<{ podcast_index_id: number; origin: CatalogAllowlistOrigin }> {
  const service = new ManagementApiRequestService();
  return service.apiRequest({
    path: '/feeds/catalog-allowlist',
    method: 'POST',
    data: body,
  });
}

export async function removeCatalogAllowlistFeed(podcastIndexId: number): Promise<void> {
  const service = new ManagementApiRequestService();
  await service.apiRequest({
    path: `/feeds/catalog-allowlist/${podcastIndexId}`,
    method: 'DELETE',
  });
}
