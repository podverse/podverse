import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { TestErrorBoundariesPageClient } from './TestErrorBoundariesPageClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function TestErrorBoundariesPage() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <TestErrorBoundariesPageClient />;
}
