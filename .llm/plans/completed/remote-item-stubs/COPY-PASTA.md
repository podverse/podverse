# Remote item stubs — COPY-PASTA

How to use:

1. Select **Cursor model** and **Reasoning** in the Cursor UI (the line above each fence).
1. Copy the fenced block only, paste, and the agent runs it.
1. Tick the box when that prompt is done.

Request and settled review answers: [00-REQUEST.md](./00-REQUEST.md). Ledger and decisions:
[00-SUMMARY.md](./00-SUMMARY.md). Order and file ownership:
[00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

**Optional — run the set unattended (Root tab):**
`./scripts/abcplan/run.sh run remote-item-stubs`. It runs one fresh agent per prompt on that
prompt's model, stops at the first blocker, and resumes with
`./scripts/abcplan/run.sh run remote-item-stubs --resume 'Your answer.'`. The script passes
`--parallel`, so every prompt under one phase heading runs at once. Prompts in one phase share no
file. Only prompts 11 and 46 run alone and write the release scratchpad; every other prompt puts
its entry in its final message, and prompt 46 appends them. Running the prompts one after the
other is also correct.

Start Docker before Phase 2 and keep it running: plan 11 adds the app migration and regenerates
the linear baseline archives.

Phases run in order; prompts inside a phase run at once.

| Phase | Prompts | Model and reasoning |
| --- | --- | --- |
| 1 | 10, 30 | Codex 5.3 high |
| 2 | 11 | Opus 5.5 high |
| 3 | 20, 31 | 20 Opus 5.5 high; 31 Codex 5.3 high |
| 4 | 40, 61, 70 | 40 Codex 5.3 high; 61 Cursor Grok 4.7 high; 70 Opus 5.5 high |
| 5 | 32, 41, 43, 71 | 32, 41, 43 Cursor Grok 4.7 high; 71 Codex 5.3 high |
| 6 | 42, 44, 50, 60, 72 | 42, 44, 50, 72 Cursor Grok 4.7 high; 60 Cursor Grok 4.7 extra high |
| 7 | 51, 52, 73 | Cursor Grok 4.7 high |
| 8 | 45, 62 | 45 Cursor Grok 4.7 high; 62 Cursor Grok 4.7 extra high |
| 9 | 46 | Cursor Grok 4.7 high |

Why the expensive ones: 11 is the storage model, migration, and stub services every other plan
builds on; 20 is the parser's default path, which must never parse or stub a feed the index
provider does not know and runs inside the parser worker; 70 rewrites stub ownership during
Podcast Index merges, a data change in a scheduled worker. Codex 5.3 takes the multi-package
contracts with tricky edge-case tests: the provider interface (10), reference matching (30), the
stub-backed responses (31), the Add by RSS endpoints with credential scope (40), and the admin
job actions (71). Fast stays off.

If a Cursor Grok 4.7 prompt stalls or makes the same mistake twice, rerun it one reasoning level
higher (after extra high, **Codex 5.3 · high**), and record the change on the prompt here.

## Phase 1

- [x] **10 — Index provider abstraction, Podcast Index first**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/10-index-provider.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md § Review of the first
planning pass.
Podcast Index is the first implementation behind the provider interface; callers outside
packages/external-services-podcast-index name the interface, never Podcast Index endpoints. Keep
"not in the index" and "could not check" as separate outcomes; plans 20, 40, 70, and 71 rely on
the difference.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 10-index-provider.md to .llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed (including the exported provider names),
self-check results, any blocker, and anything a later prompt needs.
```

- [x] **30 — Shared matching of remote item references to parsed channels and items**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/30-remote-item-reference-matching.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
No API response shape changes here. Plan 11 edits packages/helpers/src/dtos/remoteItem.ts and
packages/orm/src/index.ts after you; make targeted edits there.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 30-remote-item-reference-matching.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 2

Docker must be running for this phase.

- [x] **11 — Remote stub storage, services, and DTO**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/11-remote-stub-storage.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D1: dedicated stub
tables; episode and track pages stay on item; an item stub always has its channel stub).
List the app migrations directory first and use the next free number; 0002 is free today. Move
the marker in both infra/k8s/base/api/source/api.env and the migration scripts generator in
infra/k8s/base/ops/kustomization.yaml. Run make db_regen_linear_baseline and
make db_verify_linear_baseline yourself. If Docker is not available, finish the rest of the plan,
leave the archives untouched, and report BLOCKED asking the operator to start Docker.
Keep plan 30's edits in packages/helpers/src/dtos/remoteItem.ts and packages/orm/src/index.ts.
Name the services, methods, and DTO exactly as the plan does; plans 20, 31, 40, 70, and 71 call
them by those names.
You run alone in this phase. Do not run tests. Append the plan's release scratchpad entry to
release-notes/scratchpad.md.
When the plan is done, move 11-remote-stub-storage.md to .llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed (including the migration file name and
whether the baseline archives were regenerated), self-check results, any blocker, and anything a
later prompt needs.
```

## Phase 3

- [x] **20 — Parser remote stub path**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/20-parser-remote-stub-path.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D9: a reference with a
feed URL and no feed GUID stays out; D18: no backfill).
Stubs are the default path; config.parser.addRemoteItemsToMQ stays the opt-in full recursive
parse. Never parse or stub a feed the index provider does not know, and never queue imageShrink
for a stub. Export resolveRemoteStubsForRefs from @podverse/parser with the result statuses the
plan names; plans 40 and 71 call it. Plan 70 edits apps/workers/.env.example and
apps/workers/ENV.md after you.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 20-parser-remote-stub-path.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **31 — Podroll and publisher-feed responses read stubs, not Podcast Index**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/31-stub-backed-remote-item-responses.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D18: no read-time provider
lookup; a reference with no stub and no parsed row is not returned).
Keep plans 30 and 11's edits in packages/helpers/src/dtos/remoteItem.ts. The response shape in
the plan's "Response shape" section is the contract plans 32, 45, 46, 50, 51, 52, 60, and 62
render; do not change it. apps/api/openapi.yml is large: Grep the podroll and publisher-feed
paths. Plans 40 and 32 edit openapi.yml after you, and plans 61 and 50 edit
tools/web/seed-e2e.mjs after you; make targeted edits.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 31-stub-backed-remote-item-responses.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 4

