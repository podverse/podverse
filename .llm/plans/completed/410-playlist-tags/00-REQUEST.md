# Request — Playlist tags

## Model

Model lock: Cursor Grok 4.7 only.

The operator locked this set to one model. Every planning step and every implementation plan uses **Cursor Grok 4.7** and no other model. Do not write Opus 5.5 or Codex 5.3 on any step or plan. This overrides the model table in **abcplan** § Split and § Area plan, and in **copy-pasta-recommend-model**, for this set.

- Step 01 writes `**Cursor model:** Cursor Grok 4.7` on every area step. Each area step's prompt says the numbered plans it writes open with that same model line.
- Each numbered plan opens with `**Cursor model:** Cursor Grok 4.7`. Reasoning still follows **copy-pasta-recommend-model** § Reasoning, per prompt. Fast stays off.
- Review, any later planning pass, and Assemble keep that model. Assemble copies the plan's model line and does not raise it.

## Request

https://github.com/podverse/podverse/issues/410

Treat this as a new playlist-tag feature.

When someone creates a playlist, they can optionally add up to 5 tags. They can also add, update, and remove tags when editing a playlist. This works on both web and mobile.

While typing a tag, an autocomplete search runs against tag names already in the database. The search is case-insensitive. The person can select a match. Tag names are unique.

There is no existing tag-entry component and no autocomplete dropdown in `@podverse/ui`. Chip is a filter/pill button. FormDropdown is a fixed option list. SearchInput has no suggestion menu. Add a reusable tag control and an autocomplete dropdown, aligned with the look of those existing controls. A tag shows its text, a border or background, and rounded corners. When editing is possible, it has a remove control on the right. Mobile cannot import `@podverse/ui`, so the phone gets its own control with the same behavior and the same design tokens.

An operator can set the playlists screen's tag filter as the default selected value with an env var. That value is empty by default, and the operator can set it to a tag name. They can also set defaults for the other playlists screen filters the same way.

Still open, as asked:

1. If the typed name has no case-insensitive match, can that person create the new tag, or can they only select a tag that already exists?
2. Which lists get the tag filter: the public playlists lists (web `/playlists` when Global, web Browse playlists, and mobile Browse playlists), or also My Playlists, Subscribed, and the mobile Library playlists screen?
3. Is the env tag a starting selection the visitor can change or clear, with a saved choice and an explicit URL still winning, the way `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT` already works? Or does that env lock the list to that tag?

Orientation the operator supplied with that request:

- Issue 410 is open and is the only open issue about playlist tags. No comments. The body proposes owner-set public tags so one catalog can show different public playlists on each branded frontend. Clips are out of scope. The settled decisions above replace that body's display-proxy design.
- `Playlist` (`packages/orm/src/entities/playlist/playlist.ts`) has title, description, medium, and sharable status. No tag.
- `DTOPlaylist` (`packages/helpers/src/dtos/playlist/playlist.ts`) has no tags. Mobile stores that DTO in SQLite `payload_json` (`apps/mobile/src/data/repositories/playlistRepository.ts`). An added optional field is safe for old rows; editing tags on the phone is new UI.
- Public playlist lists are paged in `apps/api/src/controllers/playlist/playlist.ts` (`getManyPublicRecent` and the public top route). A tag filter has to run in that query before paging.
- Web create/edit: `apps/web/src/components/Playlist/PlaylistForm.tsx`, `apps/web/src/app/playlist/create/`, `apps/web/src/app/playlist/edit/`.
- Mobile create/edit: `apps/mobile/src/screens/library/PlaylistFormScreen.tsx`.
- Web `/playlists` filters are type, sort, range, and medium (`apps/web/src/app/playlists/`). Signed-out opening defaults already exist: `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT` (`recent` or `top`) and `NEXT_PUBLIC_PLAYLISTS_DEFAULT_RANGE` (`day`, `week`, `month`, `all-time`), documented in `apps/web/ENV.md` and parsed in `apps/web/src/config/index.ts`. A saved sort still wins. Signed-in My Playlists stays on A-Z. There is no playlist-tag env and no playlist-medium env. Browse playlists is a separate list (`browse-playlists`) and uses remembered filters, not those playlists-page env vars.
- Mobile Library playlists remember type, sort, range, and medium on the device (`apps/mobile/src/prefs/playlistListPrefs.ts`). Mobile Browse playlists are a Browse media type (`apps/mobile/src/screens/browse/`). Mobile list-screen env today covers Browse and Home sort, not a playlist tag.
- Latest app linear migration in this checkout is `infra/k8s/base/ops/source/database/linear-migrations/app/0022_feed_log_response_truncated.sql`.

Issue title: Playlists: support multiple public tags for curation and multi-frontend filtering

Issue body:

## Problem Statement

