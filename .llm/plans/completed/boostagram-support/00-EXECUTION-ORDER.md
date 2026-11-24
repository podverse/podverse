# Boostagram support — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Ledger and settled decisions: [00-SUMMARY.md](00-SUMMARY.md).
Prompts and models: [COPY-PASTA.md](COPY-PASTA.md).

16 plans in 6 phases. Prompts share a phase only when their `## Files` lists are disjoint.
`release-notes/scratchpad.md` is not edited until prompt 71.

## Rules for every prompt

- Read and execute your plan. The answers in `00-REQUEST.md` § Review of the first planning pass
  are settled. Where `00-SUMMARY.md` § Decisions to review differs, those answers win, and the
  plans already follow them.
- Do not run tests. Add or update the tests your plan's `## Tests` names. The operator runs the
  whole set once, after prompt 71 (§ Cumulative verification). Type-check or lint only your own
  files or workspace when your plan asks for a self-check.
- These plan steps are part of the work, not the operator's verification: prompt 10 runs
  `./scripts/development/update-lockfile-linux.sh`; prompt 22 runs `make db_regen_linear_baseline`
  and `make db_verify_linear_baseline`; prompt 31 installs `expo-crypto`; prompt 32 runs
  `npm run i18n:compile`; prompt 70 runs `npm --prefix apps/mobile install`.
- Never run `git commit`, `git push`, `gh`, `npm publish`, or release scripts.
- Do not move this set to `completed/`. Prompt 71 moves the whole directory.
- **Phase with several prompts** (every phase except phase 6):
  - Edit only the files your plan lists. Report errors in files you do not own; do not fix them.
  - Do not write `release-notes/scratchpad.md`. Put the entry in your final message under
    `## Release notes entry` (or write `none`). Prompt 71 appends every such entry.
  - Append to a shared list (`apps/mobile/vitest.config.ts`, `makefiles/local/e2e-spec-order-web.txt`,
    `scripts/mobile/e2e-test.sh`). Do not remove a path or a flow name another prompt added, and
    do not rewrite a comment block.
- **Prompt 71** runs alone. It appends the shared-phase release entries, then its own, then
  archives the set.
- Comments in code follow **comments-future-forward**: no plan numbers, no `.llm/plans/` paths.
- No prompt stops for a person.

## Settled while assembling

Plans 40 and 50 both added an export named `buildAddByRssBoostItem` with different signatures.
Plan 40 keeps `buildAddByRssBoostItem(indexItem): DTOItem`. Plan 50 adds
`buildAddByRssBoostSheetItem` beside it and does not change the first function.
`compatItemValueDtos` and `compatItemImageDtos` already accept a live item. Plan 50 does not
edit `packages/parser-mapping/src/compat/partytime/item.ts`.

## Phases

| Phase | Prompts | Model · reasoning | Why it waits |
| --- | --- | --- | --- |
| 1 | 10, 20, 21, 22, 30 | all Cursor Grok 4.7; 10 extra high; 20 high; 21 medium; 22 extra high; 30 extra high | nothing |
| 2 | 11, 31, 60 | all Cursor Grok 4.7; 11 extra high; 31 extra high; 60 high | 11 after 10 (`useBoostPayments.ts`); 31 after 30; 60 after 10 (`packages/v4v-metaboost/src/index.ts`) |
| 3 | 12, 32, 70 | all Cursor Grok 4.7; 12 extra high; 32 high; 70 extra high | 12 after 11; 32 after 31; 70 after 10 and 31 |
| 4 | 40, 61 | both Cursor Grok 4.7; 40 high; 61 extra high | 40 after 12 and 22; 61 after 60 |
| 5 | 41, 50 | both Cursor Grok 4.7; 41 high; 50 extra high | 41 after 40; 50 after 12, 22, 40, and 61 |
| 6 | 71 (last) | Cursor Grok 4.7 · extra high | after 10, 11, 32, 50, and 70; appends release entries, archives, verification |

## Files each prompt owns in shared phases

### Phase 1

