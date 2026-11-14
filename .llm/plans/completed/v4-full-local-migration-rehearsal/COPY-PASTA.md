# Full local migration rehearsal — Copy-Pasta Prompts

## Execution rules

Phases are sequential. Finish every prompt under one heading before the next
heading starts.

Prompts under one heading run at the same time. Their files are disjoint.
Details and the file each prompt owns: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

Every prompt is **Cursor Grok 4.7**. Reasoning is the level on that prompt.
A stalled prompt stays on Cursor Grok 4.7 and is rerun one reasoning level
higher.

| Prompt | Model | Reasoning | Why |
| --- | --- | --- | --- |
| 10 | Cursor Grok 4.7 | extra high | Database migration for per-account phase status |
| 20 | Cursor Grok 4.7 | high | Cap decision helpers and their unit tests |
| 21 | Cursor Grok 4.7 | extra high | Per-group commits and a timestamp that lets a retry finish |
| 22 | Cursor Grok 4.7 | extra high | Cap-tier write for Add by RSS |
| 23 | Cursor Grok 4.7 | high | Directory-follow tier log |
| 24 | Cursor Grok 4.7 | high | Playlist over 10000 resources left for an operator |
| 30 | Cursor Grok 4.7 | high | Per-account compatibility check |
| 40 | Cursor Grok 4.7 | high | Pilot, sample, and full stage pick |
| 50 | Cursor Grok 4.7 | high | Gitignored rehearsal log and summary |
| 60 | Cursor Grok 4.7 | high | Catalog seed until every mapped feed is settled |
| 70 | Cursor Grok 4.7 | high | Paid-expiry file for the accounts in the stage |
| 80 | Cursor Grok 4.7 | high | Worker command registration |
| 81 | Cursor Grok 4.7 | high | Local database dump and restore |
| 82 | Cursor Grok 4.7 | extra high | Resume, clean restore, and the failure-window stop |
| 83 | Cursor Grok 4.7 | high | Identity action result |
| 84 | Cursor Grok 4.7 | high | Phase handlers on top of the loop |
| 90 | Cursor Grok 4.7 | medium | Overnight prompt, then archive and verification |

## How to use

1. Select the **Cursor model** and **Reasoning** in the Cursor UI before pasting a prompt.
2. Phase 1: paste all nine prompts and run them together. Wait until all nine finish.
3. Phase 2: paste both prompts and run them together. Wait until both finish.
4. Phase 3: paste both prompts and run them together. Wait until both finish.
5. Phases 4, 5, 6, and 7: one prompt each. Wait for it to finish before the next phase.

**Optional — run the set unattended (Root tab):**
`./scripts/abcplan/run.sh run v4-full-local-migration-rehearsal`.
It runs every pending prompt under the first pending heading at once, and stops
at the first blocker.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/v4-full-local-migration-rehearsal/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompts below
instead when you want to read each result before the next prompt starts.

## Phase 1 — Foundations

Nine prompts. Each edits only the files in its plan.

- 10: migration `0010_account_phase_status.sql`, the app migration marker, both linear baseline archives, the ORM account-phase-status files, and `accountPhaseStatus.ts`
- 20: `copyAccountLibraryLib.ts` and `copyAccountLibraryLib.test.ts`
- 30: `verifyAccount.ts` and `verifyAccount.test.ts`
- 40: `pickStageAccounts.ts`, `pickStageAccountsLib.ts`, and its test
- 50: `rehearsalLog.ts` and `rehearsalLog.test.ts`
- 60: `seedCatalogApply.ts`, `seedAccountCatalog.ts`, `seedStageCatalog.ts`, `seedStageCatalogLib.ts`, and its test
- 70: `rebuildLegacyMembershipExpiryFile.ts`, its lib and test, and `importLegacyMembershipExpiry.ts`
- 81: `localDatabaseImage.ts` and `localDatabaseImage.test.ts`
- 83: `seedAccountIdentity.ts`, `identityOutcome.ts`, and `identityOutcome.test.ts`

- [x] **10 — Account phase status**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/10-account-phase-status.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. Put the plan's release scratchpad entry in your final message under Release notes entry.

Do not run tests during agent work.
```

- [x] **20 — Library cap decisions**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/20-library-cap-decisions.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none.

Do not run tests during agent work.
```

- [x] **30 — Compatibility check**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/30-compatibility-check.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none. A stored Add by RSS number that already covers the count passes, including a number above 10000.

Do not run tests during agent work.
```

- [x] **40 — Stage pick**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/40-stage-pick.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none.

Do not run tests during agent work.
```

- [x] **50 — Rehearsal log**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/50-rehearsal-log.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none.

Do not run tests during agent work.
```

- [x] **60 — Catalog settle**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/60-catalog-settle.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none.

Do not run tests during agent work.
```

- [x] **70 — Paid-expiry file**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/70-rebuild-paid-expiry-file.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none.

