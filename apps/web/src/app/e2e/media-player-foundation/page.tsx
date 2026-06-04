import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { MediaPlayerFoundationPageClient } from './MediaPlayerFoundationPageClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function MediaPlayerFoundationPage() {
  return <MediaPlayerFoundationPageClient />;
}
