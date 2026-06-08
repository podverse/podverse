---
name: global-web-404-hardening
overview: Audit all Podverse Next.js pages for unhandled SSR 404s and implement a centralized, clean loader boundary that guarantees missing resources resolve to `notFound()` instead of repeated server-error rendering.
todos:
  - id: status-extractor
    content: Implement shared API error status extraction helper for axios-style errors
    status: pending
  - id: shared-loader-boundary
    content: Add `apps/web/src/lib/ssr/loadOrNotFound.ts` with 404->notFound and non-404 rethrow semantics
    status: pending
  - id: wire-seo-fetchers
    content: Refactor `apps/web/src/lib/seo/fetchers.ts` (or dedicated route loaders) to use shared boundary
    status: pending
  - id: migrate-risk-pages
    content: Apply shared loader pattern to all confirmed-risk dynamic page routes
    status: pending
  - id: remove-dead-guards
    content: Delete dead null checks after awaited throwing fetches and keep intentional redirect semantics
    status: pending
  - id: tests
    content: Add unit + focused route behavior tests for 404 mapping and non-404 passthrough
    status: pending
  - id: future-guardrail
    content: Add concise repository guidance requiring dynamic detail pages to use shared loader boundary
    status: pending
isProject: false
---

# Global Page 404 Hardening

## Findings from full route audit
- This is **not** an actual redirect loop in your log. It is repeated server re-rendering after an unhandled thrown 404 in a route page.
- In `apps/web`, this pattern appears in multiple dynamic detail pages (not just podcast): route body awaits a throwing API fetch without route-safe handling.
- `generateMetadata` often has try/catch, but the page body often does not, so metadata is safe while render still fails.
- `apps/management-web` does not currently show the same systemic pattern; server pages there generally catch and redirect/fallback.

## Confirmed risk scope (apps/web)
High-risk route pages include:
- `/episode/[item_id]`
- `/track/[item_id]`
- `/podcast/[channel_id]`
- `/album/[channel_id]`
- `/podcast/livestream/[item_id]`
- `/music/livestream/[item_id]`
- `/clip/[clip_id]`
- `/chapter/[item_chapter_id_text]`
- `/official-clip/[item_soundbite_id]`
- `/podcast-index/feed/[podcast_index_id]` (non-404 error path also possible)

## Architectural fix (single high-order boundary)
Implement one shared server-page loader utility in `apps/web` that becomes the only detail-route data boundary:

1. Add a small HTTP status extractor in `helpers-requests` (or locally in web if preferred) that reliably reads axios-style status from unknown errors.
2. Add `apps/web/src/lib/ssr/loadOrNotFound.ts` with strict behavior:
   - If status is 404: call `notFound()`.
   - Otherwise: rethrow (do not swallow 5xx/network/auth errors).
3. Route SEO/data fetchers through this boundary (or equivalent dedicated loaders):
   - `apps/web/src/lib/seo/fetchers.ts` becomes safe by default.
4. Apply that boundary to all detail-page loaders so every missing entity is deterministic `notFound()`.
5. Keep endpoint-specific semantics where APIs intentionally return 200 + null (do not force 404 behavior there unless product wants it).

## Why this is not a workaround
- It creates a clear contract at a single architectural seam: “detail data load for route render”.
- It preserves observability and correctness by only mapping explicit 404.
- It avoids per-page copy/paste try/catch and dead null checks.
- It scales to future pages with one import pattern and code review rule.

## Hardening additions
- Add unit tests for the new `loadOrNotFound` behavior (404 mapped, non-404 rethrown).
- Add focused page tests for a representative route (e.g. podcast + episode) ensuring unknown id resolves to Not Found page behavior.
- Add a small engineering rule/skill note so new dynamic pages must use the shared loader boundary.

## Rollout order
1. Introduce helper + tests.
2. Update `seo/fetchers.ts` (or page loader layer) to use helper.
3. Update all confirmed-risk pages.
4. Remove dead `if (!entity) notFound()` checks that can never execute after thrown requests.
5. Add/adjust docs/rules for future-proofing.
