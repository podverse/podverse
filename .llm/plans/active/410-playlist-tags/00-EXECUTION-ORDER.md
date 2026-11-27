# Playlist tags — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Prompts and
models: [COPY-PASTA.md](COPY-PASTA.md).

20 plans plus Close, in 9 phases. Every prompt is Cursor Grok 4.7. Prompts share a phase only
when their `## Files` lists are disjoint. `release-notes/scratchpad.md` is written only by Close.
Prompt 70 lists that file and does not edit it.

## Rules for every prompt

- Read and execute your plan. The answers in `00-REQUEST.md` § Review of the first planning pass
  are settled. Where an older sentence in `00-SUMMARY.md` § Decisions to review differs, those
  answers win, and the plans already follow them.
- Issue 410 is the issue for this work. Do not open a second one.
- Do not run unit tests, integration tests, Playwright, Maestro, lint, or type-check. Add or
  update the tests your plan's `## Tests` names. The operator runs the whole set once, after
  Close (§ Cumulative verification).
- Prompt 10 still regenerates the linear baselines, and prompts 70, 61, 40, and 50 still run
  `npm run i18n:compile`, because those commands are the edits the plans name. Do not hand-edit
  `compiled/` or the baseline `.sql.gz` archives.
- Never run `git commit`, `git push`, `gh`, `npm publish`, or release scripts.
- Do not edit `COPY-PASTA.md`. The runner ticks your checkbox.
- Do not move this set to `completed/`. Close moves the whole directory.
- Comments in code follow **comments-future-forward**: no plan numbers, no `.llm/plans/` paths.
- No prompt stops for a person.
- Where an earlier prompt already edited a file you edit, change only the part your plan names.
  Do not rewrite the file. The order is under § Files edited by more than one prompt.
- Every implementation prompt shares its phase with another prompt:
  - Edit only the files your plan lists.
  - Report errors in files you do not own; do not fix them.
  - Do not write `release-notes/scratchpad.md`. Put the entry in your final message under
    `## Release notes entry`, or write `none` when the plan's release scratchpad is none.
    Close appends every such entry.
- **Close** runs alone. It appends those entries, writes the ticket reply, archives the set,
  and ends with the cumulative verification.

## Settled while assembling

- Every ledger row maps to at least one plan. R32 is Close. No numbered plan held two changes,
  and none named a model other than Cursor Grok 4.7.
- The operator accepted the decisions in `00-SUMMARY.md` except the four mismatches. Those, the
  tag-limit env, and the public config response are already written into the plans from
  `00-REQUEST.md`.
- Catalog order is 70, then 61, then 40, then 50. Their `## Runs after` lines do not name each
  other. The four consumer originals are why 50 waits until after 40, and why 61 waits until
  after 70.
- Web spec-order file: 90, then 80, then 40. Each inserts one line. Their `## Runs after` lines
  do not name each other.
- `apps/api/openapi.yml`: 11, then 12, then 13, then 100, then 103. That matches `## Runs after`.
- Prompt 10 sets `API_EXPECTED_MIGRATION_FILENAME` in `infra/k8s/base/api/source/api.env`.
  Prompt 11 adds the two playlist-tag keys in that file and does not change the filename.

## Phases

| Phase | Prompts | Reasoning | Why it waits |
| --- | --- | --- | --- |
| 1 | 10, 20, 30, 60 | 10 extra high; 20 high; 30 high; 60 high | nothing |
| 2 | 11, 21 | 11 extra high; 21 high | 11 after 10; 21 after 20 |
| 3 | 12, 90 | 12 extra high; 90 high | 12 after 11; 90 after 11 and 21 |
| 4 | 13, 80, 91 | 13 extra high; 80 high; 91 high | 13 after 12; 80 after 11; 91 after 90; 80 after 90 (same spec-order file) |
| 5 | 100, 70 | 100 extra high; 70 high | 100 after 13 and 80; 70 after 13 |
| 6 | 101, 102, 61 | all high | 101 and 102 after 100; 61 after 13 and 60; 61 after 70 (same catalogs) |
| 7 | 103, 40 | 103 extra high; 40 high | 103 after 101 and 102; 40 after 101; 40 after 61 (same catalogs) |
| 8 | 104, 50 | both high | 104 after 103 and 61; 50 after 102; 50 after 40 (same catalogs) |
| 9 | Close | low | after every other prompt |

## Files each prompt owns

### Phase 1

