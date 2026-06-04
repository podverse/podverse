import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { SearchPageClient } from './SearchPageClient';

export async function generateMetadata() {
  // Search results are client-fetched and highly query-specific, so keep this route out of index.
  return buildNoindexMetadata('Search');
}

export default function SearchPage() {
  return <SearchPageClient />;
}