One self-hosted instance can now serve several branded web frontends from a shared catalog: the 5.6 catalog allowlist curates what workers add, and a display layer in front of the API scopes what each frontend shows (see #395). Public playlists are instance-wide and carry no curation signal, so a playlist created for one frontend appears on every frontend. The `playlist` record has `title`, `description`, `medium`, `sharable_status`, and no tag/category.

Clips do **not** have this problem: a clip is attached to an item → channel, so a frontend can already scope clips by channel. This request is playlists only.

The immediate use case: an operator runs two branded frontends (one per person/topic) and wants each frontend's public playlists page to show only the playlists curated for it, without maintaining a per-frontend ID list.

## Proposed Solution

- **Multiple tags per playlist**, set by the owner.
  - Data: a `playlist_tag` join table (or an array/jsonb column) with normalized tag names.
  - API: `tags: string[]` on playlist list and detail DTOs.
  - Web: tag input on playlist create/edit, tag chips on the playlist page; tags are public with the playlist.
- Tags are optional. Untagged public playlists stay visible everywhere, so nothing changes by default.
- Optional server-side filter (`/playlist/public/recent?tag=…`) for clients that want it; a reverse proxy/display layer can also filter on the DTO field, which is enough for the multi-frontend case.

Suggested semantics:

- Free-text tags, trimmed and case-folded; a sensible max tag length and max tags per playlist.
- Multiple tags allowed (e.g. a playlist tagged both `adam-curry` and `podcasting-2.0`).
- Meaningful for public/unlisted playlists; private playlists keep their tags internal.

## Alternatives Considered

- **Per-frontend playlist ID allowlists.** Works today but requires editing a frontend's config every time a playlist is created, and is easy to drift.
- **Tag in the title/description.** Visible to users and brittle to parse; not a real contract.
- **Medium field.** Only `av`/`music`; cannot express an arbitrary topic.
- **Tags on clips.** Unnecessary: clips inherit the item's channel, which is already a filterable key.

## Additional Context

- The display layer described in #395 is a small reverse proxy in front of the API; it filters stored lists by a curated set (Podcast Index ids for channels) and could filter playlists by tag the same way.
- The catalog-config work in #395 deliberately keeps stored feeds in lists; playlists are a separate, account-curated surface that needs its own signal.
- Open questions for the maintainer: join table vs array, normalization rules, max tags/length, and whether the web needs a tag filter UI or only the DTO field.

Assisted-by: AI (OpenCode, deepseek-v4.1-flash)

Comment from mitchdowney (2026-11-27):

@suorcd I think maybe we should discuss this on a call, as there are a few different ways we could approach this. A tag feature could be nice for playlists in general, for users to set tags on their own playlists, but the branded front-end would overlap with that while also being different. Not sure how to proceed at the moment.

Where the settled paragraphs and the operator answers differ from the issue body, the settled paragraphs and the answers win. The settled decisions replace that body's display-proxy design.

## Operator answers

1. If the typed name has no case-insensitive match, can that person create the new tag, or can they only select a tag that already exists?

create the new tag only when the playlist is saved, value should just sit in the edit playlist form until then

2. Which lists get the tag filter: the public playlists lists (web `/playlists` when Global, web Browse playlists, and mobile Browse playlists), or also My Playlists, Subscribed, and the mobile Library playlists screen?

public lists only, but the tags for playlists when they are present should be listed in a single line (with ellipsis if reach end) at the bottom of the playlist list item row so they can be visible regardless of if the screen has the filter or not

3. Is the env tag a starting selection the visitor can change or clear, with a saved choice and an explicit URL still winning, the way `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT` already works? Or does that env lock the list to that tag?

A starting selection the visitor can change or clear. A saved choice and an explicit URL still win, the same way `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT` works.

## Glossary

- "if reach end": if the tag line reaches the end of the row
- Chip: a filter/pill button

## Orientation

Facts checked in this checkout on 2026-11-27. The request text above says the issue has no comments. It has one, quoted there, from mitchdowney. `gh issue list` for open playlist-tag issues returned only 410.

- `packages/orm/src/entities/playlist/playlist.ts` — `title`, `description`, `medium` / `medium_id`, `sharable_status` / `sharable_status_id`. No tag field.
- `packages/helpers/src/dtos/playlist/playlist.ts` — `DTOPlaylist` has no tags.
- `apps/mobile/src/data/db/schema.ts` — sqlite `playlist.payload_json`. `apps/mobile/src/data/repositories/playlistRepository.ts` reads it as `row.payloadJson` and parses a `DTOPlaylist` in `playlistFromRow`.
- `apps/api/src/routes/playlist.ts` — `GET /public/recent` → `getManyPublicRecent`, `GET /public/top` → `getManyPublicTop`, both in `apps/api/src/controllers/playlist/playlist.ts`.
- Web create/edit: `apps/web/src/components/Playlist/PlaylistForm.tsx`, `apps/web/src/app/playlist/create/page.tsx`, `apps/web/src/app/playlist/edit/[playlist_id]/page.tsx`.
- Mobile create/edit: `apps/mobile/src/screens/library/PlaylistFormScreen.tsx`.
- Playlist list rows: `apps/web/src/components/List/Playlists/ListPlaylistRow.tsx`, `apps/mobile/src/components/content/PlaylistListRow.tsx`.
- `@podverse/ui`: `packages/ui/src/components/navigation/Chip/Chip.tsx`, `packages/ui/src/components/form/FormDropdown/FormDropdown.tsx`, `packages/ui/src/components/form/SearchInput/SearchInput.tsx`.
- `apps/web/ENV.md` Playlists section — signed-out `/playlists` uses `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT` (`recent` or `top`) and `NEXT_PUBLIC_PLAYLISTS_DEFAULT_RANGE` (`day`, `week`, `month`, `all-time`) when no sort is saved and the URL does not name one. A saved sort still wins. Signed-in My Playlists stays on A-Z.
- `packages/helpers/src/lib/playlistsPageDefaults.ts` — `parsePlaylistsPageDefaults` and `playlistsPublicOpening` parse those two env values only. `apps/web/src/config/index.ts` stores the result on `public.playlistsPage`. The same keys are in `apps/web/src/config/runtime-config.ts` and `apps/web/sidecar/src/server.ts`. No playlist-tag env and no playlist-medium env in that parser.
- `apps/web/src/app/playlists/PlaylistsPageContext.tsx` — browse uses the `browse-playlists` filter-defaults key; the other scope uses `playlists`.
- `apps/web/src/config/index.ts` `listScreens` — browse and home chip, sort, and view. No playlist tag.
- `apps/mobile/src/prefs/playlistListPrefs.ts` — Library playlist prefs are `type`, `sort`, `range`, and `medium`. No tag field. `apps/mobile/src/screens/library/LibraryPlaylistsScreen.tsx` reads them.
- Latest app linear migration: `infra/k8s/base/ops/source/database/linear-migrations/app/0022_feed_log_response_truncated.sql`.

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. This is the issue for the work. Do not open a second one. Area steps search again before writing plans.

## Ticket reply

This is an operator deliverable, not a product change. The last implementation step writes `proposed-reply.md` in the set and repeats it in a fenced `text` block. Do not post it. Do not recommend posting or closing until the change is merged into `develop`. Then recommend the comment and the close. A few sentences for the people in the thread, with no file names or plan names.

- **Ticket reply** The last plan covers this row.

### Review of the first planning pass

The operator accepted every item under `## Decisions to review` in `00-SUMMARY.md` except the four mismatches the review named.

> Accept them. Decide only the four mismatches.

**Commit.** Same on web and mobile. A typed name becomes a chip on Enter or Return. Save also commits text still in the box. There is no create row. Blur does not add a chip. The name is stored only when the playlist is saved.

> Same on both: Enter/Return adds the chip, and Save also commits text still in the box. No create row. Blur does not add a chip.

**Caps.** Same on web and mobile. At the tag limit, hide the box and show a sentence that names the configured limit. The default sentence, when the limit is 5, is "A playlist has at most 5 tags." Typing stops at the character cap. There is no extra sentence for that cap. The count defaults to 5. The character cap defaults to 50. Both are API env, and the API rejects a save over either limit.

> same on both, but make sure the 5 is the default limit and it can potnetially be changeable by env var. the limit should be enforced at the api level

> At the tag limit, hide the box and show a sentence that names the limit (default: "A playlist has at most 5 tags."). Typing stops at 50 characters, with no extra sentence.

> on the api, the char limit should also be by api

**Field order.** Tags are the last field before Cancel and Save on each form. On the web that is after Description. On the phone that is after Sharable Status.

> Last field before Cancel / Save on each form. Web stays after Description. The phone stays after Sharable Status.

**Search failure.** Same on web and mobile. The field shows "Something went wrong. Please try again later, or contact support for assistance." Enter, Return, and Save still add the typed name.

> Same on both: show "Something went wrong. Please try again later, or contact support for assistance." on the field, and still let Enter/Return and Save add the typed name.

**Public config.** One public GET returns grouped objects so later settings can be added without a new route: the membership catalog that `GET /product/membership` returns today, the two playlist tag limits, and the seven settings the API already owns and the clients copy. Those seven are brand name, legal name, contact email, signup mode, terms version, taste-profile agreement version, and stats retention days. This route replaces public `GET /product/membership`. Pricing, comparison, and the management editor stay. Web and mobile use the API values, and keep today's env only when the config request fails. The playlist form uses 5 and 50 until the tag limits arrive. API URLs stay on the client. Web-only infrastructure stays on the client. Home, Browse, and playlists opening defaults stay client settings. The name column stays the existing short varchar, so the character env cannot be set above that width. Update every caller, the docs, local-env, and the `k.podcastdj.com` GitOps checkout where these keys are set.

> information like this should be available through the same endpoint, i am thinking this endpoint has a purpose of making sure that clients have the configurable aspects like this in one network call. i am unsure if we even need that membership response endpoint if we consoidate on one endpoint for this configurable type of data. we have never deployed this app to the public so we could potentially remove that membership config endpoint if it is no longer necessary

> do what you recommend and make sure the response schema is setup in a logical way so we can potentially extend it in the future, also look for opportunities where env vars can be consolidated to the backend today through the use of this config endpoint.

> i want you to do what you recommend and make sure all touch points are updated and documentation as necessary and if local-env or k.podcastdj.com etc needs to be updated we want to update it