- **10:** `infra/k8s/base/ops/source/database/linear-migrations/app/0023_playlist_tag.sql`,
  `infra/k8s/base/api/source/api.env`, `infra/k8s/base/ops/kustomization.yaml`,
  `infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz`,
  `infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz`,
  `packages/helpers/src/lib/playlistTag.ts`, `packages/helpers/src/lib/playlistTag.test.ts`,
  `packages/helpers/src/index.ts`, `packages/helpers/package.json`,
  `packages/orm/src/entities/playlist/playlistTag.ts`, `packages/orm/src/db/entities.ts`,
  `packages/orm/src/services/playlist/playlistTag.ts`, `packages/orm/src/index.ts`,
  `apps/api/src/test/playlist-tag.integration.test.ts`.
- **20:** `packages/ui/src/components/form/AutocompleteDropdown/` (component, styles, test, index),
  `packages/ui/src/index.ts`, `packages/ui/PACKAGES-UI.md`.
- **30:** `apps/mobile/src/components/form/playlistTagDraft.ts`,
  `apps/mobile/src/components/form/playlistTagDraft.test.ts`,
  `apps/mobile/src/components/form/PlaylistTagField.tsx`,
  `apps/mobile/src/components/form/TextField.tsx`, `apps/mobile/src/components/form/index.ts`.
- **60:** `packages/helpers/src/lib/playlistsPageDefaults.ts` and its test,
  `apps/web/src/app/playlists/resolvePlaylistsPageFilters.ts` and its test,
  `apps/web/src/app/playlists/page.tsx`, `apps/web/src/config/index.ts`,
  `apps/web/src/config/runtime-config.ts`, `apps/web/sidecar/src/server.ts`,
  `apps/web/sidecar/.env.example`, `apps/web/ENV.md`,
  `infra/k8s/base/web/source/web-sidecar.env`.

### Phase 2

- **11:** `packages/helpers/src/dtos/playlist/playlist.ts`,
  `packages/helpers-requests/src/api/playlist/playlist.ts`,
  `packages/orm/src/services/playlist/publicPlaylistListSelect.ts`,
  `apps/api/src/lib/playlistApiSerialization.ts`,
  `apps/api/src/lib/accountPlaylistApiSerialization.test.ts`, `apps/api/src/lib/playlistTags.ts`,
  `apps/api/src/controllers/playlist/playlist.ts`, `apps/api/src/controllers/profileContent.ts`,
  `apps/api/openapi.yml`, `apps/api/src/config/index.ts`, `apps/api/src/lib/startup/validation.ts`,
  `apps/api/.env.example`, `apps/api/ENV.md`, `infra/k8s/base/api/source/api.env`,
  `packages/helpers-config/src/podverseTestEnv.ts`, `apps/api/src/test/playlist.test.ts`,
  `apps/api/src/test/playlist-tag-http.integration.test.ts`,
  `apps/api/src/test/podverse-test-env-startup.test.ts`, and
  `apps/api/src/test/profile-content.test.ts` only if that mock must stub `PlaylistTagService`.
- **21:** `packages/ui/src/components/form/TagField/` (component, styles, test, index),
  `packages/ui/src/index.ts`, `packages/ui/PACKAGES-UI.md`.

### Phase 3

- **12:** `apps/api/src/routes/playlist.ts`, `apps/api/src/controllers/playlist/playlist.ts`,
  `apps/api/src/lib/validation/querySchemas.ts`, `apps/api/openapi.yml`,
  `packages/helpers-requests/src/api/playlist/playlist.ts`,
  `packages/helpers-requests/src/api/_request.ts`,
  `apps/api/src/test/playlist-tag-search.integration.test.ts`, `apps/api/src/test/playlist.test.ts`.
- **90:** `apps/web/src/app/playlist/[playlist_id]/PlaylistPageHeaderInfo.tsx`,
  `apps/web/src/styles/app/playlist/PlaylistHeaderInfo.module.scss`,
  `tools/web/embed-fixture-constants.mjs`, `tools/web/seed-embed-fixtures.mjs`,
  `apps/web/e2e/helpers/seedConstants.ts`, `apps/web/e2e/playlist-page-tags.spec.ts`,
  `makefiles/local/e2e-spec-order-web.txt`.

### Phase 4

- **13:** `apps/api/src/lib/validation/querySchemas.ts`,
  `apps/api/src/controllers/playlist/playlist.ts`, `packages/orm/src/services/playlist/playlist.ts`,
  `packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts`,
  `packages/helpers-requests/src/api/queryParams.ts`,
  `packages/helpers-requests/src/api/playlist/playlist.ts`, `apps/api/openapi.yml`,
  `apps/api/src/test/playlist.test.ts`, and either
  `apps/api/src/test/playlist-public-recent.integration.test.ts` or
  `apps/api/src/test/playlist-public-tag-filter.integration.test.ts`, as the plan says.
