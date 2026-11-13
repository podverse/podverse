# Mobile on-device Add by RSS — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Ledger and settled decisions: [00-SUMMARY.md](00-SUMMARY.md).
Prompts and models: [COPY-PASTA.md](COPY-PASTA.md).

The set runs in this checkout, on the current branch (operator answer). 25 plans in 14 phases.
Prompts share a phase only when their `## Files` lists are disjoint.

## Rules for every prompt

- Read and execute your plan. The answers in `00-REQUEST.md` § Review of the first planning pass
  and § Review of the second planning pass are settled; where `00-SUMMARY.md` § Decisions to
  review differs, the answers win, and the plans already follow them.
- Do not run tests. Add or update the tests your plan's `## Tests` names. The operator runs the
  whole set once, after the last prompt (§ Cumulative verification). Type-check or lint only your
  own files or workspace when your plan asks for a self-check.
- Never run `git commit`, `git push`, `gh`, `npm publish`, or release scripts.
- **Solo phase:** append your plan's `## Release scratchpad` entry to `release-notes/scratchpad.md`.
- **Phase with several prompts:**
  - Edit only the files your plan lists. Report errors in files you do not own; do not fix them.
  - Do not write `release-notes/scratchpad.md`. Put the entry in your final message under
    `## Release notes entry` (or write `none`). Prompt 51 appends every such entry.
  - `npm run i18n:compile` rewrites the override files of every catalog layer from that layer's
    originals. Only one prompt per phase edits a given layer, so a run started by another prompt
    gives the same result. If compile fails on another layer's originals while that prompt is
    still editing, wait and rerun it once.
- Comments in code follow **comments-future-forward**: no plan numbers, no `.llm/plans/` paths.
- No prompt stops for a person. Prompt 11 links the sibling `../partytime` build with
  `file:../../../partytime`. It does not commit or publish that repo.

## Phases

| Phase | Prompts | Model · reasoning | Why it waits |
| --- | --- | --- | --- |
| 1 | 10, 30, 40, 41 | 10 Codex 5.3 · high; 30 Opus 5.5 · high; 40 Opus 5.5 · high; 41 Cursor Grok 4.7 · medium | nothing |
| 2 | 11, 60 | 11 Cursor Grok 4.7 · medium; 60 Opus 5.5 · high | 11 after 10 (sibling build); 60 after 40 (API env, validation, OpenAPI) |
| 3 | 20, 61, 62 | 20 Cursor Grok 4.7 · extra high; 61 Cursor Grok 4.7 · high; 62 Cursor Grok 4.7 · high | 20 after 11 (`addByRSS.ts`); 61 and 62 after 60 |
| 4 | 21 | Opus 5.5 · high | after 11 (`file:` link), 20, 30 |
| 5 | 31 | Opus 5.5 · high | after 21 (`deviceParse.ts`), 30 |
| 6 | 32 | Cursor Grok 4.7 · extra high | after 31 |
| 7 | 22, 33, 50, 63, 64 | 22 Cursor Grok 4.7 · extra high; 33 Opus 5.5 · high; 50 Cursor Grok 4.7 · medium; 63 Cursor Grok 4.7 · high; 64 Cursor Grok 4.7 · high | 22 after 21, 32; 33 after 31, 32 (`addByRssRepository.ts`); 50 after 32, 60; 63 after 32, 60, 62; 64 after 32, 62 |
| 8 | 34 | Cursor Grok 4.7 · extra high | after 22, 32, 33, 62 |
| 9 | 42 | Opus 5.5 · high | after 21, 30–34, 40 |
| 10 | 43 | Opus 5.5 · high | after 21, 30, 41, 42 |
| 11 | 44 | Cursor Grok 4.7 · high | after 32, 40, 43 |
| 12 | 70 | Opus 5.5 · high | after 30, 42 (`getRateLimitRetryAfterMs`), 44 (`e2e-test.sh`) |
| 13 | 52, 71 | 52 Cursor Grok 4.7 · medium; 71 Cursor Grok 4.7 · extra high | 71 after 30, 62, 70; 52 last among docs so it describes the finished behavior |
| 14 | 51 (last) | Cursor Grok 4.7 · high | after 32, 50, 71 (mobile catalogs); appends release entries, archives, verification |

## Files each prompt owns in shared phases

### Phase 1

- **10:** `../partytime/**` only (sibling repo). No monorepo file.
- **30:** `apps/mobile/src/lib/addByRss/parsePath.ts` (+ test), `apps/mobile/src/data/db/schema.ts`,
  `migrations.ts` (+ test), `apps/mobile/src/data/repositories/addByRssDevicePath.ts` (+ test),
  `addByRssRepository.ts`.
