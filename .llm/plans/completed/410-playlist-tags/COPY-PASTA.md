# Playlist tags — copy-pasta prompts

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Phase order, file
ownership, and the cumulative verification: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/410-playlist-tags/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompts below instead when
you want to read each result before the next prompt starts.

**Optional — run the set unattended (Root tab):**
`./scripts/abcplan/run.sh run 410-playlist-tags`. It runs plan-runner with `--parallel`: every
pending prompt under the first pending phase heading runs at once, and every phase with several
prompts edits disjoint files. It stops at the first blocker; resume with
`./scripts/abcplan/run.sh run 410-playlist-tags --resume 'Your answer.'` (`/abcresume` gives the
ready-made commands).

Select **Cursor model** and **Reasoning** in the Cursor UI. Fast stays off.

Phases run in order. Wait for every prompt in a phase before the next phase starts. Prompts in
one phase run at the same time.

Prompts do not run tests. The operator runs the cumulative verification after Close.

No prompt stops for a person.

## Models

| Prompt | Model | Reasoning | Why |
| --- | --- | --- | --- |
| 10 | Cursor Grok 4.7 | extra high | Tag tables and the folded-name rules later prompts store against |
| 20 | Cursor Grok 4.7 | high | Autocomplete dropdown following FormDropdown |
| 30 | Cursor Grok 4.7 | high | Phone tag field with the same behavior |
| 60 | Cursor Grok 4.7 | high | Type and medium opening defaults on the playlists page |
| 11 | Cursor Grok 4.7 | extra high | Create, edit, and read contract, plus the API tag limits |
| 21 | Cursor Grok 4.7 | high | Tag field that uses the dropdown |
| 12 | Cursor Grok 4.7 | extra high | Public tag-name search |
| 90 | Cursor Grok 4.7 | high | Tag chips on the web playlist page |
| 13 | Cursor Grok 4.7 | extra high | Public list filter applied before paging |
| 80 | Cursor Grok 4.7 | high | One tag line on web and phone playlist rows |
| 91 | Cursor Grok 4.7 | high | Tag chips on the phone playlist detail screen |
| 100 | Cursor Grok 4.7 | extra high | Public config route the clients read |
| 70 | Cursor Grok 4.7 | high | Tag filter on mobile Browse playlists |
| 101 | Cursor Grok 4.7 | high | Web reads that config, with env as the fallback |
| 102 | Cursor Grok 4.7 | high | Phone reads that config, with env as the fallback |
| 61 | Cursor Grok 4.7 | high | Tag filter and tag opening default on web public lists |
| 103 | Cursor Grok 4.7 | extra high | Remove public GET /product/membership |
| 40 | Cursor Grok 4.7 | high | Tags on web playlist create and edit |
| 104 | Cursor Grok 4.7 | high | Docs, local env, and GitOps for the config route |
| 50 | Cursor Grok 4.7 | high | Tags on phone playlist create and edit |
| Close | Cursor Grok 4.7 | low | Append release entries, write the reply, archive |

## Phase 1

Prompts 10, 20, 30, and 60 run at once. 10 owns the tag tables and the name helper. 20 owns
AutocompleteDropdown. 30 owns the phone tag field. 60 owns the playlists-page type and medium
defaults.

- [x] **10 — Playlist tag storage**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/410-playlist-tags/10-playlist-tag-storage.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 20, 30, and 60. Edit only the files your plan lists. In
infra/k8s/base/api/source/api.env set API_EXPECTED_MIGRATION_FILENAME to 0023_playlist_tag.sql
and leave the other keys. Prompt 11 adds the tag-limit keys later.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

- [x] **20 — Autocomplete dropdown**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/20-autocomplete-dropdown.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 30, and 60. Edit only the files your plan lists. Insert the
AutocompleteDropdown exports in packages/ui/src/index.ts and the section in
packages/ui/PACKAGES-UI.md. Do not rewrite those files. Prompt 21 adds TagField after you.
Your release scratchpad is none. The "## Release notes entry" section is the word none.
Do not run tests.
```

- [x] **30 — Mobile tag field**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/30-mobile-tag-field.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 20, and 60. Edit only the files your plan lists. Do not edit
PlaylistFormScreen, PlaylistListRow, or BrowseScreen.
Your release scratchpad is none. The "## Release notes entry" section is the word none.
Do not run tests.
```