- **10:** `packages/v4v-btc-ln` (provider, `sendManualBoost`, `payments.ts`, package test script,
  `package.json`, `tsconfig.json`, `vitest.config.ts`), root `package-lock.json`,
  `packages/v4v-metaboost/src/mbrssV1PostBoost.ts` and its test, one new export line in
  `packages/v4v-metaboost/src/index.ts`, `apps/web/src/utils/value/webln.ts`,
  `useBoostPayments.ts`, `mbrssV1RequestMetadata.ts`, `boostBlipCustomRecords.ts`,
  `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md`.
- **20:** `packages/parser-mapping/src/compat/partytime/value.ts`, `channel.ts`, `item.ts`,
  `value.expand.test.ts`, and the parser `channelValue` / `itemValue` sources and tests.
- **21:** `docs/v4v/DOCS-V4V.md`.
- **22:** migration `0019_drop_channel_has_podcast_index_value.sql`, `api.env`,
  `infra/k8s/base/ops/kustomization.yaml`, the regenerated `0004_` and `0005_` baselines, the
  channel entity and `ChannelService` type, the channel DTO and `packages/helpers` barrel, the
  three Podcast Index value DTO files, the Podcast Index client methods, the worker command and
  its registry, startup category, `apps/workers/package.json`, and the worker docs, plus the
  fixture literals named in the plan. In `packages/parser-mapping/src/addByRSS/boost.ts`, delete
  only the `has_podcast_index_value` property.
- **30:** `apps/mobile/src/v4v/alby/albyProtocol.ts`, `albyHttp.ts`, and their tests. Append those
  two test paths to `apps/mobile/vitest.config.ts`.

### Phase 2

- **11:** `packages/v4v-helpers` boost form rules, `BoostFormBase.tsx`, `BoostFormFields.tsx`,
  `useBoostPayments.ts`, `tools/web/seed-e2e.mjs`, `apps/web/e2e/helpers/seedConstants.ts`,
  `apps/web/e2e/boost-signed-out-form.spec.ts`, `makefiles/local/e2e-spec-order-web.txt`.
- **31:** `albySession.ts`, `apps/mobile/src/v4v/alby/index.ts`, `valueProviders.ts` and its test,
  mobile `config/env.ts`, `config/index.ts`, `.env.example`, `apps/mobile/package.json`,
  `apps/mobile/package-lock.json`. Append the two new test paths to `apps/mobile/vitest.config.ts`.
- **60:** `publicMessageView.ts` and its test, one new last line of
  `packages/v4v-metaboost/src/index.ts`, and the web message files, `DonatePageClient.tsx`, and
  `AddByRSSArtistPageList.tsx` named in the plan.

### Phase 3

- **12:** `boostEligibility.ts` and its test, `tools/web/seed-e2e.mjs`, `seedConstants.ts`,
  `apps/web/e2e/boost-eligibility.spec.ts`, `makefiles/local/e2e-spec-order-web.txt`.
- **32:** `ValueProvidersScreen.tsx`, `AlbyProviderScreen.tsx`, `apps/mobile/src/navigation/index.tsx`,
  `notificationStack.ts` and its test, `apps/mobile/e2e/v4v-providers.yaml`,
  `scripts/mobile/dev-e2e.sh`, and the four `packages/i18n-catalog/mobile/originals` files. This
  prompt is the only one that runs `npm run i18n:compile`.
- **70:** the new files under `apps/mobile/src/lib/boost/`, `apps/mobile/package.json`,
  `apps/mobile/package-lock.json`, and new paths in `apps/mobile/vitest.config.ts`.

### Phase 4

- **40:** `packages/parser-mapping/src/addByRSS/boost.ts` and `boost.test.ts`
  (`buildAddByRssBoostItem` only), `HeaderButtons.tsx`, the three Add by RSS headers, the three
  Add by RSS item page clients, `tools/web/seed-e2e.mjs`, `seedConstants.ts`,
  `boost-channel-and-episode.spec.ts`, `boost-add-by-rss-episode.spec.ts`, and
  `makefiles/local/e2e-spec-order-web.txt`.
- **61:** the received-boost list components, chip helpers, `channelItemsRepository.ts`, section
  chrome, the detail screens named in the plan, `apps/mobile/vitest.config.ts`,
  `apps/mobile/e2e/boost-messages.yaml`, `apps/mobile/e2e/HOW-TO-RUN.md`,
  `scripts/mobile/e2e-test.sh`, and `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`.