- **40:** `apps/api/src/lib/rateLimiter.ts`, `accountAddByRSSRemoteItem.ts`, `apps/api/src/config/index.ts`,
  `apps/api/src/lib/startup/validation.ts`, `apps/api/.env.example`, `apps/api/ENV.md`,
  `infra/k8s/base/api/source/api.env`, `dev/env-overrides/local/rate-limit.env.example`,
  `scripts/local-env/setup.sh`, `packages/helpers-config/src/podverseTestEnv.ts`,
  `apps/api/openapi.yml`, `account-add-by-rss-remote-item.integration.test.ts`.
- **41:** `packages/parser-mapping/src/compat/chapters/chapters.ts`,
  `packages/parser-mapping/src/addByRSS/chaptersTranscript.ts` (+ test),
  `accountAddByRSSChaptersTranscript.ts`, `apps/api/src/controllers/item.ts`, `apps/api/src/lib/chapters.ts`.

### Phase 2

- **11:** `packages/parser/**` files in its list, root `package-lock.json`, `eslint.config.mjs`, the
  four `apps/web/src/utils/addByRSS/*.test.ts` files.
- **60:** `packages/helpers` (`accountTrust`, `productMembershipDefaultsFromEnv`,
  `membershipFeatureComparison`), `packages/orm` (entity, `billingPriceCatalog`), the app linear
  migration and regenerated `0004_` / `0005_` baselines, `infra/k8s/base/ops/kustomization.yaml`,
  `api.env`, `product-membership-settings.env`, API env/validation/entitlements/membership
  controller/comparison catalog/OpenAPI/tests, management-api env and validation,
  `apps/web/src/app/membership/useMembershipComparison.ts`,
  `apps/web/e2e/membership-page-trial-limitations.spec.ts`,
  `apps/mobile/src/components/membership/useMembershipComparisonDocument.ts`, consumer catalogs.

### Phase 3

- **20:** `packages/helpers/src/lib/addByRSS/*` (new), `packages/helpers/src/lib/hash.ts` (+ test),
  `packages/helpers/src/index.ts`, `packages/parser/src/lib/rss/addByRSS.ts`,
  `addByRSSRedirectAuth.ts`, `hash/rawFeed.ts`, `apps/workers/src/lib/addByRSS/classifyAddByRSSParseFailure.ts` (+ test).
- **61:** management-api schema, route, OpenAPI, integration tests; `packages/management-api-requests`;
  management-web pages and specs; management catalogs.
- **62:** `accountFollowingAddByRSSChannel.ts`, `apps/api/src/routes/account.ts`, `apps/api/openapi.yml`,
  its API tests, `packages/helpers-requests` (`membership.ts`, `account/addByRSSFeedLimit.ts`,
  `_request.ts`), `apps/mobile/src/lib/addByRss/feedLimit.ts` (+ test).

### Phase 7

- **22:** `apps/mobile/src/lib/addByRss/credentials.ts` (+ test), `addByRssCredentialStore.ts`,
  `apps/mobile/src/auth/AuthProvider.tsx`, `useAddByRssAddFlow.ts`, `useAddByRssCredentialsForm.ts`,
  `apps/mobile/e2e/add-by-rss-device-credentials.yaml`, and the Maestro registration files
  (`scripts/mobile/e2e-test.sh`, `apps/mobile/e2e/HOW-TO-RUN.md`,
  `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`).
- **33:** `apps/mobile/src/sync/syncJobPlan.ts`, `syncQueue.test.ts`, `syncJobs.ts`, `addByRssRepository.ts`.
- **50:** `packages/helpers/src/lib/membershipFeatureComparison.ts` (+ test),
  `apps/api/src/test/external-services-and-meta.test.ts`.
- **63:** `accountFollowingAddByRSSChannel.ts`, `apps/api/openapi.yml`, `account-follows-notifications.test.ts`,
  `packages/helpers-requests/src/api/parseMembershipGateError.ts` (+ test), the web membership
  modal and Add by RSS headers, `apps/web/e2e/add-by-rss-feed-limit-reached.spec.ts`,
  `makefiles/local/e2e-spec-order-web.txt`, `apps/mobile/src/membership/MembershipGateProvider.tsx`,
  `AddByRssHomeDetailScreen.tsx`, consumer catalogs.
- **64:** `apps/mobile/src/screens/rss/AddByRssRootScreen.tsx`,
  `apps/mobile/src/components/form/ChipRowWithActions.tsx`, mobile catalogs,
  `apps/mobile/e2e/add-by-rss.yaml`, `apps/mobile/e2e/add-by-rss-anonymous.yaml`.

### Phase 13

