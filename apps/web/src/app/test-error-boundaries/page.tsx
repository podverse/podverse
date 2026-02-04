import { TestErrorBoundariesPageClient } from './TestErrorBoundariesPageClient';

export default function TestErrorBoundariesPage() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <TestErrorBoundariesPageClient />;
}
