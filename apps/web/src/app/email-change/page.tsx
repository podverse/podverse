import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { EmailChangePageClient } from './EmailChangePageClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function EmailChangePage() {
  return <EmailChangePageClient />;
}
