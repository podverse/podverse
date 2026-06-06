---
name: podcast-404-loop-hardening
overview: Diagnose the `/podcast/:id` 404 behavior and harden SEO route fetchers so missing resources deterministically return Next.js `notFound()` without accidental retry/redirect loops.
todos:
  - id: add-404-helper
    content: Add exported helper in helpers-requests to identify API 404 errors safely
    status: pending
  - id: wrap-seo-fetchers
    content: Introduce centralized fetcher wrapper in apps/web seo fetchers mapping 404 to notFound
    status: pending
  - id: route-audit-apply
    content: Apply wrapper coverage to all SEO route fetchers used by dynamic content pages
    status: pending
  - id: cleanup-dead-guards
    content: Remove/adjust dead falsy notFound checks that cannot trigger after thrown requests
    status: pending
  - id: tests
    content: Add targeted tests for 404 detection and route notFound behavior
    status: pending
isProject: false
---

# Stop 404 Render Loop Risk

## What is happening now
- The URL `/podcast/As8mB3rOfg` is not redirecting in a loop; it is throwing an unhandled server error in the page render path.
- In [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]/page.tsx), `getChannelForSeoPage(channel_id)` throws on API 404 before any guard can run.
- In [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/lib/seo/fetchers.ts`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/lib/seo/fetchers.ts), SEO fetchers directly call request methods that throw on 404.
- In [`/Users/mitcheldowney/repos/pv/podverse/packages/helpers-requests/src/api/_request.ts`](/Users/mitcheldowney/repos/pv/podverse/packages/helpers-requests/src/api/_request.ts), `ApiRequestService.apiRequest` rethrows errors; it never returns `null` for 404.
- This creates repeated 500 renders/retries in dev UX (looks like a loop), not a redirect loop.

## Implementation approach
1. Add a shared 404 detector helper in `helpers-requests` (e.g., `isApiRequestNotFoundError`) to identify axios-style `response.status === 404`.
2. In `apps/web` SEO fetchers, introduce one centralized wrapper that converts only 404 to `notFound()` and rethrows all non-404 errors.
3. Route every SEO fetcher through that wrapper so all affected routes get consistent behavior (podcast, episode, clip, chapter, album, livestream variants, etc.).
4. Preserve existing non-404 behavior (e.g., upstream 500 still surfaces as error rather than silently pretending not-found).
5. Optional cleanup: remove dead `if (!ssrX) notFound()` checks in routes where awaited calls can only throw on missing data.

## Scope of affected route files (high confidence)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]/page.tsx)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id]/page.tsx)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/clip/[clip_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/clip/[clip_id]/page.tsx)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/chapter/[item_chapter_id_text]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/chapter/[item_chapter_id_text]/page.tsx)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/official-clip/[item_soundbite_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/official-clip/[item_soundbite_id]/page.tsx)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/track/[item_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/track/[item_id]/page.tsx)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/album/[channel_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/album/[channel_id]/page.tsx)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/livestream/[item_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/livestream/[item_id]/page.tsx)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/music/livestream/[item_id]/page.tsx`](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/music/livestream/[item_id]/page.tsx)

## Safety checks
- Confirm no redirect cycle is introduced by ensuring only `notFound()` is used for 404 mapping.
- Keep `generateMetadata` fallback behavior unchanged unless explicitly desired.
- Add focused tests for the new 404 helper and at least one route-level behavior path (404 -> notFound).
