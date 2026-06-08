# Goal

Fix embed image rendering so embed artwork no longer remains stuck on loading spinners by correcting seeded image URLs and ensuring a reliable placeholder fallback path.

# Scope

- Seed data and fixture URL consistency for embed image fields in:
  - `tools/web/seed-e2e.mjs`
  - `tools/web/seed-embed-fixtures.mjs`
  - `tools/web/embed-fixture-constants.mjs`
- Placeholder image fallback behavior in:
  - `apps/web/src/constants/images.ts`
  - `apps/web/src/components/embed/EmbedPlayerInfo.tsx`
- Add and use local fixture images under:
  - `tools/test-assets/assets/e2e/images` (new)
- Document the updated fixture and fallback behavior in:
  - `docs/features/EMBED-PLAYER.md`

# Steps

1. Audit current embed image source values in `tools/web/embed-fixture-constants.mjs` and map which URLs are invalid, missing, or not reachable in local/test contexts.
2. Correct seed URL generation and usage in `tools/web/seed-e2e.mjs` and `tools/web/seed-embed-fixtures.mjs` so seeded embed entities consistently point to valid local test image assets.
3. Add canonical local embed image fixtures to `tools/test-assets/assets/e2e/images` (new) and ensure seed scripts reference these files through stable served URLs.
4. Update `apps/web/src/constants/images.ts` so embed-specific fallback/placeholder constants resolve to a guaranteed-available local placeholder.
5. Update `apps/web/src/components/embed/EmbedPlayerInfo.tsx` to apply placeholder fallback correction when image load fails or image URLs are absent, preventing indefinite spinner state.
6. Confirm docs coverage in `docs/features/EMBED-PLAYER.md` for:
   - how embed fixture images are seeded/served,
   - expected fallback behavior,
   - where to update fixture assets in future.

# Done Criteria

- Seed URL correction is implemented: seeded embed image URLs from `tools/web/seed-e2e.mjs` and `tools/web/seed-embed-fixtures.mjs` resolve to valid assets defined via `tools/web/embed-fixture-constants.mjs`.
- Placeholder fallback correction is implemented: embed artwork in `apps/web/src/components/embed/EmbedPlayerInfo.tsx` reliably transitions from loading state to a visible image or placeholder from `apps/web/src/constants/images.ts`.
- Local image fixtures exist in `tools/test-assets/assets/e2e/images` and are referenced by seed logic.
- `docs/features/EMBED-PLAYER.md` reflects the updated seed and fallback behavior.