- **80:** `packages/helpers/src/lib/playlistTagLine.ts` and its test,
  `packages/helpers/src/index.ts`, `packages/helpers/package.json`,
  `apps/web/src/components/List/Playlists/ListPlaylistRow.tsx`,
  `apps/web/src/styles/components/List/Playlists/ListPlaylistRow.module.scss`,
  `apps/web/e2e/playlist-row-tags.spec.ts`, `makefiles/local/e2e-spec-order-web.txt`,
  `apps/mobile/src/components/primitives/ListRow.tsx`,
  `apps/mobile/src/components/content/PlaylistListRow.tsx`.
- **91:** `apps/mobile/src/screens/library/PlaylistDetailScreen.tsx`,
  `apps/mobile/e2e/playlist-detail-tags.yaml`, `apps/mobile/e2e/HOW-TO-RUN.md`,
  `scripts/mobile/e2e-test.sh`.

### Phase 5

- **100:** `packages/helpers/src/dtos/config/publicClientConfig.ts`,
  `packages/helpers/src/index.ts`, `packages/helpers/package.json`,
  `apps/api/src/controllers/membership.ts`, `apps/api/src/controllers/publicClientConfig.ts`,
  `apps/api/src/lib/legal/termsContent.ts`, `apps/api/src/app.ts`, `apps/api/openapi.yml`,
  `packages/helpers-requests/src/api/config/publicClientConfig.ts`,
  `packages/helpers-requests/src/api/_request.ts`,
  `apps/api/src/test/public-client-config.integration.test.ts`.
- **70:** `packages/helpers/src/lib/sortPrefs.ts` and its test,
  `packages/helpers/src/lib/browseListScope.ts`,
  `apps/mobile/src/screens/browse/browsePlaylistQuery.ts` and its test,
  `apps/mobile/src/screens/browse/browseListPrefs.ts` and its test,
  `apps/mobile/src/screens/browse/browseFeedData.ts`,
  `apps/mobile/src/screens/browse/BrowsePlaylistTagChip.tsx`,
  `apps/mobile/src/screens/browse/BrowseScreen.tsx`, the four
  `packages/i18n-catalog/consumer/originals/` files the plan names and the catalogs
  `npm run i18n:compile` writes, `apps/mobile/e2e/browse.yaml`. Not
  `release-notes/scratchpad.md`.

### Phase 6

- **101:** the web config loader, layout, manifest, providers, auth, SEO, contact, membership,
  checkout, and account pages named in the plan, including
  `apps/web/src/app/playlist/[playlist_id]/page.tsx`. Not `PlaylistPageHeaderInfo.tsx`.
- **102:** `apps/mobile/src/config/publicClientConfig.ts` and its test,
  `apps/mobile/src/config/accountSignupModeEnv.ts`, `apps/mobile/src/config/env.ts`,
  `apps/mobile/src/config/index.ts`, `apps/mobile/src/lib/mobileBrandName.ts`,
  `apps/mobile/src/lib/addByRss/deviceParse.ts`, `apps/mobile/App.tsx`,
  `apps/mobile/src/data/clearLocalLibraryForApiSwitch.ts`,
  `apps/mobile/src/membership/useStoreCheckout.ts`, `apps/mobile/src/lib/addByRss/feedLimit.ts`,
  `apps/mobile/src/components/membership/MembershipStoreCheckout.tsx`.
- **61:** `packages/helpers/src/lib/playlistsPageDefaults.ts` and its test,
  `apps/web/src/app/playlists/resolvePlaylistsPageFilters.ts` and its test,
  `apps/web/src/app/playlists/page.tsx`, `playlistsListSsr.ts`, `PlaylistsPageContext.tsx`,
  `PlaylistsPageChipRow.tsx`, `PlaylistTagFilter.tsx` and its styles,
  `apps/web/src/utils/localSettings/localSettings.ts`, `apps/web/src/hooks/useFilterDefaults.ts`,
  `apps/web/src/components/MediaListChips/resolvePendingMediaListChrome.ts`,
  `apps/web/src/config/index.ts`, `apps/web/src/config/runtime-config.ts`,
  `apps/web/sidecar/src/server.ts`, `apps/web/sidecar/.env.example`, `apps/web/ENV.md`,
  `infra/k8s/base/web/source/web-sidecar.env`, the four consumer originals and the catalogs
  `npm run i18n:compile` writes, `apps/web/e2e/playlists-tag-filter.spec.ts`.

### Phase 7

- **103:** `apps/api/src/routes/product/membership.ts`, `apps/api/src/controllers/membership.ts`,
  `apps/api/openapi.yml`, `packages/helpers-requests/src/api/membership/membership.ts`,
  `packages/helpers-requests/src/api/_request.ts`,
  `apps/api/src/test/external-services-and-meta.test.ts`,
  `apps/api/src/test/public-client-config.integration.test.ts`.