- [x] **40 — Add by RSS remote item lookup and resolve endpoints**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/40-add-by-rss-remote-item-api.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D24 and D29 as amended:
podroll and the channel remote item list; a tap still resolves through Podcast Index).
Add by RSS credentials go only to the domain of the feed URL they were saved for. Remote items
never inherit them, and the provider call sends only the remote feed GUID or feed URL (R47; the
add-by-rss-client-held-credentials rule). Reuse plan 20's resolveRemoteStubsForRefs; do not write
a second resolver. Keep plan 11's edits in infra/k8s/base/api/source/api.env and plan 31's in
apps/api/openapi.yml (large: Grep the account add-by-rss paths). The consumer catalogs are
large: Grep the key prefix, write all four locales, no empty strings. Plans 52 and 62 add keys to
the same catalogs after you.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 40-add-by-rss-remote-item-api.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed (including new env keys), self-check
results, any blocker, and anything a later prompt needs.
```

- [x] **61 — E2E fixtures: a podroll and a remote item list with stub references**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/61-e2e-podroll-and-remote-list-stub-fixtures.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Use Podcast Index ids 876543227 and 876543228 as the plan states; plan 73's management seed
writes 876543250–876543252 into the same database. Keep plan 31's edits in
tools/web/seed-e2e.mjs. Plan 50 adds its own fixtures to the same two files later; insert only at
the anchors the plan names.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 61-e2e-podroll-and-remote-list-stub-fixtures.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **70 — Remote stub merge and id-change handling**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/70-remote-stub-merge-handling.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D43: merges and id changes
stay on the server: the next parse, the hourly merge worker, and an admin re-point).
Keep plan 11's code in remoteChannelStub.ts and its test, and plan 20's edits in
apps/workers/.env.example and apps/workers/ENV.md. A failure in the stub merge pass is caught and
logged so the existing merge and retire passes still run. mergedInto.ts and the mobile
mergeRedirect.ts stay unchanged.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 70-remote-stub-merge-handling.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 5

- [x] **32 — GET /remote-item/channel/:idOrIdText for channel remote item lists**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/32-channel-remote-item-list-endpoint.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D1: the whole reference
list in one response).
The response is plan 31's RemoteItemsResponse, built from plan 30's matching and plan 31's stub
lookup as they stand in the tree. Keep plans 31 and 40's edits in apps/api/openapi.yml (large:
Grep the podroll path and add beside it) and plan 40's in
packages/helpers-requests/src/api/_request.ts.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 32-channel-remote-item-list-endpoint.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed (including the request helper's name),
self-check results, any blocker, and anything a later prompt needs.
```

