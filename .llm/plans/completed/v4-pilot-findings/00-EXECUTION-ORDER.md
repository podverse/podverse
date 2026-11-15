# v4 pilot findings — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Findings for the operator: [00-FINDINGS.md](00-FINDINGS.md).
Ledger and settled decisions: [00-SUMMARY.md](00-SUMMARY.md). Prompts and models:
[COPY-PASTA.md](COPY-PASTA.md).

Runs in worktree `podverse_feature_v4_migration_followups`, branch
`feature/v4-migration-followups`. Thirteen plans in nine phases. Three linear migrations, numbered
in phase order: `0013` (plan 07), `0014` (plan 04), `0015` (plan 06).

## Rules for every prompt

- Read and execute your plan. `00-SUMMARY.md` § Settled decisions is decided. When the code
  disagrees with a path or line number, trust the code, keep the plan's intent, and say what
  differed in your final message.
- Do not run tests. Add the tests your plan names. Type-check or lint only workspaces you edited.
  `make db_regen_linear_baseline` and `make db_verify_linear_baseline` are generators and are
  allowed in plans 04, 06, and 07.
- Never run `git commit`, `git push`, `gh`, `npm publish`, or release scripts. Never run a `v4*`
  worker command, the rehearsal, or the job loop against a database.
- v4 is read-only. Logs, tests, and docs carry counts only. The only account that may be named is
  `eFv5NFx` (**public-repo-no-secrets**, **v4-backend-reference**). Never paste feed or page text.
- A prompt that shares its phase with another puts its release entry in its final message under
  "Release notes entry". A prompt alone in its phase appends its entry to
  `release-notes/scratchpad.md`. Prompt 11 collects the rest.
- Comments follow **comments-future-forward**. SQL follows **linear-sql-greenfield-only** and
  **migration-readiness-marker-sync**.

## Phases

| Phase | Prompt | Model · reasoning | Why it waits |
| --- | --- | --- | --- |
| 1 | 01 UTC timestamps | Cursor Grok 4.7 · extra high | — |
| 1 | 07 parse failure reasons (`0013`) | Cursor Grok 4.7 · extra high | — |
| 1 | 10 duration overflow | Cursor Grok 4.7 · medium | — |
| 2 | 02 unlisted visibility | Cursor Grok 4.7 · extra high | phase order |
| 2 | 08 retry settle and deadline | Cursor Grok 4.7 · extra high | 07 (reason column) |
| 3 | 03 Add by RSS non-feed values | Cursor Grok 4.7 · high | 02 (copy, verify) |
| 3 | 09 oversized migration feeds | Cursor Grok 4.7 · extra high | 08 (`runDue.ts`) |
| 3 | 12 public profiles | Cursor Grok 4.7 · high | 01 (identity seed) |
| 4 | 04 playlist follow pending (`0014`) | Cursor Grok 4.7 · extra high | 03 (copy, verify) |
| 5 | 05 clip pointer playback | Cursor Grok 4.7 · extra high | 04 (copy, replay, verify) |
| 6 | 06 history cap tier (`0015`) | Cursor Grok 4.7 · extra high | 05 (copy, verify) |
| 7 | 13 email twin library merge | Cursor Opus 5.5 · high | 06, 12 |
| 8 | 11 docs, prompt, and close | Cursor Grok 4.7 · medium | all |

Files shared inside a phase: none. Phase 1 prompts touch identity, parser plus the feed log, and
parser-mapping. Phase 2: library copy and verify, then scheduler and catalog. Phase 3: library
copy and verify, job runner and catalog summary, identity seed.

## Cumulative verification

The operator runs this once, after prompt 11.

**Root** tab:

```bash
npm run build:packages
npm run test -w packages/helpers
npm run test -w packages/parser-mapping
npm run test -w packages/parser
npm run test -w packages/orm
npm run test -w apps/workers -- src/commands/orm/v4Identity src/commands/orm/v4Library src/commands/orm/v4Rehearsal src/commands/orm/v4Catalog src/commands/orm/scheduledJob src/commands/billing src/lib/v4
make db_verify_linear_baseline
npm run lint
```

Then the pilot again. The rehearsal restores its clean database itself. Start it in the **Root**
tab:

```bash
npm run build -w apps/workers
npm run v4_run_full_rehearsal -w apps/workers -- --stage pilot --catalog-wait-hours 6
```

When its log shows `rehearsal restore=finished`, start (or restart) the parsers in the **Workers**
tab. The restore disconnects any parser that was already running.

```bash
npm run dev:workers:parsers
```

At the same time, start the job loop in a second **Workers** tab:

```bash
while true; npm run scheduled_jobs_run_due -w apps/workers -- -limit 100; sleep 60; end
```
