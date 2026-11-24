# Boostagram support — copy-pasta prompts

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Phase order, file
ownership, and the cumulative verification: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/boostagram-support/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompts below instead when
you want to read each result before the next prompt starts.

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run boostagram-support`.
It runs plan-runner with `--parallel`: every pending prompt under the first pending phase heading
runs at once, and every phase with several prompts edits disjoint files. It stops at the first
blocker; resume with `./scripts/abcplan/run.sh run boostagram-support --resume 'Your answer.'`
(`/abcresume` gives the ready-made commands).

Phases run in order. Wait for every prompt in a phase before the next phase starts. Prompts in
one phase run at the same time.

Prompts do not run tests. The operator runs the cumulative verification after prompt 71.

No prompt stops for a publish or for a person.

## Models

| Prompt | Model | Reasoning | Why |
| --- | --- | --- | --- |
| 10 | Cursor Grok 4.7 | extra high | Shared payment contract later prompts call |
| 11 | Cursor Grok 4.7 | extra high | Signed-out pay path and sender-name rules |
| 12 | Cursor Grok 4.7 | extra high | Eligibility rule every boost button uses |
| 20 | Cursor Grok 4.7 | high | Parser value rows follow an existing mapper |
| 21 | Cursor Grok 4.7 | medium | One support-status section in an existing doc |
| 22 | Cursor Grok 4.7 | extra high | Drops a column and regenerates the baselines |
| 30 | Cursor Grok 4.7 | extra high | Alby OAuth and payment HTTP |
| 31 | Cursor Grok 4.7 | extra high | Tokens in secure storage and PKCE |
| 32 | Cursor Grok 4.7 | high | Settings screens on the existing More list |
| 40 | Cursor Grok 4.7 | high | Web headers already show Boost |
| 41 | Cursor Grok 4.7 | high | One button on the existing player row |
| 50 | Cursor Grok 4.7 | extra high | Button targets on many mobile screens |
| 60 | Cursor Grok 4.7 | high | Move the existing message view into the package |
| 61 | Cursor Grok 4.7 | extra high | Mobile list on the screens web already uses |
| 70 | Cursor Grok 4.7 | extra high | Phone adapter over the shared send operation |
| 71 | Cursor Grok 4.7 | extra high | Sheet submit, remembered name, and the post |

## Phase 1

Prompts 10, 20, 21, 22, and 30 run at once. 10 owns the shared send operation, the root lockfile,
and the first `v4v-metaboost` export line. 20 owns the partytime value mapper and the parser
value writers. 21 owns `docs/v4v/DOCS-V4V.md`. 22 owns the column drop, the baselines, and the
flag property in `boost.ts`. 30 owns the Alby HTTP files and the first two Vitest include paths.

- [x] **10 — Shared manual boost send**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/10-shared-boost-send.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 20, 21, 22, and 30. Edit only the files your plan lists. Append only
`export * from './mbrssV1PostBoost.js';` to packages/v4v-metaboost/src/index.ts. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
```

- [x] **20 — Value rows match the feed**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/boostagram-support/20-value-recipient-feed-match.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 21, 22, and 30. Edit only the files your plan lists. Do not edit
packages/parser-mapping/src/addByRSS/boost.ts. Do not edit release-notes/scratchpad.md. Put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **21 — Boostagram support status**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/boostagram-support/21-v4v-support-status.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 20, 22, and 30. Edit only docs/v4v/DOCS-V4V.md. Your release-notes
entry is none.
```

- [x] **22 — Drop the Podcast Index value flag**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/22-drop-podcast-index-value-flag.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 20, 21, and 30. Edit only the files your plan lists. In
packages/parser-mapping/src/addByRSS/boost.ts, delete the has_podcast_index_value property and
do not add a builder. Do not edit release-notes/scratchpad.md. Put your release-notes entry in
your final message under "## Release notes entry".
```

- [x] **30 — Alby wallet protocol**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/30-alby-protocol.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 20, 21, and 22. Edit only the files your plan lists. Append your two
test paths to apps/mobile/vitest.config.ts and do not rewrite its comment. Your release-notes
entry is none.
```

## Phase 2

Prompts 11, 31, and 60 run at once. 11 owns the web form rules, `useBoostPayments.ts`, and the
first boost seed. 31 owns the Alby session, the mobile package files, and the next Vitest paths.
60 owns the shared message view and the second `v4v-metaboost` export line.

- [x] **11 — Signed-out web boost form**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/11-web-signed-out-boost.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 2 with 31 and 60. Edit only the files your plan lists. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
```

