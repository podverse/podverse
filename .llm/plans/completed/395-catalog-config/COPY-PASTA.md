# Catalog config — copy-pasta prompts

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Phase order, file
ownership, and the cumulative verification: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/395-catalog-config/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompts below instead when
you want to read each result before the next prompt starts.

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run 395-catalog-config`.
It runs plan-runner with `--parallel`: every pending prompt under the first pending phase heading
runs at once, and every phase with several prompts edits disjoint files. It stops at the first
blocker; resume with `./scripts/abcplan/run.sh run 395-catalog-config --resume 'Your answer.'`
(`/abcresume` gives the ready-made commands).

Phases run in order. Wait for every prompt in a phase before the next phase starts. Prompts in
one phase run at the same time.

Prompts do not run tests. The operator runs the cumulative verification after Close.

No prompt stops for a person.

## Models

| Prompt | Model | Reasoning | Why |
| --- | --- | --- | --- |
| 10 | Cursor Grok 4.7 | extra high | Shared catalog parser later prompts read |
| 12 | Cursor Grok 4.7 | extra high | API and workers startup validation of those settings |
| 45 | Cursor Grok 4.7 | medium | Skip two embed-demo cards |
| 11 | Cursor Grok 4.7 | high | One restricted Playwright lane and its stored-content spec |
| 13 | Cursor Grok 4.7 | high | One ConfigMap and one local override, mounted on many workloads |
| 23 | Cursor Grok 4.7 | high | Title-search query, route, and request helper |
| 60 | Cursor Grok 4.7 | high | One parser gate before a new feed row |
| 63 | Cursor Grok 4.7 | medium | One condition on the OPML indexed branch |
| 24 | Cursor Grok 4.7 | high | Search page calls the new endpoint while the allowlist is set |
| 40 | Cursor Grok 4.7 | high | Hide music chips on four list pages |
| 41 | Cursor Grok 4.7 | medium | Remove the Search Music facet |
| 43 | Cursor Grok 4.7 | high | Queue, history, and playlist medium controls |
| 50 | Cursor Grok 4.7 | high | Add by RSS not-found, hidden entry points, plain player title |
| 51 | Cursor Grok 4.7 | extra high | API refuses parses and new follows |
| 61 | Cursor Grok 4.7 | high | Command and CronJob that enqueue the allowlist |
| 52 | Cursor Grok 4.7 | high | OPML import saves no Add by RSS feed when that switch is off |
| 62 | Cursor Grok 4.7 | high | Refuse on-demand add and hide the button |
| Close | Cursor Grok 4.7 | low | Append release entries, write the reply, archive |

## Phase 1

- [x] **10 — Catalog settings and policy helpers**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/395-catalog-config/10-catalog-settings-and-policy-helpers.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone. Append your plan's release-notes entry to release-notes/scratchpad.md.
Do not run tests.
```

## Phase 2

Prompts 12 and 45 run at once. 12 owns API and workers config, startup validation, and
`packages/helpers-config/src/podverseTestEnv.ts`. 45 owns the three embed-demo files in its plan.

- [x] **12 — API and workers catalog settings**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/395-catalog-config/12-catalog-settings-api-and-workers.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 2 with 45. Edit only the files your plan lists. Do not edit
apps/web/src/lib/embed/. Do not edit release-notes/scratchpad.md. Put your release-notes entry
in your final message under "## Release notes entry".
Do not run tests.
```

- [x] **45 — Embed demo music links**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/395-catalog-config/45-music-off-embed-demo-links.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 2 with 12. Edit only the three embed files your plan lists. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
Do not run tests.
```

## Phase 3

Prompts 11, 13, 23, 60, and 63 run at once. 23 is the only one that edits `apps/api/openapi.yml`.
63 is the only one that edits the OPML import files. 60 owns `apps/workers/src/index.ts` and the
parser admission files. 13 owns the k8s mounts, `scripts/local-env/setup.sh`, and
`k8sEnvContract.test.ts`. 11 owns the restricted Playwright lane.