### Phase 5

- **41:** the new web player boost files under `MediaPlayer/Buttons/`,
  `MediaPlayerButtonsModal.tsx`, `apps/web/e2e/boost-full-player.spec.ts`, and
  `makefiles/local/e2e-spec-order-web.txt`. Do not edit `boost.ts`.
- **50:** `buildAddByRssBoostSheetItem` in `boost.ts` and appended cases in `boost.test.ts`,
  `boostTarget.ts` and its test, `BoostSheet.tsx`, `boostFormModel.ts`, `BoostHeaderAction.tsx`,
  `FullPlayerActionRow.tsx`, `useDirectoryBoostTarget.ts`, `FullPlayerScreen.tsx`, the detail
  screens named in the plan, `tools/web/seed-e2e.mjs`, `apps/mobile/e2e/boost-entry.yaml`,
  one include path in `apps/mobile/vitest.config.ts`, and `boost-entry` in
  `scripts/mobile/e2e-test.sh`. Keep plan 40's `buildAddByRssBoostItem` and plan 61's Boosts chip.

## Files several plans edit, in order

- `packages/v4v-metaboost/src/index.ts`: 10, then 60. Each appends one export line.
- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`: 10, then 11.
- `tools/web/seed-e2e.mjs`: 11, then 12, then 40, then 50.
- `apps/web/e2e/helpers/seedConstants.ts`: 11, then 12, then 40.
- `makefiles/local/e2e-spec-order-web.txt`: 11, then 12, then 40, then 41.
- `packages/parser-mapping/src/addByRSS/boost.ts` and `boost.test.ts`: 22 (drop one property),
  then 40 (`buildAddByRssBoostItem`), then 50 (`buildAddByRssBoostSheetItem`).
- `packages/parser-mapping/src/compat/partytime/item.ts`: 20 only.
- `apps/mobile/vitest.config.ts`: 30, then 31, then 70, then 61, then 50. Each appends paths.
- `apps/mobile/package.json` and `apps/mobile/package-lock.json`: 31, then 70.
- `scripts/mobile/e2e-test.sh`: 61 (`boost-messages`), then 50 (`boost-entry`), then 71
  (`boost-send`).
- Detail screens shared by 61 and 50 (`PodcastDetailScreen`, `ArtistDetailScreen`,
  `AlbumDetailScreen`, `EpisodeDetailScreen`, `TrackDetailScreen`, `AddByRssHomeDetailScreen`,
  `AddByRssEpisodeDetailScreen`, `AddByRssTrackDetailScreen`, `AddByRssLivestreamDetailScreen`):
  61, then 50. 50 keeps the Boosts chip.
- `apps/mobile/src/components/boost/BoostSheet.tsx`: 50, then 71.
- `release-notes/scratchpad.md`: 71 only.

## Operator steps during the run

None. The run does not commit or publish. A real Alby client id is an operator step for a build
that turns Connect on. It is recorded in the release scratchpad. It is not a stop in this set.

## Cumulative verification

Prompt 71 ends with this list, adding any spec, flow, or test file the set created that it
misses (check `git status`). Leave-running tabs for the mobile flows: **Mobile E2E Metro**,
**Mobile E2E iOS** (or **Mobile E2E Android**), and **Mobile E2E API**. See
[HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md). Do not paste those leave-running commands into
the block below.

**Root** tab:

```bash
npm run build:packages
npm run i18n:validate
npm run lint
npm run type-check
npm run test:unit
npm --prefix apps/mobile run test
make db_verify_linear_baseline
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/boost-signed-out-form.spec.ts,e2e/boost-eligibility.spec.ts,e2e/boost-channel-and-episode.spec.ts,e2e/boost-add-by-rss-episode.spec.ts,e2e/boost-full-player.spec.ts
open .artifacts/e2e-reports/latest/index.html
```

**Mobile Maestro** tab:

```bash
npm run mobile:e2e:test -- v4v-providers,boost-entry,boost-messages,boost-send
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
