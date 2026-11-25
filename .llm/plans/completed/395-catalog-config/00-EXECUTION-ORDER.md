# 395 catalog config — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Prompts and
models: [COPY-PASTA.md](COPY-PASTA.md).

17 plans plus Close, in 6 phases. Prompts share a phase only when their `## Files` lists are
disjoint. `release-notes/scratchpad.md` is written by prompt 10 (it runs alone) and by Close.
`apps/api/openapi.yml` is edited by 23, then 51, then 62.

## Rules for every prompt

- Read and execute your plan. The answers in `00-REQUEST.md` § Review of the first planning pass
  are settled. Where an older sentence in `00-SUMMARY.md` § Decisions to review differs, those
  answers win, and the plans already follow them.
- Do not run tests. Add or update the tests your plan's `## Tests` names. The operator runs the
  whole set once, after Close (§ Cumulative verification).
- Prompt 62 runs `npm run i18n:compile` after editing the consumer originals. Do not hand-edit
  `compiled/`.
- Never run `git commit`, `git push`, `gh`, `npm publish`, or release scripts.
- Do not edit `COPY-PASTA.md`. The runner ticks your checkbox.
- Do not move this set to `completed/`. Close moves the whole directory.
- **Phase with several prompts** (phases 2–5):
  - Edit only the files your plan lists, plus the compiled catalogs prompt 62 generates.
  - Report errors in files you do not own; do not fix them.
  - Do not write `release-notes/scratchpad.md`. Put the entry in your final message under
    `## Release notes entry` (or write `none`). Close appends every such entry.
- **Prompt 10** runs alone and appends its own scratchpad entry.
- **Close** runs alone. It appends the shared-phase release entries, writes the ticket reply,
  archives the set, and ends with the cumulative verification.
- Comments in code follow **comments-future-forward**: no plan numbers, no `.llm/plans/` paths.
- No prompt stops for a person.

## Settled while assembling

- Plan 44 was removed. The player already keeps the title link and the artist byline (R71).
  Plan 50 runs after 11 only. It does not change `getMediaPlayerInfoResolution` or
  `resolveRemotePlayerInfo`.
- Plans 52 and 63 both edit `processOpmlImport.ts`, its test, `runOpmlImport.ts`, and
  `accountOpmlImport.ts`. 63 runs in phase 3 and leaves the Add by RSS branch as it is. 52 runs
  in phase 5 and adds `addByRSSEnabled` beside the allowlist parameter 63 added. 52 does not
  remove that allowlist check.
- `apps/workers/ENV.md` is edited by 12, then 61, then 52. 52 replaces only the
  `CATALOG_ADD_BY_RSS_DISABLED` bullet and leaves 61's allowlist-command sentence.
- Plan 13's workers contract test discovers workloads. Plan 61 does not edit that test. It mounts
  `podverse-catalog-config` on the new CronJob so the test passes.
- Plans 24 and 41 do not share files. 24 does not edit `search/page.tsx`,
  `SearchPageListHeader.tsx`, or `searchPageMedium.ts`. 41 does not edit `SearchPageContext.tsx`
  or `SearchPageList.tsx`. `all` stays the podcast search.
- Plan 40 edits `apps/web/src/app/add-by-rss/page.tsx` (chips). Plan 50 edits
  `apps/web/src/app/add-by-rss/layout.tsx` and does not edit the page.

## Phases

| Phase | Prompts | Model · reasoning | Why it waits |
| --- | --- | --- | --- |
| 1 | 10 | Cursor Grok 4.7 · extra high | nothing |
| 2 | 12, 45 | Cursor Grok 4.7; 12 extra high; 45 medium | both after 10 |
| 3 | 11, 13, 23, 60, 63 | Cursor Grok 4.7; 11 high; 13 high; 23 high; 60 high; 63 medium | 11 after 10 and 12; 13 after 12; 23, 60, and 63 after 12 |
| 4 | 24, 40, 41, 43, 50, 51, 61 | Cursor Grok 4.7; 24 high; 40 high; 41 medium; 43 high; 50 high; 51 extra high; 61 high | 24 after 10, 11, and 23; 40, 41, 43, and 50 after 11; 51 after 12; 61 after 60 and 13 |
| 5 | 52, 62 | Cursor Grok 4.7; 52 high; 62 high | 52 after 12 and 51; 62 after 11 and 12; 52 after 63 (same OPML files); 62 after 51 (`openapi.yml`) |
| 6 | Close | Cursor Grok 4.7 · low | after every other prompt |