- [x] **11 — Restricted E2E lane**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/11-catalog-restricted-e2e-lane.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 13, 23, 60, and 63. Edit only the files your plan lists. Later prompts
add their own catalog-restricted specs; do not create those specs here. Your release-notes
entry is none.
Do not run tests.
```

- [x] **13 — Catalog settings env delivery**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/13-catalog-settings-env-delivery.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 11, 23, 60, and 63. Edit only the files your plan lists. The contract
test discovers workloads; do not hard-code the later allowlist CronJob. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
Do not run tests.
```

- [x] **23 — Channel title search**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/23-api-channel-title-search.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 11, 13, 60, and 63. Edit only the files your plan lists. You are the
only prompt in this phase that edits apps/api/openapi.yml; add your path and do not rewrite
the file. Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final
message under "## Release notes entry".
Do not run tests.
```

- [x] **60 — Parser catalog admission**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/60-parser-catalog-admission-gate.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 11, 13, 23, and 63. Edit only the files your plan lists. Do not edit
processOpmlImport.ts or apps/api/openapi.yml. Do not edit release-notes/scratchpad.md. Put
your release-notes entry in your final message under "## Release notes entry".
Do not run tests.
```

- [x] **63 — OPML import allowlist**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/395-catalog-config/63-opml-import-catalog-allowlist.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 11, 13, 23, and 60. Edit only the files your plan lists. Leave the Add
by RSS branch unchanged; prompt 52 adds that refusal later. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
Do not run tests.
```

## Phase 4

Prompts 24, 40, 41, 43, 50, 51, and 61 run at once. 51 is the only one that edits
`apps/api/openapi.yml`. 61 is the only one that edits `apps/workers/ENV.md` and
`categoriesForCommand.ts`. 24 and 41 split the Search files as in
`00-EXECUTION-ORDER.md` § Settled while assembling. 40 owns `add-by-rss/page.tsx`; 50 owns
`add-by-rss/layout.tsx`.

- [x] **24 — Web search stored titles**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/24-web-search-stored-titles.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 40, 41, 43, 50, 51, and 61. Edit only the files your plan lists. Do not
edit search/page.tsx, SearchPageListHeader.tsx, searchPageMedium.ts, or
catalog-restricted-music-search.spec.ts. Do not edit release-notes/scratchpad.md. Put your
release-notes entry in your final message under "## Release notes entry".
Do not run tests.
```

- [x] **40 — Music off media list chips**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/40-music-off-media-list-chips.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 24, 41, 43, 50, 51, and 61. Edit only the files your plan lists. Do not
edit add-by-rss/layout.tsx. Do not change the Livestreams list request. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
Do not run tests.
```

- [x] **41 — Music off search facet**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/395-catalog-config/41-music-off-search-facet.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 24, 40, 43, 50, 51, and 61. Edit only the files your plan lists. Do not
edit SearchPageContext.tsx or SearchPageList.tsx. Keep `all` as the podcast search. Do not edit
release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
Do not run tests.
```

- [x] **43 — Music off library chips**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/43-music-off-library-medium-chips.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 24, 40, 41, 50, 51, and 61. Edit only the files your plan lists. Do not
edit release-notes/scratchpad.md. Put your release-notes entry in your final message under
"## Release notes entry".
Do not run tests.
```

- [x] **50 — Add by RSS off on web**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/50-add-by-rss-off.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 24, 40, 41, 43, 51, and 61. Edit only the files your plan lists. Do not
edit add-by-rss/page.tsx. Do not change getMediaPlayerInfoResolution or
resolveRemotePlayerInfo. Do not edit release-notes/scratchpad.md. Put your release-notes entry
in your final message under "## Release notes entry".
Do not run tests.
```

- [x] **51 — Add by RSS API refusals**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/395-catalog-config/51-add-by-rss-off-api-refusals.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 24, 40, 41, 43, 50, and 61. Edit only the files your plan lists. You are
the only prompt in this phase that edits apps/api/openapi.yml; add your responses and do not
rewrite the file. Do not edit release-notes/scratchpad.md. Put your release-notes entry in
your final message under "## Release notes entry".
Do not run tests.
```

- [x] **61 — Allowlist add command**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/61-catalog-allowlist-add-command.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 24, 40, 41, 43, 50, and 51. Edit only the files your plan lists. Do not
edit k8sEnvContract.test.ts. Mount podverse-catalog-config on the new CronJob so that test
passes. In apps/workers/ENV.md, append to the Catalog section; do not rewrite the Add by RSS
bullet. Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final
message under "## Release notes entry".
Do not run tests.
```

