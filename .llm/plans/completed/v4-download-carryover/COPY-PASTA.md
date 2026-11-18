# COPY-PASTA — v4 download carryover

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md).
Phase order and the cumulative verification: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

Every prompt is Cursor Grok 4.7 with Fast off. Phases run in order. Prompts under one phase
edit disjoint files and run at the same time. Prompts do not run tests. The operator runs the
cumulative verification after Close.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/v4-download-carryover/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompts below instead when
you want to read each result before the next phase starts.

## How to use

Select the **Cursor model** and **Reasoning** in the Cursor UI before each paste. Fast stays off.

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run v4-download-carryover`.
Every phase whose prompts share a heading is parallel-safe, and the script passes `--parallel`.
It stops at the first blocker. Resume with
`./scripts/abcplan/run.sh run v4-download-carryover --resume 'Your answer.'`
(`/abcresume` gives the ready-made commands).

| Prompt | Model | Reasoning | Why |
| --- | --- | --- | --- |
| 10 | Cursor Grok 4.7 | extra high | Lookup contract later prompts call, and it refactors the shipped podcast lookup |
| 20 | Cursor Grok 4.7 | high | File helpers specified from the v4 downloader, plus one native accessor |
| 30 | Cursor Grok 4.7 | extra high | New SQLite table, and removing a feed deletes its files |
| 50 | Cursor Grok 4.7 | extra high | Committed feed copy and seed rows the device flow reads |
| 21 | Cursor Grok 4.7 | extra high | SQLite migration, and a thrown read must not delete files |
| 32 | Cursor Grok 4.7 | extra high | SQLite column and the playback rule later prompts rely on |
| 40 | Cursor Grok 4.7 | medium | Status names and catalog labels |
| 31 | Cursor Grok 4.7 | extra high | Promotion keeps an unmatched download playable on the directory show |
| 41 | Cursor Grok 4.7 | extra high | Pure match and delete decisions |
| 42 | Cursor Grok 4.7 | extra high | The pass that copies and deletes files, signed in or signed out |
| 51 | Cursor Grok 4.7 | high | Maestro flow following the existing carryover flow |
| 60 | Cursor Grok 4.7 | extra high | Android folder setting writes new files and playback URLs |
| Close | Cursor Grok 4.7 | low | Archive the set and list the verification |

## Phase 1

Plans 10, 20, 30, and 50 at once. File ownership is in
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) § Phase 1 owns.

- [x] **10 — Public legacy episode lookup**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/10-legacy-episode-lookup-route.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plans 20, 30, and 50. Edit only the files in your plan's ## Files.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message under "Release notes entry".
POST /legacy/podcast/lookup answers stay the same. Do not run tests. Do not commit.
```

- [x] **20 — Locate, adopt, and delete v4 download files**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-download-carryover/20-v4-download-file-helpers.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plans 10, 30, and 50. Edit only the files in your plan's ## Files.
You own apps/mobile/vitest.config.ts in this phase. Add your include line. Do not rewrite the file.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message under "Release notes entry".
Do not run tests. Do not commit.
```

- [x] **30 — Add by RSS local episode**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/30-add-by-rss-local-episode.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plans 10, 20, and 50. Edit only the files in your plan's ## Files.
You own the mobile SQLite migration list in this phase. Take the next version. Version 4 is the latest at assemble time, so this table is version 5 unless the tree has already moved.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message under "Release notes entry".
Do not run tests. Do not commit.
```

- [x] **50 — Seed the Podcasting 2.0 feed**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/50-podcasting20-carryover-seed.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plans 10, 20, and 30. Edit only the two files in your plan's ## Files.
Your release scratchpad is none. Do not add an entry and do not edit release-notes/scratchpad.md.
Do not run tests. Do not commit.
```

## Phase 2

- [x] **21 — Read v4 download state and stage rows**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/21-v4-download-read-and-stage.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Plan 30 has already appended a SQLite migration. Use the next version, as your plan's SQLite section says.
Append your release scratchpad entry, and write the version number you used.
Add your vitest include lines after plan 20's. Do not rewrite apps/mobile/vitest.config.ts.
Do not run tests. Do not commit.
```

