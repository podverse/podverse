# v4 signed-out carryover — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Ledger and settled decisions: [00-SUMMARY.md](00-SUMMARY.md).
Prompts and models: [COPY-PASTA.md](COPY-PASTA.md).

Runs in this checkout, on the current branch, **after `add-by-rss-directory-match` is complete**.
Seven plans, one per phase.

## Where this set is

Prompts 01–05 are done. Their files are in `.llm/plans/completed/v4-signed-out-carryover/`.
The storage spike passed on iOS 18.2; Android was not run, and a missing store reads as empty.
Prompt 06 stays blocked: the feed-list field spike in doc 08 § Open questions still says
"Not run", so the Continue Migration screen stays blocked.

## Rules for every prompt

- Read and execute your plan. `00-SUMMARY.md` § Settled decisions is decided. When the code
  disagrees with a path or line number, trust the code, keep the plan's intent, and say what
  differed in your final message.
- Prompts 04, 05, and 06 start with a gate. When the gate fails, change nothing and end with the
  exact `RUNNER-STATUS: BLOCKED` line the plan gives. That stop is expected while the spikes in
  doc 08 are not recorded. Resume the set once the operator writes the result into doc 08.
- Do not run tests. Add the tests your plan names. Type-check or lint only workspaces you edited.
  `make db_regen_linear_baseline` in prompt 01 is a generator and is allowed.
- Never run `git commit`, `git push`, `gh`, `npm publish`, or release scripts. Never run a `v4*`
  worker command against a database.
- v4 is read-only. Logs and docs carry counts only (**public-repo-no-secrets**,
  **v4-backend-reference**).
- Append your plan's `## Release scratchpad` entry to `release-notes/scratchpad.md`.
- Comments follow **comments-future-forward**. UI copy follows **ui-copy-casing**.

## Phases

| Phase | Prompt | Model · reasoning | Why it waits |
| --- | --- | --- | --- |
| 1 | 01 legacy podcast map | Cursor Grok 4.7 · extra high | previous set |
| 2 | 02 lookup route | Cursor Grok 4.7 · high | 01 (column and rows) |
| 3 | 03 library copy match | Cursor Grok 4.7 · extra high | previous set's `getForFeedUrls` |
| 4 | 04 phone read (gated: storage spike) | Cursor Grok 4.7 · extra high | doc 08 storage spike |
| 5 | 05 phone resolve (gated) | Cursor Grok 4.7 · extra high | 02, 04 |
| 6 | 06 Continue Migration screen (gated: field spike) | Cursor Grok 4.7 · high | doc 08 field spike, 05 |
| 7 | 07 docs and close | Cursor Grok 4.7 · medium | 01–06 |

## Cumulative verification

The operator runs this once, after prompt 07.

**Root** tab:

```bash
npm run build:packages
npm run test -w apps/workers -- src/commands/orm/v4Catalog/writeLegacyPodcastMapLib.test.ts src/commands/orm/v4Library/copyAccountLibraryLib.test.ts src/commands/orm/v4Rehearsal/verifyAccount.test.ts
npm run test -w packages/orm -- src/services/legacy/legacyPodcastLookup.test.ts
npm run test -w apps/api -- src/test/legacy-podcast-lookup.integration.test.ts
npm --prefix apps/mobile run test -- src/migration/v4 src/data/repositories/subscriptionsMerge.test.ts src/sync/syncJobKinds.test.ts src/data/db/migrations.test.ts
npm run type-check:mobile
npm run lint
```

**Mobile Maestro** tab (with **Mobile E2E Metro**, **Mobile E2E iOS**, and **Mobile E2E API**
already running):

```bash
npm run mobile:e2e:test -- v4-carryover-anonymous
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