## Phase 5

Prompts 52 and 62 run at once. 52 owns the OPML import files and the workers Add by RSS env
wording. 62 owns `apps/api/openapi.yml`, the on-demand add controller, the Podcast Index button,
and the consumer i18n originals.

- [x] **52 — OPML import when Add by RSS is off**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/52-add-by-rss-off-opml-import.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 5 with 62. Edit only the files your plan lists. Prompt 63 already added
catalogPodcastIndexIdAllowlist on ProcessOpmlImportJobParams and on both
processOpmlImportJob calls, and it treats an off-list id as unindexed. Add addByRSSEnabled
beside that parameter. Do not remove the allowlist check. In apps/workers/ENV.md, replace only
the CATALOG_ADD_BY_RSS_DISABLED bullet and leave the allowlist-command sentence from prompt 61.
Do not edit apps/api/openapi.yml or release-notes/scratchpad.md. Put your release-notes entry
in your final message under "## Release notes entry".
Do not run tests.
```

- [x] **62 — On-demand add refusal and button**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/395-catalog-config/62-on-demand-add-refusal-and-button.md

Follow .llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 5 with 52. Edit only the files your plan lists. You are the only prompt in
this phase that edits apps/api/openapi.yml; add your response and do not rewrite the file.
After the consumer originals change, run npm run i18n:compile. Do not hand-edit compiled/.
Do not edit processOpmlImport.ts or release-notes/scratchpad.md. Put your release-notes entry
in your final message under "## Release notes entry".
Do not run tests.
```

## Phase 6

- [x] **Close — Archive, reply, and verify**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** low

```
You are the last prompt of .llm/plans/active/395-catalog-config/. Follow
.llm/plans/active/395-catalog-config/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone. Do not change product code.

1. Append to release-notes/scratchpad.md, in this order, the "## Release notes entry" from
   each of these final messages in .artifacts/plan-runner/395-catalog-config/: 12.md, 13.md,
   23.md, 24.md, 40.md, 41.md, 43.md, 45.md, 50.md, 51.md, 52.md, 60.md, 61.md, 62.md, 63.md.
   Skip an entry that says none. Prompt 10 already appended its own entry; do not copy it again.
   Do not edit entries already in the file.
2. Write .llm/plans/active/395-catalog-config/proposed-reply.md. A few sentences for the people
   on issue 395, with no file names or plan names. Cover: three optional settings, and unset
   keeps today's site; mobile app code is unchanged; the allowlist is comma-separated Podcast
   Index ids and workers add only those feeds, including a show a listed id was merged into,
   while shows already stored stay; Music off stops new music from being added and hides
   artists, albums, tracks, and music livestreams from navigation, chips, and search, while
   stored music stays; Add by RSS off hides that feature, those pages are not found, the API
   refuses parses and new follows, and saved rows stay and can be removed; while the allowlist
   is set, Podcast Index Add Feed is hidden and refused, and search matches titles of stored
   shows; with the allowlist unset, search stays the Podcast Index search. Repeat that reply
   in your final message inside a fenced text block. Do not post it.
3. Move the whole set, .llm/plans/active/395-catalog-config/ (numbered plans, 00-* files,
   COPY-PASTA.md, and proposed-reply.md), to .llm/plans/completed/395-catalog-config/, and
   remove the empty active directory. Do not tick your own checkbox.
4. End with the cumulative verification in 00-EXECUTION-ORDER.md § Cumulative verification,
   per response-ending-make-verify § Copy-pasta final prompt. Assume nothing was tested. Add
   any spec or test file the set created that the list misses (check git status). Keep the
   Root tab label. The catalog-restricted specs stay in their own make command, separate from
   e2e/search-page.spec.ts.
```
