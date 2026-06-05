# Phase 3 — Crawl/index policy (robots, sitemap, noindex)

## Goal

Define explicit crawl policy: index public content and product pages; block auth,
utility, admin, and selected operational routes.

## `apps/web/src/app/robots.ts`

Export default Next.js robots config:

```typescript
import type { MetadataRoute } from 'next';

import { getWebOrigin } from '../config';

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
      ],
    },
    sitemap: `${getWebOrigin()}/sitemap.xml`,
  };
}
```

Adjust list to match final route inventory in `routeSeoPolicy.ts`.

## `apps/web/src/app/sitemap.ts`

**Phase 3 baseline (static):** include fixed indexable paths:

- `/`
- `/podcasts`, `/episodes`, `/artists`, `/albums`, `/tracks`
- `/podcasts/livestreams`, `/music/livestreams`
- `/playlists`, `/clips`, `/videos`, `/profiles`
- `/about`, `/contact`, `/terms`, `/donate`, `/mobile-app`, `/updates`

**Follow-up (document as TODO in file):** dynamic entries for channels/items via API
or incremental generation job. Do not block phase 3 on full dynamic sitemap.

Use `MetadataRoute.Sitemap` with `url`, `lastModified`, `changeFrequency`, `priority`.

## Route-level `noindex` metadata

Add `generateMetadata` returning `buildNoindexMetadata()` (phase 1) on:

| File |
| --- |
| `apps/web/src/app/settings/page.tsx` |
| `apps/web/src/app/search/page.tsx` |
| `apps/web/src/app/history/page.tsx` |
| `apps/web/src/app/queues/page.tsx` |
| `apps/web/src/app/my-profile/page.tsx` |
| `apps/web/src/app/my-clips/page.tsx` |
| `apps/web/src/app/sign-up/page.tsx` |
| `apps/web/src/app/reset-password/page.tsx` |
| `apps/web/src/app/verify-email/page.tsx` |
| `apps/web/src/app/set-password/page.tsx` |
| `apps/web/src/app/forgot-password/page.tsx` |
| `apps/web/src/app/email-change/page.tsx` |
| `apps/web/src/app/email-change-verifying/page.tsx` |
| `apps/web/src/app/checkout/page.tsx` |
| `apps/web/src/app/membership/page.tsx` |
| `apps/web/src/app/membership/renew/page.tsx` |
| `apps/web/src/app/embed/page.tsx` |
| `apps/web/src/app/playlist/create/page.tsx` |
| `apps/web/src/app/playlist/edit/[playlist_id]/page.tsx` |
| `apps/web/src/app/clip/edit/[clip_id]/page.tsx` |
| `apps/web/src/app/test-error-boundaries/page.tsx` |
| `apps/web/src/app/e2e/media-player-foundation/page.tsx` |
| `apps/web/src/app/takedown-notice/[podcast_index_id]/page.tsx` |

For `add-by-rss/**`: add `layout.tsx` under `apps/web/src/app/add-by-rss/` with
default `robots: { index: false, follow: false }` metadata export (covers subtree).

## management-web global noindex

File: `apps/management-web/src/app/layout.tsx`

Add:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: { default: brandName, template: '%s | ' + brandName },
};
```

Remove manual `<title>` if Metadata API replaces it (mirror web pattern).

Optional: `apps/management-web/src/app/robots.ts` disallow all.

## Staging defense-in-depth

Document in code comment near `robots.ts`:

- Operators may enable `X-Robots-Tag` in `infra/proxy/proxy.conf` for non-prod.
- App-level `noindex` on utility routes is still required for prod.

## Indexable routes must not set noindex

Ensure phases 2a/2b routes do **not** inherit accidental noindex from a parent layout.
Only class-D routes and management-web get `noindex`.

## Exit criteria

- `GET /robots.txt` returns valid rules + sitemap reference.
- `GET /sitemap.xml` returns baseline static URLs.
- Noindex routes emit `<meta name="robots" content="noindex, nofollow">` in SSR HTML.
- management-web all routes noindex.

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
```

Manual:

```bash
curl -s http://localhost:4032/robots.txt
curl -s http://localhost:4032/sitemap.xml
curl -s http://localhost:4032/settings | rg -i 'noindex'
```

Phase 6 adds Playwright coverage.
