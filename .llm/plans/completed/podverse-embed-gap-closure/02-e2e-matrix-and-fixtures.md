# 02 — E2E matrix and fixtures

## Objective

Close Phase 5 acceptance gaps in embed route E2E coverage, demo index smoke, and
SEO noindex child paths.

## Prerequisites

- Phase 01 complete (optional but recommended before E2E work in same PR).
- Re-seed after fixture changes: `make e2e_seed_web`.

## Scope

- Extend seed + `seedConstants.ts` for scroll and non-public channel cases.
- Extend `embedAssertions.ts` helpers as needed.
- Update `embed-routes.spec.ts`, `embed-demo-index.spec.ts`, `seo-noindex-routes.spec.ts`.

## Seed / fixture additions

| Need | Seed action | Constant(s) |
| --- | --- | --- |
| List scroll overflow | Add ≥8 podcast items to existing E2E podcast channel **or** dedicated `e2eEmbedScrollCh01` with many items | `E2E_EMBED_SCROLL_CHANNEL_ID_TEXT` |
| Non-public channel list | Channel with `feed_policy.public_visible = false` (mirror podcast page takedown pattern) | `E2E_EMBED_PRIVATE_CHANNEL_ID_TEXT` |

Document default row expectations in `embedDemoLinks.ts` / demo page if scroll channel
has a deterministic default.

## E2E additions — `embed-routes.spec.ts`

Add or extend tests for:

1. **Invalid IDs:** `/embed/chapter/{invalid}`, `/embed/official-clip/{invalid}` →
   `embed-not-found-shell`.
2. **Track query params:** `/embed/track/{id}?autoplay=true&t=10` loads shell; URL retains params.
3. **List height:** assert `embed-list-shell` bounding box height ≈ 640px (use existing
   `expectEmbedShellHeightStable` pattern from single embed).
4. **List scroll:** on scroll fixture channel, assert `embed-list-region` has
   `overflow-y: auto` (or scrollable) and `scrollHeight > clientHeight`; optionally scroll
   and assert a lower row becomes visible.
5. **Playlist invalid `play_id_text`:** falls back to default row (mirror podcast test).
6. **Private channel list:** `/embed/podcast/{private}` → `embed-not-available`.

## E2E additions — `embed-demo-index.spec.ts`

- Iterate all 12 demo links from `embedDemoLinks.ts` (import shared list or read from page
  `a[href^="/embed/"]` hrefs) and assert each resolves to a valid shell (single, list,
  not-found, or not-available — same union as today).

## E2E additions — `seo-noindex-routes.spec.ts`

Add SSR noindex checks for at least:

- `/embed/track/{seeded track id}`
- `/embed/playlist/{public playlist id}`
- `/embed/official-clip/{seeded soundbite id}`

Keep existing `/embed`, episode, and podcast list checks.

## File targets

- `/tools/web/seed-e2e.mjs`
- `/apps/web/e2e/helpers/seedConstants.ts`
- `/apps/web/e2e/helpers/embedAssertions.ts`
- `/apps/web/e2e/embed-routes.spec.ts`
- `/apps/web/e2e/embed-demo-index.spec.ts`
- `/apps/web/e2e/seo-noindex-routes.spec.ts`

## Acceptance criteria

- Phase 5 test matrix rows marked missing in `00-SUMMARY.md` are covered.
- Demo index spec validates all 12 demo links.
- SEO spec covers ≥5 embed paths including three new child route kinds.
- Helpers remain embed-specific (no `aside#media-player` assertions).

## Operator verification

```bash
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-demo-index.spec.ts
make e2e_test_web_report_spec SPEC=e2e/seo-noindex-routes.spec.ts
```

Review `.artifacts/e2e-reports/latest/web/index.html`.