- [x] **60 — Playlists page type and medium defaults**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/60-playlists-page-type-medium-defaults.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 1 with 10, 20, and 30. Edit only the files your plan lists. Add the type and
medium defaults your plan names. Do not rewrite apps/web/ENV.md or the sidecar env files.
Prompt 61 extends those files later.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

## Phase 2

Prompts 11 and 21 run at once. 11 owns playlist read and write and the API tag limits. 21 owns
TagField.

- [x] **11 — Playlist tags on read and write**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/410-playlist-tags/11-playlist-tag-read-write.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 2 with 21. Edit only the files your plan lists. Prompt 10 already set
API_EXPECTED_MIGRATION_FILENAME to 0023_playlist_tag.sql in
infra/k8s/base/api/source/api.env. Add the two playlist-tag keys and do not change that
filename. You are the first writer of apps/api/openapi.yml, the playlist controller, the
playlist request helper, and playlist.test.ts. Add only what the plan names.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

- [x] **21 — Tag field**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/21-tag-field.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 2 with 11. Edit only the files your plan lists. Insert TagField immediately
after the AutocompleteDropdown export and subsection prompt 20 added. Do not rewrite
packages/ui/src/index.ts or packages/ui/PACKAGES-UI.md.
Your release scratchpad is none. The "## Release notes entry" section is the word none.
Do not run tests.
```

## Phase 3

Prompts 12 and 90 run at once. 12 owns tag-name search. 90 owns the web playlist page chips.

- [x] **12 — Playlist tag autocomplete search**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/410-playlist-tags/12-playlist-tag-search.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 90. Edit only the files your plan lists. Prompt 11 already edited
apps/api/openapi.yml, the playlist controller, the playlist request helper, and
playlist.test.ts. Add the search route only. You are the first writer of
packages/helpers-requests/src/api/_request.ts. Do not rewrite those files.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

- [x] **90 — Tag chips on the web playlist page**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/90-web-playlist-page-tags.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 3 with 12. Edit only the files your plan lists. Insert only
apps/web/e2e/playlist-page-tags.spec.ts in makefiles/local/e2e-spec-order-web.txt, on the line
after playlist-and-edit-route-not-found.spec.ts. Do not rewrite that file. Do not edit the API.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

## Phase 4

Prompts 13, 80, and 91 run at once. 13 owns the public tag query. 80 owns the row tag line.
91 owns the phone playlist detail chips.

- [x] **13 — Public playlist list tag filter**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/410-playlist-tags/13-playlist-public-tag-filter.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 80 and 91. Edit only the files your plan lists. Prompts 11 and 12
already edited apps/api/openapi.yml, the playlist controller, the playlist request helper,
and playlist.test.ts. Prompt 12 already edited querySchemas.ts. Add the public tag query
only. Do not rewrite those files. Do not edit the row components or PlaylistDetailScreen.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

- [x] **80 — Playlist list row tag line**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/80-playlist-row-tag-line.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 13 and 91. Edit only the files your plan lists. Prompt 10 already
added playlistTag in packages/helpers/src/index.ts and packages/helpers/package.json. Add
playlistTagLine beside it. Do not rewrite those files. Prompt 90 already inserted
playlist-page-tags.spec.ts in makefiles/local/e2e-spec-order-web.txt. Insert only
playlist-row-tags.spec.ts after playlists-profiles-chips.spec.ts. Do not edit
PlaylistDetailScreen or the API files prompt 13 owns.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

- [x] **91 — Tag chips on the phone playlist detail screen**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/91-mobile-playlist-detail-tags.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 4 with 13 and 80. Edit only the files your plan lists. Do not edit ListRow,
PlaylistListRow, the helpers package, the web spec-order file, or apps/api/openapi.yml.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

## Phase 5

Prompts 100 and 70 run at once. 100 owns GET /config. 70 owns the Browse playlists tag filter.

- [x] **100 — Public client config route**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/410-playlist-tags/100-public-client-config-route.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 5 with 70. Edit only the files your plan lists. Prompts 10 and 80 already
added playlistTag and playlistTagLine in packages/helpers/src/index.ts and
packages/helpers/package.json. Add the publicClientConfig export and subpath only. In
apps/api/openapi.yml add /config immediately after /meta: and do not rewrite the playlist
paths prompts 11, 12, and 13 added. In packages/helpers-requests/src/api/_request.ts, prompt
12 already added the tag search client. Add only the config client. Do not edit the consumer
catalogs or Browse.
Your release scratchpad is none. The "## Release notes entry" section is the word none.
Do not run tests.
```

