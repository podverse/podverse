# Phase 06 — Runtime locale showcase and i18n

## Tasks

1. `resolveEmbedDemoShowcaseFromFixtures()` reads locale via `getLocale()` with `en-US` fallback.
2. Map showcase slots to locale-specific `resourceIdText` from catalog.
3. Move showcase labels to i18n keys (`embed_demo_showcase_*`) in all four originals.
4. Update [`apps/web/src/app/embed/page.tsx`](../../../apps/web/src/app/embed/page.tsx) to use translated labels.

## Fallback

Unsupported locale → treat as `en-US`.
