# 02 — Reorder single demo sections and trim demo page

Today `apps/web/src/app/embed/page.tsx` renders showcases in API order (DB `showcase_id ASC` -> alphabetical). Switch to canonical catalog order and restrict which slots appear on the demo page.

## Desired single order

episode-audio, episode-video, track-audio, track-video, chapter-audio, chapter-video, clip-audio, clip-video (official-clip dropped from the demo page; route stays live).

## Tasks

1. Reorder `EMBED_DEMO_SHOWCASE_IDS` / `EMBED_DEMO_SHOWCASE_SLOT_DEFS` in `packages/helpers/src/lib/constants/embedDemoShowcase.ts` and the matching catalog in `apps/web/src/lib/embed/embedDemoShowcaseCatalog.ts` to the desired display order.
2. In `apps/web/src/lib/embed/resolveEmbedDemoShowcase.ts` (or `apps/web/src/app/embed/page.tsx`), sort resolved entries by their index in the catalog instead of relying on API order.
3. Filter out `official-clip-*` and `playlist-*` from the demo page (routes stay live; only the demo listing hides them).
4. Confirm the TOC (`apps/web/src/lib/embed/buildEmbedDemoTocItems.ts`) mirrors the page automatically (it maps over the same split arrays).

## Verification

```bash
npm run test -w apps/web -- src/lib/embed/__tests__
make e2e_test_web_report_spec SPEC=e2e/embed.spec.ts
```
