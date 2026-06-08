# 03 — Share builder E2E and cleanup

## Objective

Expand Share → Embed Builder E2E to cover remaining Phase 4 URL mapping contexts
and remove unused Phase 1 placeholder UI.

## Scope

- Add E2E cases in `embed-share-builder.spec.ts` (or split file if readability suffers).
- Delete orphan `EmbedRoutePlaceholder` component and styles if still unused.
- No builder feature changes unless a test reveals a mapping bug.

## Share builder E2E matrix

Add handoff tests (Share → Create Embed → assert preview `iframe[src]` and code field)
for at least:

| Context | Page route | Expected embed path |
| --- | --- | --- |
| Track | `/track/{music track id}` | `/embed/track/{id}` |
| Clip | `/clip/{clip id}` | `/embed/clip/{id}` |
| Chapter | chapter page for seeded chapter | `/embed/chapter/{id}` |
| Podcast list toggle | `/podcast/{channel}` (no item focus) or channel page with list layout | `/embed/podcast/{id}` when list layout selected |
| Album list toggle | `/album/{album id}` with list layout | `/embed/album/{id}` |
| Playlist | `/playlist/{public playlist id}` | `/embed/playlist/{id}` |

Use existing seeded constants from `seedConstants.ts`. For list-toggle cases, exercise
the builder's list-layout control (`listLayout` / UI toggle) and assert path switches
from single-item to list route when applicable.

Keep episode and official-clip tests; extend — do not replace.

## Cleanup

Remove if unreferenced after grep:

- `/apps/web/src/components/embed/EmbedRoutePlaceholder.tsx`
- `/apps/web/src/components/embed/EmbedRoutePlaceholder.module.scss` (or path under styles/)

## File targets

- `/apps/web/e2e/embed-share-builder.spec.ts`
- `/apps/web/e2e/helpers/seedConstants.ts` (only if new navigation constants needed)
- Orphan placeholder files (delete)

## Acceptance criteria

- Builder E2E covers all entity kinds in Phase 4 mapping table (episode and official-clip
  already covered; this phase adds the rest).
- List vs single layout toggle produces correct path for podcast and album channel contexts.
- No references to `EmbedRoutePlaceholder` or `embed-route-shell` testid remain.
- Official-clip regression (`/embed/official-clip/`, not `/soundbite/`) still asserted.

## Operator verification

```bash
npm run lint
make e2e_test_web_report_spec SPEC=e2e/embed-share-builder.spec.ts
```

Review `.artifacts/e2e-reports/latest/web/index.html`.