- [x] **70 — Mobile Browse playlists tag filter**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/70-browse-playlist-tag-filter.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 5 with 100. Edit only the files your plan lists. You are the first prompt
that edits the consumer originals. Insert only your keys and run npm run i18n:compile. Do
not rewrite those files. Do not edit release-notes/scratchpad.md even though the plan lists
it. Do not edit packages/helpers/src/index.ts, packages/helpers/package.json, or
apps/api/openapi.yml. Put your release-notes entry in your final message under
"## Release notes entry".
Do not run tests.
```

## Phase 6

Prompts 101, 102, and 61 run at once. 101 owns the web config readers. 102 owns the phone
config readers. 61 owns the web public tag filter.

- [x] **101 — Web reads public client config**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/101-web-public-client-config.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 6 with 102 and 61. Edit only the files your plan lists. Do not edit the
playlists page, its config, the consumer catalogs, or apps/mobile. Do not edit
PlaylistPageHeaderInfo.tsx (prompt 90).
Your release scratchpad is none. The "## Release notes entry" section is the word none.
Do not run tests.
```

- [x] **102 — Mobile reads public client config**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/102-mobile-public-client-config.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 6 with 101 and 61. Edit only the files your plan lists. Do not edit apps/web
or the consumer catalogs.
Your release scratchpad is none. The "## Release notes entry" section is the word none.
Do not run tests.
```

- [x] **61 — Public playlist tag filter**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/61-public-playlist-tag-filter.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 6 with 101 and 102. Edit only the files your plan lists. Prompt 60 already
edited the playlists opening files, apps/web/ENV.md, the sidecar env example, and
web-sidecar.env. Extend those. Do not remove the type and medium defaults. Prompt 70 already
inserted catalog keys. Insert only filters.playlist_tag and run npm run i18n:compile. Do not
rewrite the originals. Do not edit the public-config callers prompts 101 and 102 own.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

## Phase 7

Prompts 103 and 40 run at once. 103 owns removal of public GET /product/membership. 40 owns
web playlist create and edit.

- [x] **103 — Remove public membership GET**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/410-playlist-tags/103-remove-public-membership-get.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 7 with 40. Edit only the files your plan lists. In apps/api/openapi.yml
remove public GET /product/membership only. Leave /config and the playlist paths. In the
membership controller, packages/helpers-requests/src/api/_request.ts, and
public-client-config.integration.test.ts, change only what this plan names. Prompt 100 added
those. Do not edit the web playlist form or the consumer catalogs.
Your release scratchpad is none. The "## Release notes entry" section is the word none.
Do not run tests.
```

- [x] **40 — Web playlist create and edit tags**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/40-web-playlist-form-tags.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 7 with 103. Edit only the files your plan lists. Prompts 70 and 61 already
inserted catalog keys. Insert only this plan's keys and run npm run i18n:compile. Do not
rewrite the originals. Prompts 90 and 80 already inserted their lines in
makefiles/local/e2e-spec-order-web.txt. Insert only playlist-tags.spec.ts after
playlist-edit-play.spec.ts. Do not edit apps/api/openapi.yml or the membership route.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

## Phase 8

Prompts 104 and 50 run at once. 104 owns docs, local env, and GitOps. 50 owns phone playlist
create and edit.

