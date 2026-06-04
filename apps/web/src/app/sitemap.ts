import type { MetadataRoute } from 'next';

import { getWebOrigin } from '../config';

const STATIC_SITEMAP_PATHS = [
  '/',
  '/podcasts',
  '/episodes',
  '/artists',
  '/albums',
  '/tracks',
  '/podcasts/livestreams',
  '/music/livestreams',
  '/playlists',
  '/clips',
  '/videos',
  '/profiles',
  '/about',
  '/contact',
  '/terms',
  '/donate',
  '/mobile-app',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return STATIC_SITEMAP_PATHS.map((path) => ({
    url: new URL(path, getWebOrigin()).toString(),
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.8,
  }));
}

// TODO(phase-4+): add dynamic RSS content URLs (channels/items/profiles/playlists) to sitemap.
