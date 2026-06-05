import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { PlaylistCreatePageClient } from './PlaylistCreatePageClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function PlaylistCreatePage() {
  return <PlaylistCreatePageClient />;
}
