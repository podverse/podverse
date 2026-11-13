# COPY-PASTA — mobile on-device Add by RSS

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Phase order, file
ownership, and the cumulative verification: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run mobile-device-add-by-rss`.
It runs plan-runner with `--parallel`: every pending prompt under the first pending phase heading
runs at once, and every phase with several prompts edits disjoint files. It stops at the first
blocker; resume with `./scripts/abcplan/run.sh run mobile-device-add-by-rss --resume 'Your answer.'`
(`/abcresume` gives the ready-made commands).

No prompt stops for a publish. Prompt 10 builds `../partytime`. Prompt 11 links that build with
`file:../../../partytime` and does not commit or publish it.

Prompts do not run tests. The operator runs the cumulative verification after prompt 51.

## Phase 1

Prompts 10, 30, 40 and 41 run at once. 10 edits only `../partytime`; 30 owns the mobile parse
path, schema, migrations, `addByRssDevicePath.ts` and `addByRssRepository.ts`; 40 owns the API
remote-item routes, rate limiter, API env files and `apps/api/openapi.yml`; 41 owns the
parser-mapping chapter builder and the API chapter callers.

- [x] **10 — podverse-partytime core entry point**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/10-partytime-core-entry.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 30, 40 and 41. Edit only ../partytime, then run npm run build there. Do not
commit or publish. Prompt 11 links that build.
```

- [x] **30 — Parse path decision and device columns**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/30-parse-path-and-device-columns.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 40 and 41. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **40 — Public remote-item lookup and resolve routes**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/40-public-remote-item-routes.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 30 and 41. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **41 — Shared chapter builder**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/41-shared-chapter-builder.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 30 and 40. Edit only the files your plan lists.
```

## Phase 2

Prompts 11 and 60 run at once. 11 owns `packages/parser`, the root `package-lock.json`,
`eslint.config.mjs` and four web Add by RSS tests; 60 owns the shared limit across helpers, ORM,
the linear migration and baselines, k8s env, API and management-api env, the web and mobile
comparison callers, and the consumer catalogs.

- [x] **11 — Server parser adopts podverse-partytime/core**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/11-parser-adopt-partytime-core.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
Link the sibling ../partytime build. Do not commit or publish partytime, and do not stop for a
publish. You share phase 2 with 60. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **60 — One shared Add by RSS limit default**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/60-shared-add-by-rss-limit-default.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 2 with 11. Edit only the files your plan lists, and put your release-notes entry
in your final message under "## Release notes entry".
```

## Phase 3

Prompts 20, 61 and 62 run at once. 20 owns the new `packages/helpers/src/lib/addByRSS/*` rules,
`hash.ts`, `packages/helpers/src/index.ts`, the server parser's fetch files and the workers
failure classifier; 61 owns management-api, management-web and the management catalogs; 62 owns
the API limit routes and tests, `apps/api/openapi.yml`, the helpers-requests readers and
`apps/mobile/src/lib/addByRss/feedLimit.ts`.

- [x] **20 — Shared Add by RSS fetch rules**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/20-shared-add-by-rss-fetch-rules.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 61 and 62. Edit only the files your plan lists.
```

- [x] **61 — Management shared Add by RSS limit**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/61-management-shared-add-by-rss-limit.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 20 and 62. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **62 — Add by RSS limit readers**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/62-add-by-rss-limit-readers.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 20 and 61. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

## Phase 4

- [x] **21 — Device fetch and parse**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/21-device-fetch-and-parse.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
Copy the podverse-partytime file: specifier plan 11 wrote in packages/parser/package.json.
You run alone in this phase; append your release-notes entry to release-notes/scratchpad.md.
```

## Phase 5

- [x] **31 — Device parse in the repository**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/31-device-parse-repository.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone in this phase.
```

## Phase 6

- [x] **32 — Interactive add by parse path**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/32-interactive-add-by-path.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone in this phase; append your release-notes entry to release-notes/scratchpad.md.
```

## Phase 7

Prompts 22, 33, 50, 63 and 64 run at once. 22 owns the mobile credential store, `credentials.ts`,
`AuthProvider.tsx`, `useAddByRssAddFlow.ts`, `useAddByRssCredentialsForm.ts`, its new Maestro flow
and the Maestro registration files (`scripts/mobile/e2e-test.sh`, `apps/mobile/e2e/HOW-TO-RUN.md`,
`docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`); 33 owns `syncJobPlan.ts`, `syncQueue.test.ts`,
`syncJobs.ts` and `addByRssRepository.ts`; 50 owns `membershipFeatureComparison.ts` and its test
and `external-services-and-meta.test.ts`; 63 owns the at-limit refusal on the API, web, and mobile
(`apps/api/openapi.yml`, `MembershipGateProvider.tsx`, `AddByRssHomeDetailScreen.tsx`) and the
consumer catalogs; 64 owns `AddByRssRootScreen.tsx`, `ChipRowWithActions.tsx`, the mobile catalogs,
`add-by-rss.yaml` and `add-by-rss-anonymous.yaml`.

