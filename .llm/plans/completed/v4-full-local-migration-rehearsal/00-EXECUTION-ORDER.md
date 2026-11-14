# Execution order — full local migration rehearsal

Spec: [16](/docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md).
Ledger: [00-SUMMARY.md](00-SUMMARY.md). Prompts, models, and reasoning:
[COPY-PASTA.md](COPY-PASTA.md).

Phases run in order. Every prompt under one phase heading runs at the same
time. A later phase starts after all of those prompts finish. Prompts share a
phase only when their files are disjoint.

## Phase 1 — Foundations (nine prompts)

Runs after nothing. Files do not overlap.

| Prompt | Owns |
| --- | --- |
| 10 | `0010_account_phase_status.sql`, the app migration marker, both linear baseline archives, the ORM entity and service, `apps/workers/src/commands/orm/v4Rehearsal/accountPhaseStatus.ts` |
| 20 | `copyAccountLibraryLib.ts` and `copyAccountLibraryLib.test.ts` |
| 30 | `verifyAccount.ts` and `verifyAccount.test.ts` |
| 40 | `pickStageAccounts.ts`, `pickStageAccountsLib.ts`, and its test |
| 50 | `rehearsalLog.ts` and `rehearsalLog.test.ts` |
| 60 | `seedCatalogApply.ts`, `seedAccountCatalog.ts`, `seedStageCatalog.ts`, `seedStageCatalogLib.ts`, and its test |
| 70 | `rebuildLegacyMembershipExpiryFile.ts`, its lib and test, and `importLegacyMembershipExpiry.ts` |
| 81 | `localDatabaseImage.ts` and `localDatabaseImage.test.ts` |
| 83 | `seedAccountIdentity.ts`, `identityOutcome.ts`, and `identityOutcome.test.ts` |

Prompt 10 leaves its release-notes entry in the final message.

## Phase 2 — Group transactions and the command (two prompts)

| Prompt | Runs after | Owns |
| --- | --- | --- |
| 21 | 20 | `copyAccountLibraryLib.ts`, its test, `copyAccountLibraryApply.ts`, `copyAccountLibrary.ts` |
| 80 | 50 | `packages/worker-commands/src/registry.ts`, `apps/workers/src/commands/index.ts`, `categoriesForCommand.ts` and its test, `apps/workers/package.json`, `apps/workers/ENV.md`, `runFullRehearsal.ts`, `runFullRehearsalLib.ts` and its test, `runFullRehearsalLoop.ts` |

Prompt 21 leaves its release-notes entry in the final message. Prompt 80 has none.

## Phase 3 — Add by RSS tier and the rehearsal loop (two prompts)

| Prompt | Runs after | Owns |
| --- | --- | --- |
| 22 | 21 | `copyAccountLibraryApply.ts`, `copyAccountLibrary.ts` |
| 82 | 10, 40, 50, 80, 81 | `runFullRehearsalLoop.ts`, `runFullRehearsalLoopLib.ts` and its test, `runFullRehearsalLoop.test.ts`, `rehearsalPhaseHandlers.ts` |

Prompt 22 leaves its release-notes entry in the final message. Prompt 82 has none.
Prompt 82 replaces the loop function prompt 80 created and creates
`rehearsalPhaseHandlers.ts`.

## Phase 4 — Directory-follow tier (one prompt)

Prompt 23 runs after 22. It owns `copyAccountLibraryApply.ts` and
`copyAccountLibrary.ts`. It appends its own release-notes entry.

## Phase 5 — Playlist resource limit (one prompt)

Prompt 24 runs after 23. It owns `copyAccountLibraryLib.ts`, its test,
`copyAccountLibraryApply.ts`, and `copyAccountLibrary.ts`. It appends its own
release-notes entry.

## Phase 6 — Phase handlers (one prompt)

Prompt 84 runs after 10, 24, 30, 50, 60, 70, 82, and 83. It owns
`rehearsalPhaseHandlers.ts`, `rehearsalPhaseOutcome.ts` and its test,
`apps/workers/package.json`, and `package-lock.json`. It keeps the workers
script prompt 80 added, adds the bcrypt dependency its plan names, and appends
its own release-notes entry.

## Phase 7 — Overnight prompt (one prompt, last)

Prompt 90 runs after 84. It owns `.cursor/prompts/v4-full-local-migration-rehearsal.md`
and `.cursor/prompts/CURSOR-PROMPTS.md`. It appends the release-notes entries
from prompts 10, 21, and 22, moves this directory to
`.llm/plans/completed/v4-full-local-migration-rehearsal/`, and ends with the
cumulative verification. It does not run tests.

## Files that force the sequence

- Library lib and its test: 20, then 21, then 24.
- `copyAccountLibraryApply.ts` and `copyAccountLibrary.ts`: 21, then 22, then 23, then 24.
- `runFullRehearsalLoop.ts`: 80, then 82.
- `rehearsalPhaseHandlers.ts`: 82, then 84.
- `apps/workers/package.json`: 80, then 84.
- `package-lock.json`: 84 only.

No prompt edits `docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md`
or creates `apps/workers/src/commands/orm/v4Rehearsal/index.ts`.

## Release notes

Prompts 10, 21, and 22 share a phase, so they do not write
`release-notes/scratchpad.md`. Prompts 23, 24, and 84 run alone and append
their own entries. Every other prompt's release scratchpad is none. Prompt 90
appends the three shared-phase entries.

## Rules

- Follow the numbered plan. It already resolved each choice and names the paths.
- A stored Add by RSS number that already covers the count stays, including a
  number above 10000. Plan 30 accepts that and expects the feeds to be written.
- Do not run tests during a prompt. The operator runs the list in prompt 90
  after the set.
- A stalled prompt stays on Cursor Grok 4.7 and is rerun one reasoning level
  higher.