## Files each prompt owns in shared phases

### Phase 2

- **12:** `apps/api/src/config/index.ts`, `apps/api/src/lib/startup/validation.ts`,
  `apps/api/.env.example`, `apps/api/ENV.md`, `apps/workers/src/lib/startup/categoriesForCommand.ts`
  and its test, `apps/workers/src/lib/startup/validation.ts` and its test,
  `apps/workers/src/config/index.ts`, `apps/workers/.env.example`, `apps/workers/ENV.md`,
  `packages/helpers-config/src/podverseTestEnv.ts`.
- **45:** `apps/web/src/lib/embed/embedDemoMusicRoutes.ts`, its test, and
  `apps/web/src/lib/embed/resolveEmbedDemoShowcase.ts`.

### Phase 3

- **11:** `apps/web/playwright.e2e-server-env.ts`, `apps/web/playwright.catalog-restricted.config.ts`,
  `apps/web/playwright.config.ts`, `apps/web/package.json`, `apps/web/e2e/helpers/seedConstants.ts`,
  `apps/web/e2e/helpers/catalogRestricted.ts`, `apps/web/e2e/catalog-restricted-runtime-config.spec.ts`,
  `apps/web/e2e/catalog-restricted-stored-content.spec.ts`, `makefiles/local/Makefile.local.e2e.mk`,
  `scripts/e2e-html-hub-report.mjs`.
- **13:** `infra/k8s/base/common/kustomization.yaml`,
  `infra/k8s/base/common/source/catalog/catalog.env`, the API, web, cron, and workers manifests
  named in the plan, `apps/workers/src/lib/startup/k8sEnvContract.test.ts`,
  `infra/k8s/INFRA-K8S.md`, `dev/env-overrides/local/catalog.env.example`,
  `scripts/local-env/setup.sh`, `docs/development/env/LOCAL-ENV-OVERRIDES.md`.
- **23:** `packages/orm/src/services/channel/channel.ts`, `apps/api/src/lib/validation/querySchemas.ts`,
  `apps/api/src/controllers/channel.ts`, `apps/api/src/routes/channel.ts`, `apps/api/openapi.yml`,
  `packages/helpers-requests/src/api/channel/channel.ts`, `packages/helpers-requests/src/api/_request.ts`,
  `apps/api/src/test/channel-search-title.integration.test.ts`.
- **60:** the parser files named in the plan (`packages/parser/src/config/types.ts`, `context.ts`,
  `factory.ts`, `lib/rss/errors.ts`, `lib/rss/feed/catalogAdmission.ts` and its test, `feed.ts`,
  `feed.handleGetRSSFeed.test.ts`, `lib/rss/parser.ts`, the hash-and-failure test) and
  `apps/workers/src/index.ts`.
- **63:** `packages/mq/src/functions/mq/rss/processOpmlImport.ts` and its test,
  `apps/workers/src/commands/mq/rss/runOpmlImport.ts`,
  `apps/api/src/controllers/account/accountOpmlImport.ts`.

### Phase 4

- **24:** `apps/web/src/app/search/SearchPageContext.tsx`, `apps/web/src/app/search/SearchPageList.tsx`,
  `apps/web/e2e/catalog-restricted-search.spec.ts`.
- **40:** `apps/web/src/utils/mediaListChips.ts` and its test, `apps/web/src/app/page.tsx`,
  `apps/web/src/app/browse/page.tsx`, `apps/web/src/app/recommendations/page.tsx`,
  `apps/web/src/app/recommendations/RecommendationsPageClient.tsx`,
  `apps/web/src/app/add-by-rss/page.tsx`, `apps/web/e2e/catalog-restricted-music-chips.spec.ts`.
