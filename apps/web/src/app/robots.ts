import type { MetadataRoute } from 'next';

import { getWebOrigin } from '../config';

// Operators can additionally enforce non-prod crawler behavior with X-Robots-Tag in proxy config.
// App-level rules remain required so production utility/auth routes stay noindex-discoverable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/settings',
        '/search',
        '/history',
        '/queues',
        '/my-profile',
        '/my-clips',
        '/sign-up',
        '/reset-password',
        '/verify-email',
        '/set-password',
        '/forgot-password',
        '/email-change',
        '/email-change-verifying',
        '/checkout',
        '/membership',
        '/membership/renew',
        '/embed',
        '/add-by-rss/',
        '/playlist/create',
        '/playlist/edit/',
        '/clip/edit/',
        '/e2e/',
        '/test-error-boundaries',
        '/takedown-notice/',
      ],
    },
    sitemap: `${getWebOrigin()}/sitemap.xml`,
  };
}