- **40:** `apps/web/src/components/Playlist/PlaylistForm.tsx`, the create and edit page context
  and form files the plan names, the four consumer originals and the catalogs
  `npm run i18n:compile` writes, `apps/web/e2e/playlist-tags.spec.ts`,
  `makefiles/local/e2e-spec-order-web.txt`.

### Phase 8

- **104:** `docs/features/ADD-BY-RSS.md`, `apps/web/ENV.md`, `apps/mobile/APPS-MOBILE.md`,
  `apps/api/ENV.md`, `infra/k8s/base/web/source/web-sidecar.env`,
  `infra/config/local/web-sidecar.env`, `infra/config/local/api.env`,
  `apps/web/sidecar/.env.example`, `tools/web-perf/lighthouse/.env.web.example`,
  `scripts/local-env/setup.sh`, and the two sibling GitOps env files the plan names under
  `k.podcastdj.com`.
- **50:** `apps/mobile/src/screens/library/playlistFormTags.ts` and its test,
  `apps/mobile/src/screens/library/PlaylistFormScreen.tsx`,
  `apps/mobile/src/data/repositories/playlistRepository.ts`, the four consumer originals and
  the catalogs `npm run i18n:compile` writes, `apps/mobile/e2e/library-playlists.yaml`.

## Files edited by more than one prompt

Later prompts change only the part their plan names.

- `infra/k8s/base/api/source/api.env` — 10, then 11. 11 does not change
  `API_EXPECTED_MIGRATION_FILENAME`.
- `packages/helpers/src/index.ts` and `packages/helpers/package.json` — 10, then 80, then 100.
- `packages/ui/src/index.ts` and `packages/ui/PACKAGES-UI.md` — 20, then 21.
- `apps/api/src/controllers/playlist/playlist.ts`,
  `packages/helpers-requests/src/api/playlist/playlist.ts`, and `apps/api/src/test/playlist.test.ts`
  — 11, then 12, then 13.
- `apps/api/src/lib/validation/querySchemas.ts` — 12, then 13.
- `apps/api/openapi.yml` — 11, then 12, then 13, then 100, then 103. 103 removes public
  `GET /product/membership` and leaves `/config` and the playlist paths.
- `packages/helpers-requests/src/api/_request.ts` — 12, then 100, then 103.
- `makefiles/local/e2e-spec-order-web.txt` — 90, then 80, then 40. Each inserts one spec line.
- `packages/helpers/src/lib/playlistsPageDefaults.ts` and its test,
  `apps/web/src/app/playlists/resolvePlaylistsPageFilters.ts` and its test,
  `apps/web/src/app/playlists/page.tsx`, `apps/web/src/config/index.ts`,
  `apps/web/src/config/runtime-config.ts`, `apps/web/sidecar/src/server.ts` — 60, then 61.
- `apps/web/ENV.md`, `apps/web/sidecar/.env.example`, and
  `infra/k8s/base/web/source/web-sidecar.env` — 60, then 61, then 104. 104 does not rewrite the
  Playlists section.
- `apps/api/ENV.md` — 11, then 104. 104 leaves the Playlist tags subsection.
- `apps/api/src/controllers/membership.ts` and
  `apps/api/src/test/public-client-config.integration.test.ts` — 100, then 103.
- The four `packages/i18n-catalog/consumer/originals/` files — 70, then 61, then 40, then 50.
  Each inserts only its own keys, then runs `npm run i18n:compile`.

## Operator steps during the run

None. The run does not commit or publish.

## Cumulative verification

Close ends with this list, adding any spec or test file the set created that it misses (check
`git status`). One fenced `bash` block. The operator runs it in the **Root** tab.

**Mobile E2E Metro**, **Mobile E2E iOS**, **Mobile E2E Android**, and **Mobile E2E API** must
already be up before the mobile lines. Do not start those in the block. See
[HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md). `browse`, `library-playlists`, and
`playlist-detail-tags` need that API.

```bash
npm run build:packages
npm run i18n:validate
npm run lint
npm run type-check
npm run test:unit
npm --prefix apps/mobile run test
npm run test:e2e:api
npm run openapi:check
make e2e_test_web_report_spec SPEC=e2e/playlist-tags.spec.ts,e2e/playlist-page-tags.spec.ts,e2e/playlist-row-tags.spec.ts,e2e/playlists-tag-filter.spec.ts,e2e/playlists-profiles-chips.spec.ts,e2e/media-list-chips.spec.ts
open .artifacts/e2e-reports/latest/index.html
npm run mobile:e2e:test -- browse,library-playlists,playlist-detail-tags
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