- **41:** `apps/web/src/app/search/searchPageMedium.ts` and its test, `apps/web/src/app/search/page.tsx`,
  `apps/web/src/app/search/SearchPageListHeader.tsx`,
  `apps/web/e2e/catalog-restricted-music-search.spec.ts`.
- **43:** `apps/web/src/lib/catalog/catalogListMedium.ts` and its test, the history, queues, and
  playlists page files named in the plan, `MediaListPendingTrailingChips.tsx`,
  `apps/web/e2e/catalog-restricted-music-library.spec.ts`.
- **50:** `apps/web/src/app/add-by-rss/layout.tsx`, `SideBar.tsx`, `AddByRSSBackgroundRefresh.tsx`,
  `useReadyAddByRSSFeeds.ts`, `useAddByRSSMetadataUpgrade.ts`, `publisherLinks.ts` and its test,
  `useDeviceArtistLinks.ts`, `MediaPlayerInfoModal.tsx`,
  `apps/web/e2e/catalog-restricted-add-by-rss.spec.ts`.
- **51:** `packages/helpers/src/lib/addByRSS/addByRSSDisabled.ts`, `packages/helpers/src/index.ts`,
  `apps/api/src/routes/account.ts`, `apps/api/openapi.yml`,
  `apps/api/src/test/account-add-by-rss-disabled.integration.test.ts`.
- **61:** `apps/workers/src/lib/catalog/collectCatalogAllowlistAddTargets.ts` and its test,
  `apps/workers/src/commands/mq/rss/mqRSSAddCatalogAllowlist.ts`, `apps/workers/src/commands/index.ts`,
  `apps/workers/src/lib/startup/categoriesForCommand.ts` and its test, `apps/workers/ENV.md`,
  `infra/k8s/base/ops/mq-rss-add-catalog-allowlist.cronjob.yaml`,
  `infra/k8s/base/ops/kustomization.yaml`.

### Phase 5

- **52:** `packages/mq/src/functions/mq/rss/processOpmlImport.ts` and its test,
  `apps/workers/src/commands/mq/rss/runOpmlImport.ts`, `apps/workers/.env.example`,
  `apps/workers/ENV.md`, `apps/api/src/controllers/account/accountOpmlImport.ts`,
  `apps/api/src/test/opml-import.test.ts`.
- **62:** `apps/api/src/controllers/mq/mq.ts`, `apps/api/openapi.yml`,
  `apps/api/src/test/catalog-on-demand-add.integration.test.ts`,
  `apps/web/src/components/SearchDetail/SearchDetail.tsx`,
  `apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx`, the four consumer
  `originals/*.json` files named in the plan and the catalogs `npm run i18n:compile` writes,
  `apps/web/e2e/catalog-restricted-podcast-index-add-feed.spec.ts`.

## Operator steps during the run

None. The run does not commit or publish.

## Cumulative verification

Close ends with this list, adding any spec or test file the set created that it misses (check
`git status`). One fenced `bash` block, labeled **Root**.

```bash
npm run build:packages
npm run i18n:validate
npm run lint
npm run type-check
npm run test:unit
npm run test:e2e:api
npm run openapi:check
kubectl kustomize infra/k8s/base/api | rg -n -A2 "podverse-catalog-config"
kubectl kustomize infra/k8s/base/web | rg -n -B1 -A2 "podverse-catalog-config"
make e2e_test_web_report_spec SPEC=e2e/catalog-restricted-runtime-config.spec.ts,e2e/catalog-restricted-stored-content.spec.ts,e2e/catalog-restricted-search.spec.ts,e2e/catalog-restricted-music-chips.spec.ts,e2e/catalog-restricted-music-search.spec.ts,e2e/catalog-restricted-music-library.spec.ts,e2e/catalog-restricted-add-by-rss.spec.ts,e2e/catalog-restricted-podcast-index-add-feed.spec.ts
make e2e_test_web_report_spec SPEC=e2e/search-page.spec.ts
open .artifacts/e2e-reports/latest/index.html
```

The first `make` line is the catalog-restricted lane. The second is the default lane, which still
proves Search calls Podcast Index when the allowlist is unset. Do not combine those two `SPEC`
values in one command.
