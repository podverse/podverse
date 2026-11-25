import { cookies } from 'next/headers';

import { SEARCH_LIST_SORT_PREF_SCOPE } from '@podverse/helpers';

import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';
import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { getParsedLocalSettings, getStoredSortPref } from '../../utils/localSettings/localSettings';
import { SearchPageClient } from './SearchPageClient';
import { searchMediumForCatalog } from './searchPageMedium';

export async function generateMetadata() {
  // Search results are client-fetched and highly query-specific, so keep this route out of index.
  return buildNoindexMetadata('Search');
}

export default async function SearchPage() {
  const stored = getStoredSortPref(
    getParsedLocalSettings(await cookies()),
    SEARCH_LIST_SORT_PREF_SCOPE
  );

  return (
    <SearchPageClient
      initialMedium={searchMediumForCatalog(stored, getCatalogConfig().musicEnabled)}
    />
  );
}