- [x] **104 — Record public client config in docs, local env, and GitOps**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/104-public-client-config-touchpoints.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 8 with 50. Edit only the files your plan lists. Do not rewrite the Playlists
section of apps/web/ENV.md, apps/web/sidecar/.env.example, or
infra/k8s/base/web/source/web-sidecar.env. Prompts 60 and 61 own that section. In
apps/api/ENV.md, leave the Playlist tags subsection prompt 11 added and add the Public client
config subsection beside it. Do not edit the phone playlist form, the consumer catalogs, or
library-playlists.yaml.
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

- [x] **50 — Mobile playlist form tags**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/410-playlist-tags/50-mobile-playlist-form-tags.md

Follow .llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You share phase 8 with 104. Edit only the files your plan lists. Prompts 70, 61, and 40
already inserted catalog keys. Insert only this plan's keys and run npm run i18n:compile.
Do not rewrite the originals. Do not edit apps/mobile/APPS-MOBILE.md, apps/api/ENV.md, or
the env files prompt 104 owns. Do not edit scripts/mobile/e2e-test.sh or
apps/mobile/e2e/HOW-TO-RUN.md (prompt 91).
Do not edit release-notes/scratchpad.md. Put your release-notes entry in your final message
under "## Release notes entry".
Do not run tests.
```

## Phase 9

- [x] **Close — Archive, reply, and verify**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** low

```
You are the last prompt of .llm/plans/active/410-playlist-tags/. Follow
.llm/plans/active/410-playlist-tags/00-EXECUTION-ORDER.md § Rules for every prompt.
You run alone. Do not change product code.

1. Append to release-notes/scratchpad.md, in this order, the "## Release notes entry" from
   each of these final messages in .artifacts/plan-runner/410-playlist-tags/: 10.md, 20.md,
   30.md, 60.md, 11.md, 21.md, 12.md, 90.md, 13.md, 80.md, 91.md, 100.md, 70.md, 101.md,
   102.md, 61.md, 103.md, 40.md, 104.md, 50.md. Skip an entry that says none or is missing.
   Do not edit entries already in the file.
2. Write .llm/plans/active/410-playlist-tags/proposed-reply.md. A few sentences for the
   people on issue 410, with no file names or plan names. Cover: playlist owners can add,
   change, and remove tags on create and edit, on the web and on the phone, up to a count
   that defaults to 5 and a length that defaults to 50, both set on the API; a new name is
   stored when the playlist is saved; typing searches existing names and Enter or Return
   adds a chip; tags show on playlist rows and on the playlist page, including the phone
   detail screen, and not in the embed player; public lists can filter by one tag (web
   /playlists when Global, web Browse playlists, and phone Browse playlists), and My
   Playlists, Subscribed, and the phone Library list do not; untagged public playlists stay
   in the unfiltered list, and private playlists do not show their tags to other people; the
   web playlists page can open on a tag and on the other filters from env, empty tag is the
   default, and a saved choice and an explicit URL still win; the website and the phone read
   membership, the tag limits, and the shared instance settings from one public config
   response, and the old public membership GET is gone while pricing and comparison stay.
   Repeat that reply in your final message inside a fenced text block. Do not post it. Do
   not recommend posting or closing. That recommendation waits until the change is merged
   into develop.
3. Move the whole set, .llm/plans/active/410-playlist-tags/ (numbered plans, 00-* files,
   COPY-PASTA.md, and proposed-reply.md), to .llm/plans/completed/410-playlist-tags/, and
   remove the empty active directory. Do not tick your own checkbox.
4. End with the cumulative verification in 00-EXECUTION-ORDER.md § Cumulative verification,
   per response-ending-make-verify § Copy-pasta final prompt. Assume nothing was tested. Add
   any spec, Maestro flow, or test file the set created that the list misses (check git
   status). Name the Root tab for the block. In the prose above it, name Mobile E2E Metro,
   Mobile E2E iOS, Mobile E2E Android, and Mobile E2E API as already-running tabs. Do not
   put those start commands in the block.
```
