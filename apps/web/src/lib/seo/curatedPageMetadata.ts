import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getConfigResolved } from '../../config/loadPublicClientConfig.server';
import { buildStaticPageMetadata } from './buildStaticPageMetadata';

const CURATED_PAGE_PATHS = {
  home: '/',
  browse: '/browse',
  playlists: '/playlists',
  videos: '/videos',
  profiles: '/profiles',
  faq: '/faq',
  developer: '/developer',
  about: '/about',
  contact: '/contact',
  terms: '/terms',
  donate: '/donate',
  mobileApp: '/mobile-app',
  metaboost: '/v4v/metaboost',
} as const;

export type CuratedSeoPageId = keyof typeof CURATED_PAGE_PATHS;

export const getCuratedStaticPageMetadata = async (pageId: CuratedSeoPageId): Promise<Metadata> => {
  const tSeo = await getTranslations('seo.pages');
  const brandName = (await getConfigResolved()).public.brand.name;

  return buildStaticPageMetadata({
    title: tSeo(`${pageId}.title`, { brand_name: brandName }),
    descriptionPlain: tSeo(`${pageId}.description`, { brand_name: brandName }),
    pathname: CURATED_PAGE_PATHS[pageId],
    brandName,
  });
};