- [x] **31 — Alby session on the phone**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/31-alby-session.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 2 with 11 and 60. Edit only the files your plan lists. Keep the Vitest paths
plan 30 added. Do not edit release-notes/scratchpad.md. Put your release-notes entry in your
final message under "## Release notes entry".
```

- [x] **60 — Shared public boost-message view**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/boostagram-support/60-public-boost-message-view.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 2 with 11 and 31. Edit only the files your plan lists. Append
`export * from './publicMessageView.js';` as the last line of packages/v4v-metaboost/src/index.ts
and keep the export plan 10 added. Your release-notes entry is none.
```

## Phase 3

Prompts 12, 32, and 70 run at once. 12 owns eligibility and the next web spec. 32 owns the
Value for Value screens, navigation, and the mobile catalogs. 70 owns the phone send helper and
the mobile package dependencies.

- [x] **12 — Boost action eligibility**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/12-boost-eligibility.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 32 and 70. Edit only the files your plan lists. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
```

- [x] **32 — Value for Value settings**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/boostagram-support/32-value-provider-settings.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 12 and 70. Edit only the files your plan lists. You are the only prompt
that runs npm run i18n:compile. Do not edit FullPlayerScreen.tsx, BoostSheet.tsx, or
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
```

- [x] **70 — Mobile boost send helper**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/70-mobile-boost-send.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 12 and 32. Edit only the files your plan lists. Keep the expo-crypto
dependency from plan 31 and the Vitest paths from plans 30 and 31. Your release-notes entry
is none.
```

## Phase 4

Prompts 40 and 61 run at once. 40 owns the web channel and item surfaces and
`buildAddByRssBoostItem`. 61 owns the mobile received-boost list and does not edit `boost.ts`.

- [x] **40 — Web channel and item boost surfaces**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/boostagram-support/40-web-boost-surfaces.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 61. Edit only the files your plan lists. Add buildAddByRssBoostItem and
do not add buildAddByRssBoostSheetItem. Do not edit release-notes/scratchpad.md. Put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **61 — Received boostagrams on mobile**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/61-mobile-received-boostagrams.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 40. Edit only the files your plan lists. Do not edit BoostSheet.tsx,
FullPlayerScreen.tsx, or packages/parser-mapping/src/addByRSS/boost.ts. Keep Vitest paths from
plans 30, 31, and 70. Do not edit release-notes/scratchpad.md. Put your release-notes entry in
your final message under "## Release notes entry".
```

## Phase 5

Prompts 41 and 50 run at once. 41 owns the web full-player button and does not edit `boost.ts`.
50 owns `buildAddByRssBoostSheetItem`, the mobile boost buttons, and the Boosts chip plan 61 added.

- [x] **41 — Web full-player boost button**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/boostagram-support/41-web-full-player-boost-button.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 5 with 50. Edit only the files your plan lists. Do not edit
packages/parser-mapping/src/addByRSS/boost.ts or release-notes/scratchpad.md. Put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **50 — Mobile boost entry points**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/50-mobile-boost-entry-points.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 5 with 41. Edit only the files your plan lists. Keep plan 40's
buildAddByRssBoostItem and plan 61's Boosts chip. Add buildAddByRssBoostSheetItem. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
```

## Phase 6

- [x] **71 — Mobile boost sheet sends through Alby** (last prompt: append the shared-phase release entries, archive the set, give the cumulative verification)

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/boostagram-support/71-mobile-boost-sheet.md

Follow .llm/plans/active/boostagram-support/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone and you are the last prompt of the set. After your plan's work:

1. Append to release-notes/scratchpad.md, in plan-number order, the "## Release notes entry" from
   each of these final messages in .artifacts/plan-runner/boostagram-support/: 10.md, 11.md,
   12.md, 20.md, 21.md, 22.md, 30.md, 31.md, 32.md, 40.md, 41.md, 50.md, 60.md, 61.md, 70.md.
   Skip an entry that says none. Then append your own plan's entry. Do not edit entries already
   in the file.
2. Move the whole set, .llm/plans/active/boostagram-support/ (numbered plans, 00-* files and
   COPY-PASTA.md), to .llm/plans/completed/boostagram-support/, and remove the empty active
   directory. Do not tick your own checkbox.
3. End with the cumulative verification in 00-EXECUTION-ORDER.md § Cumulative verification,
   per response-ending-make-verify § Copy-pasta final prompt: assume nothing was tested, add any
   spec, Maestro flow, or test file the set created that the list misses (check git status), and
   keep the tab labels. Leave-running Metro, simulator, and E2E API commands stay out of the
   paste blocks.
```