- **52:** the five `.cursor/rules/*.mdc` files in its list, `apps/mobile/AGENTS.md`,
  `docs/features/ADD-BY-RSS.md`, and the three `docs/proposals/mobile/**` docs in its list.
- **71:** `apps/mobile/App.tsx`, `apps/mobile/src/auth/signUpAddByRssLimit*.ts`,
  `SignUpAddByRssLimitScreen.tsx`, `ContactEmailText.tsx`, `VerificationEmailNotSentMessage.tsx`,
  `TrialLimitationsContent.tsx`, mobile catalogs, `apps/mobile/e2e/signup-add-by-rss-limit.yaml`,
  `scripts/mobile/e2e-test.sh`, `.cursor/skills/mobile-test-economics/SKILL.md`.

## Files several plans edit, in order

- `apps/mobile/src/data/repositories/addByRssRepository.ts`: 30 → 31 → 32 → 33 → 34 → 42.
- `addByRssDevicePath.ts` and its test: 30 → 31 → 34.
- `apps/mobile/src/sync/syncJobs.ts`: 33 → 34 → 42. Plan 34 adds the settle call in the signed-in
  branch of the refresh job; plan 42 adds the signed-out album step at its tail.
- `syncJobKinds.ts` and test: 31 → 42. `syncJobPlan.ts`, `syncQueue.test.ts`: 33 → 42.
- Maestro registration files (`scripts/mobile/e2e-test.sh`, `apps/mobile/e2e/HOW-TO-RUN.md`,
  `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`): 32 → 22 → 34 → 42 → 43 → 44 → 70 → 71
  (`e2e-test.sh` only for 70 and 71).
- `apps/mobile/e2e/add-by-rss-anonymous.yaml`: 32 → 64.
- `useAddByRssAddFlow.ts`, `useAddByRssCredentialsForm.ts`: 32 → 22.
- `AddByRssRootScreen.tsx`: 32 → 64. `AddByRssHomeDetailScreen.tsx`: 32 → 63.
  `AddByRssCredentialsScreen.tsx`: 32 → 51.
- `packages/parser/src/lib/rss/addByRSS.ts`: 11 → 20. `packages/helpers/src/index.ts`: 20 → 70.
- `packages/helpers/src/lib/membershipFeatureComparison.ts` (+ test),
  `external-services-and-meta.test.ts`: 60 → 50.
- `apps/api/openapi.yml`: 40 → 60 → 62 → 63. API `.env.example`, `validation.ts`, `api.env`: 40 → 60.
- `accountFollowingAddByRSSChannel.ts`, `account-follows-notifications.test.ts`: 62 → 63.
- Consumer catalogs: 60 → 63. Mobile catalogs: 64 → 70 → 71 → 51.
- `.cursor/skills/mobile-test-economics/SKILL.md`: 70 → 71.

## Operator steps during the run

None. The run does not commit or publish. Prompt 11 installs `podverse-partytime` from the sibling
checkout. Before that `file:` dependency is committed for other machines, publish partytime and
replace `file:../../../partytime` with the published range in `packages/parser` and `apps/mobile`,
then run `./scripts/development/update-lockfile-linux.sh` (**Root** tab). Do not run that script
while the dependency is still the sibling path: the script installs a copy of this repo, and the
sibling checkout is not in that copy.

## Cumulative verification

Prompt 51 ends with this list, adding any spec, flow, or test file the set created that it
misses (check `git status`). Leave-running tabs for the mobile flows: **Mobile E2E Metro**,
**Mobile E2E iOS** (or **Mobile E2E Android**), **Mobile E2E API**, and **Mobile E2E test-assets**
(serves the `:2111` feed fixtures). See [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md).

**partytime** tab (sibling repo `../partytime`):

```bash
npm test
```

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
make e2e_test_web_report_spec SPEC=e2e/membership-page-trial-limitations.spec.ts,e2e/about-page-features.spec.ts,e2e/add-by-rss-feed-limit-reached.spec.ts,e2e/add-by-rss-remote-items.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/products-hub.spec.ts,e2e/users-new-create-username-only.spec.ts,e2e/users-edit-advanced-overrides.spec.ts,e2e/users-detail-force-logout.spec.ts
open .artifacts/e2e-reports/latest/index.html
```

**Mobile Maestro** tab:

```bash
npm run mobile:e2e:test -- add-by-rss,add-by-rss-anonymous,add-by-rss-credentials,add-by-rss-device-credentials,add-by-rss-sign-in,membership-gate,add-by-rss-artist,add-by-rss-anonymous-artist,add-by-rss-episode-sections,add-by-rss-anonymous-sections,add-by-rss-remote-items,add-by-rss-anonymous-podroll,opml,opml-signed-out,signup-add-by-rss-limit
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