- [x] **22 — Signed-out feed credentials**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/22-signed-out-feed-credentials.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 7 with 33, 50, 63 and 64. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **33 — Refresh by parse path, lapse, and renewal**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/33-refresh-by-path-lapse-and-renewal.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 7 with 22, 50, 63 and 64. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **50 — Membership comparison: Add by RSS on mobile**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/50-membership-comparison-add-by-rss.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 7 with 22, 33, 63 and 64. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **63 — Add by RSS at-limit message**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/63-add-by-rss-at-limit-message.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 7 with 22, 33, 50 and 64. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

- [x] **64 — Add by RSS feed limit help text**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/64-add-by-rss-feed-limit-help.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 7 with 22, 33, 50 and 63. Edit only the files your plan lists, and put your
release-notes entry in your final message under "## Release notes entry".
```

## Phase 8

- [x] **34 — Sign-up and sign-in transitions**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/34-sign-up-and-sign-in-transitions.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone in this phase; append your release-notes entry to release-notes/scratchpad.md.
```

## Phase 9

- [x] **42 — Device artist fan-out**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/42-device-artist-fan-out.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone in this phase; append your release-notes entry to release-notes/scratchpad.md.
```

## Phase 10

- [x] **43 — Device chapters and transcripts**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/43-device-chapters-transcripts.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone in this phase; append your release-notes entry to release-notes/scratchpad.md.
```

## Phase 11

- [x] **44 — Remote items signed out**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/44-remote-items-signed-out.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone in this phase; append your release-notes entry to release-notes/scratchpad.md.
```

## Phase 12

- [x] **70 — Device OPML export**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/70-device-opml-export.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone in this phase; append your release-notes entry to release-notes/scratchpad.md.
```

## Phase 13

Prompts 52 and 71 run at once. 52 owns the Add by RSS guidance in `.cursor/rules/`,
`apps/mobile/AGENTS.md`, `docs/features/ADD-BY-RSS.md` and the three mobile process and master-plan
docs in its list; 71 owns the sign-up warning screen and gate, `App.tsx`, the mobile catalogs, its
Maestro flow, `scripts/mobile/e2e-test.sh` and `.cursor/skills/mobile-test-economics/SKILL.md`.

- [x] **52 — Add by RSS guidance and docs**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/52-add-by-rss-guidance-and-docs.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 13 with 71. Edit only the files your plan lists.
```

- [x] **71 — Sign-up Add by RSS limit warning**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/71-sign-up-add-by-rss-limit-warning.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 13 with 52. Edit only the files your plan lists, and put your release-notes
entry in your final message under "## Release notes entry".
```

## Phase 14

- [x] **51 — Device path credentials note** (last prompt: append the shared-phase release entries, archive the set, give the cumulative verification)

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/mobile-device-add-by-rss/51-device-path-credentials-note.md

Follow .llm/plans/active/mobile-device-add-by-rss/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone and you are the last prompt of the set. After your plan's work:

1. Append to release-notes/scratchpad.md, in plan-number order, the "## Release notes entry" from
   each of these final messages in .artifacts/plan-runner/mobile-device-add-by-rss/: 11.md,
   22.md, 30.md, 33.md, 40.md, 50.md, 60.md, 61.md, 62.md, 63.md, 64.md, 71.md. Skip an entry
   that says none. Then append your own plan's entry. Do not edit entries already in the file.
2. Move the whole set, .llm/plans/active/mobile-device-add-by-rss/ (numbered plans, 00-* files
   and COPY-PASTA.md), to .llm/plans/completed/mobile-device-add-by-rss/, and remove the empty
   active directory. Do not tick your own checkbox.
3. End with the cumulative verification in 00-EXECUTION-ORDER.md § Cumulative verification,
   per response-ending-make-verify § Copy-pasta final prompt: assume nothing was tested, add any
   spec, Maestro flow, or test file the set created that the list misses (check git status), and
   keep the tab labels. Leave-running Metro, simulator, E2E API, and test-assets commands stay
   out of the paste blocks.
```