Do not run tests during agent work.
```

- [x] **81 — Local database image**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/81-local-database-image.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none.

Do not run tests during agent work.
```

- [x] **83 — Identity outcome**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/83-identity-outcome.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none.

Do not run tests during agent work.
```

## Phase 2 — Group transactions and the command

Two prompts.

- 21: `copyAccountLibraryLib.ts`, its test, `copyAccountLibraryApply.ts`, `copyAccountLibrary.ts`
- 80: the worker registry, `apps/workers/src/commands/index.ts`, `categoriesForCommand.ts` and its test, `apps/workers/package.json`, `apps/workers/ENV.md`, and the `runFullRehearsal` files including the first `runFullRehearsalLoop.ts`

- [x] **21 — Library copy group transactions**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/21-library-copy-group-transactions.md

Edit only the files in that plan's Files section. Plan 20 has already landed in the lib file. Apply only this plan's edits. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. Put the plan's release scratchpad entry in your final message under Release notes entry.

Do not run tests during agent work.
```

- [x] **80 — Rehearsal command**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/80-rehearsal-command.md

Edit only the files in that plan's Files section. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none. Create runFullRehearsalLoop.ts as this plan describes. Plan 82 replaces that function later.

Do not run tests during agent work.
```

## Phase 3 — Add by RSS tier and the rehearsal loop

Two prompts.

- 22: `copyAccountLibraryApply.ts`, `copyAccountLibrary.ts`
- 82: `runFullRehearsalLoop.ts`, `runFullRehearsalLoopLib.ts` and its test, `runFullRehearsalLoop.test.ts`, `rehearsalPhaseHandlers.ts`

- [x] **22 — Add by RSS cap tier**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/22-add-by-rss-cap-tier-write.md

Edit only the files in that plan's Files section. Plans 20 and 21 have already landed. Apply only this plan's edits. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. Put the plan's release scratchpad entry in your final message under Release notes entry.

Do not run tests during agent work.
```

- [x] **82 — Rehearsal loop**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/82-rehearsal-loop.md

Edit only the files in that plan's Files section. Replace the loop function plan 80 created. Do not edit runFullRehearsal.ts, the registry, apps/workers/package.json, or the library-copy files. Do not edit COPY-PASTA.md or release-notes/scratchpad.md. This plan's release scratchpad is none.

Do not run tests during agent work.
```

## Phase 4 — Directory-follow tier

- [x] **23 — Directory-follow cap log**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/23-directory-follow-cap-log.md

You run alone in this phase. Plans 21 and 22 have already landed in the library-copy files. Apply only this plan's edits. Append the plan's release scratchpad entry to release-notes/scratchpad.md. Do not add a Release notes entry section. Do not edit COPY-PASTA.md.

Do not run tests during agent work.
```

## Phase 5 — Playlist resource limit

- [x] **24 — Playlist resource limit**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/24-playlist-resource-needs-operator.md

You run alone in this phase. Plans 20, 21, 22, and 23 have already landed in the library-copy files. Apply only this plan's edits. Append the plan's release scratchpad entry to release-notes/scratchpad.md. Do not add a Release notes entry section. Do not edit COPY-PASTA.md.

Do not run tests during agent work.
```

## Phase 6 — Phase handlers

- [x] **84 — Rehearsal phases**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/84-rehearsal-phases.md

You run alone in this phase. Keep the workers script plan 80 added in apps/workers/package.json. Add only the bcrypt dependency this plan names, then update the lockfile the way the plan says. Fill in rehearsalPhaseHandlers.ts from the stub plan 82 created. Append the plan's release scratchpad entry to release-notes/scratchpad.md. Do not add a Release notes entry section. Do not edit COPY-PASTA.md.

Do not run tests during agent work.
```

## Phase 7 — Overnight prompt

- [x] **90 — Overnight agent prompt**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/v4-full-local-migration-rehearsal/90-overnight-agent-prompt.md

You are the last prompt. After that plan's files are written, append the release notes that shared a phase. Read .artifacts/plan-runner/v4-full-local-migration-rehearsal/10.md, 21.md, and 22.md. Append each Release notes entry to release-notes/scratchpad.md, one entry per change, with a blank line between entries. If one of those files has no Release notes entry, copy the entry from that plan's Release scratchpad section. Skip an entry whose heading is already in the scratchpad. Prompts 23, 24, and 84 already appended their own entries.

Move .llm/plans/active/v4-full-local-migration-rehearsal to .llm/plans/completed/v4-full-local-migration-rehearsal. Do not edit COPY-PASTA.md. Do not commit.

Do not run tests. Earlier prompts were not tested. End your response with one fenced bash block for the Root tab containing these commands and nothing else:

npm run build:packages
npm run lint
npm run test -w packages/orm
npm run test -w apps/workers

This set does not change an API route, a web page, or mobile, so that block has no API, Playwright, or Maestro command.
```