- [x] **41 — Web generic search-detail component, Podcast Index as its first provider**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/41-web-generic-search-detail.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
The Podcast Index feed page looks and behaves exactly as before; this is a refactor onto the
shared SearchDetail component, which plan 42 reuses for Add by RSS.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 41-web-generic-search-detail.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed (including SearchDetail's props),
self-check results, any blocker, and anything a later prompt needs.
```

- [x] **43 — Mobile generic search-detail view, Podcast Index as its first provider**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/43-mobile-generic-search-detail.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Export buildSearchResultDetailParams with the signature the plan names; plans 46 and 60
navigate with it. Plan 44 edits apps/mobile/src/navigation/index.tsx after you; make targeted
edits there.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 46
appends it.
When the plan is done, move 43-mobile-generic-search-detail.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **71 — Scheduled jobs for remote stub re-check, re-point, and promote**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/71-remote-stub-admin-jobs.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D46: admin actions run as
scheduled jobs, so management-api needs no Podcast Index credentials or parser dependency).
Reuse plan 20's resolveRemoteStubsForRefs and plan 70's re-point service as they stand in the
tree. Keep plans 30 and 11's edits in packages/orm/src/index.ts. Plan 72 calls your schedule
functions by the names the plan gives them.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 71-remote-stub-admin-jobs.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 6

- [x] **42 — Web Add by RSS search-detail page**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/42-web-add-by-rss-search-detail.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Build on plan 41's SearchDetail component as it stands in the tree. The page takes the feed URL
as a query parameter. Plan 45 links to it through buildAddByRSSRemoteFeedPath, so keep that name.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 46
appends it.
When the plan is done, move 42-web-add-by-rss-search-detail.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **44 — Mobile Add by RSS remote feed screen**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/44-mobile-add-by-rss-search-detail.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Build on plan 43's SearchDetailView as it stands in the tree, and keep plan 43's edits in
apps/mobile/src/navigation/index.tsx. Plan 46 navigates to your screen with the route name and
params the plan gives it.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 46
appends it.
When the plan is done, move 44-mobile-add-by-rss-search-detail.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **50 — Web podroll rows render remote stubs**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/50-web-podroll-stub-rows.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Render plan 31's response shape. Stub rows link with buildIndexProviderFeedPath (plan 40); an
item stub opens its channel stub's page. Keep plans 31 and 61's edits in tools/web/seed-e2e.mjs,
plan 61's in apps/web/e2e/helpers/seedConstants.ts, and plan 31's in
apps/api/src/lib/e2eArtistAlbumsFixture.ts and its test; add your fixtures at the anchors the
plan names. Do not edit the Add by RSS files; plan 45 owns them. Plans 51 and 52 edit the page
clients and the web spec-order file after you.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 50-web-podroll-stub-rows.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **60 — Mobile podroll and artist album lists render remote stubs**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/remote-item-stubs/60-mobile-stub-rows-podroll-and-artist-albums.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Render plan 31's response shape and navigate stubs with plan 43's
buildSearchResultDetailParams; an item stub opens its channel stub's preview. AlbumDetailScreen
and ArtistDetailScreen are large: Grep the anchors the plan names. Plan 62 edits
PodcastPodrollSection.tsx and AlbumDetailScreen.tsx after you and builds on your
toRemoteItemListEntries, RemoteItemListRow, and useOpenRemoteItemListEntry, so keep those names.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 46
appends it.
When the plan is done, move 60-mobile-stub-rows-podroll-and-artist-albums.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **72 — Management API for remote stubs**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/72-management-remote-stubs-api.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D18: no backfill command).
Use plan 71's schedule functions as they stand in the tree. Management-api gets no Podcast Index
or parser dependency. apps/management-api/openapi.yml is large: Grep the feeds paths.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 72-management-remote-stubs-api.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 7

- [x] **51 — Web artist album rows render remote stubs**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/51-web-artist-album-stub-rows.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Keep plan 50's ssrHasPodroll edit in ArtistPageClient.tsx; change only the ssrChannelsUnadded
type there. Reuse plan 50's remoteItemStubRow helper. The artist page stays on /publisher-feed.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 46
appends it.
When the plan is done, move 51-web-artist-album-stub-rows.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed (including whether
unparsedPodcastIndexFeedTarget still has a web caller), self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **52 — Web channel remote-item list**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/52-web-channel-remote-item-list.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
info.remote_items is "Remote Items" in en-US; plans 45, 46, and 62 reuse it, so add it exactly as
the plan's table says. Keep plan 40's keys in the consumer catalogs (large: Grep "podroll" and
insert beside it). Keep plan 50's edits in the podcast and album page clients and in
makefiles/local/e2e-spec-order-web.txt; edit those with targeted insertions.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 52-web-channel-remote-item-list.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **73 — Management web remote stub pages**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/73-management-web-remote-stubs-pages.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D18: no backfill command).
Use plan 72's request helpers as they stand in the tree. The management catalogs are large: Grep
the key prefix, write all four locales, no empty strings. Seed stubs with Podcast Index ids
876543250–876543252 only.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Prompt 46 appends it.
When the plan is done, move 73-management-web-remote-stubs-pages.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 8

- [x] **45 — Web Add by RSS podroll and remote item lists, and the remote item click flow**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/45-web-add-by-rss-podroll.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D24 and D29 as amended).
A tap resolves through the index provider first and opens the provider page when found;
otherwise it opens plan 42's Add by RSS remote feed page. Remote items never inherit the source
feed's username and password (R47). Reuse info.remote_items from plan 52. Keep plans 50 and 52's
lines in makefiles/local/e2e-spec-order-web.txt.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 46
appends it.
When the plan is done, move 45-web-add-by-rss-podroll.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **62 — Mobile channel remote item list section, with Maestro coverage of stub rows**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/remote-item-stubs/62-mobile-channel-remote-items-section.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
The section is labelled info.remote_items, which plan 52 already added as "Remote Items"; do not
add or change it. Add only info.no_remote_items_found in all four consumer locales, and keep
plans 40 and 52's keys (the catalogs are large: Grep "no_podroll_found"). Keep plan 60's edits in
PodcastPodrollSection.tsx and AlbumDetailScreen.tsx; PodcastDetailScreen and AlbumDetailScreen
are large, so Grep the anchors the plan names. The Maestro flow drives plan 61's fixtures. Plan 46
edits apps/mobile/src/prefs/detailListPrefs.ts after you.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 46
appends it.
When the plan is done, move 62-mobile-channel-remote-items-section.md to
.llm/plans/completed/remote-item-stubs/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 9

- [x] **46 — Mobile Add by RSS podroll and remote item sections; then archive the set**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/remote-item-stubs/46-mobile-add-by-rss-podroll.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D24 and D29 as amended).
A tap resolves through the index provider first and opens the provider preview when found;
otherwise it opens plan 44's Add by RSS remote feed screen. Remote items never inherit the source
feed's username and password (R47). Reuse info.remote_items (plan 52) and the shared rows from
plan 60. Keep plan 62's edits in apps/mobile/src/prefs/detailListPrefs.ts; yours is a separate
constant.
You run alone in this phase. Do not run tests. Append the plan's release scratchpad entry.

Before your own entry, append to release-notes/scratchpad.md every "Release notes entry" from the
final messages of prompts 30, 20, 31, 40, 70, 32, 43, 71, 42, 44, 50, 60, 72, 51, 52, 73, 45, and
62 in .artifacts/plan-runner/remote-item-stubs/ (30.md, 20.md, …), in that order, unchanged. Skip
one that already appears in the scratchpad.

Search the tree for unparsedPodcastIndexFeedTarget and podcastIndexFeedListImageUrl and report
any caller that remains; do not remove them.

Then close the set. Confirm every other numbered plan is in
.llm/plans/completed/remote-item-stubs/. Move 46-mobile-add-by-rss-podroll.md, 00-REQUEST.md,
00-SUMMARY.md, 00-EXECUTION-ORDER.md, and COPY-PASTA.md there, and remove the empty active
directory. If prompt 11 reported the linear baseline archives were not regenerated, put
make db_regen_linear_baseline first in the Root block.

End with the cumulative verification for the whole set, assuming no earlier prompt was tested.
One fenced bash block per tab, fish-safe, labeled with the tab name. Tell the operator that
Docker, Mobile E2E Metro, Mobile E2E API, and Mobile E2E iOS or Mobile E2E Android must be
running, and that Mobile E2E API must be restarted after make local_env_setup and the package
build, because the API serves new remote item routes and reads plan 40's new settings. Check
apps/mobile/e2e/HOW-TO-RUN.md for whether the mobile E2E seed must be re-run after the seed
changes, and say so if it must. Do not put leave-running commands in the blocks. Say that no plan
added a dependency, so no lockfile update is needed. Name the operator steps the release entries
carry, including that references with no stub stay hidden until their source feed is parsed
again and that the alpha database is wiped before this deploy (no backfill command).

Root:
make local_env_setup
npm run i18n:compile
npm run i18n:validate
npm run build:packages
npm run lint
npm run type-check
npm run openapi:lint
npm run test:unit
npm --prefix apps/mobile run test
make db_verify_linear_baseline
make test_deps
npm run test:e2e:api
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/api
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/workers
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/ops
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/db
make e2e_test_report_scoped WEB_SPEC=e2e/podcast-podroll-stubs.spec.ts,e2e/channel-remote-item-list.spec.ts,e2e/artist-page-albums-and-tracks.spec.ts,e2e/add-by-rss-remote-feed.spec.ts,e2e/add-by-rss-remote-items.spec.ts,e2e/add-by-rss-auto-parse.spec.ts,e2e/podcast-index-feed-add-trial-blocked.spec.ts,e2e/header-image-lightbox.spec.ts MGMT_SPEC=e2e/feeds-remote-stubs.spec.ts,e2e/feeds-merge-review.spec.ts
open .artifacts/e2e-reports/latest/index.html

Mobile Maestro:
npm run mobile:e2e:test -- remote-item-stubs,add-by-rss-remote-items,artist,search-unparsed,add-by-rss
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html

Mention that the set changes the shared web E2E seed, so a full make e2e_test_report run is worth
doing before merge, after the scoped run passes.
```

- [ ] **abcaicast** (optional)

After this set, do you want an abcaicast for this work?