## Phase 3

Plans 32 and 40 at once. File ownership is in
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) § Phase 3 owns.

- [x] **32 — Keep a downloaded episode that leaves its feed**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/32-keep-downloaded-episode-on-refresh.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plan 40. Edit only the files in your plan's ## Files.
Plans 30 and 21 have already appended migrations. Use one higher than the last version in the array.
Do not edit the mobile i18n catalogs or release-notes/scratchpad.md.
Put your release-notes entry in your final message under "Release notes entry".
Do not run tests. Do not commit.
```

- [x] **40 — Download carryover names and labels**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/v4-download-carryover/40-download-carryover-vocabulary.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plan 32. Edit only the files in your plan's ## Files.
You own the mobile i18n catalog originals and overrides in this phase. Insert keys. Do not rewrite a catalog file.
Your release scratchpad is none. Do not add an entry and do not edit release-notes/scratchpad.md.
Do not run tests. Do not commit.
```

## Phase 4

Plans 31 and 41 at once. File ownership is in
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) § Phase 4 owns.

- [x] **31 — Local episodes through promotion**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/31-local-episode-promotion.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plan 41. Edit only the files in your plan's ## Files.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message under "Release notes entry".
Do not run tests. Do not commit.
```

- [x] **41 — Decide what each staged v4 file becomes**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/41-download-carryover-decisions.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plan 31. Edit only the files in your plan's ## Files.
Add your vitest include line after the lines plans 20 and 21 added. Do not rewrite apps/mobile/vitest.config.ts.
Your release scratchpad is none. Do not add an entry and do not edit release-notes/scratchpad.md.
Do not run tests. Do not commit.
```

## Phase 5

- [x] **42 — Run the download carryover**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/42-download-carryover-run.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Append your release scratchpad entry to release-notes/scratchpad.md.
Add your vitest include line after plan 41's. Do not rewrite apps/mobile/vitest.config.ts.
downloads/README.md already has plan 30's paragraph. Add yours. Do not rewrite the file.
Do not run tests. Do not commit.
```

## Phase 6

Plans 51 and 60 at once. File ownership is in
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) § Phase 6 owns.

- [x] **51 — Device E2E for v4 download carryover**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-download-carryover/51-v4-download-carryover-e2e.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plan 60. Edit only the files in your plan's ## Files.
You own apps/mobile/src/navigation/index.tsx and apps/mobile/e2e/v4-download-carryover.yaml.
Do not edit settings-downloads.yaml, the i18n catalogs, or release-notes/scratchpad.md.
Your release scratchpad is none. Do not add an entry.
Do not run tests. Do not commit.
```

- [x] **60 — Android chosen download folder**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-download-carryover/60-android-download-folder.md

Follow .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
You run at the same time as plan 51. Edit only the files in your plan's ## Files.
You own the mobile i18n catalogs in this phase. Insert keys after plan 40's. Do not rewrite a catalog file.
Plan 42 already edited downloadManager.ts and downloads/README.md. Plan 32 already edited resolvePlaybackUrl.ts and PlaybackProvider.tsx. Edit by the symbols your plan names.
Do not edit apps/mobile/src/navigation/index.tsx or release-notes/scratchpad.md.
Put your release-notes entry in your final message under "Release notes entry".
Do not run tests. Do not commit.
```

## Phase 7

- [x] **Close — Archive the set and list verification**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** low

```
Read and execute .llm/plans/active/v4-download-carryover/00-EXECUTION-ORDER.md

You are the last prompt. Follow § Close and § Cumulative verification. Do not change product, test, or catalog code.

Append each "Release notes entry" from prompts 10, 20, 30, 31, 32, and 60. Their final messages are in .artifacts/plan-runner/v4-download-carryover/. Prompts 21 and 42 already appended theirs. Skip an entry that is already in release-notes/scratchpad.md. Leave entries that were in the file before this set.

Move .llm/plans/active/v4-download-carryover to .llm/plans/completed/v4-download-carryover.

Do not run tests, lint, or Maestro. End your message with the cumulative verification in 00-EXECUTION-ORDER.md § Cumulative verification, exactly as written, including the tab labels.
```
