# mobile-pg8-car-library-follows — finish Track 12 (PG-8) car browse gaps

**Owner surface:** `apps/mobile` (data layer + car native cache projection)
**Master plan tie-in:** Track 12 — final two open steps: **12.22** (401) and **12.21** (400)
**Prereqs (all `done`):** 12.1–12.20 (native cache, Android Auto browse+play, CarPlay
app-closed scene). See `.llm/plans/completed/mobile-pg8-car-*`.
**Hard dependency:** **9b.8 / 600** — the unified subscriptions repository
(`mobile-unified-subscriptions` set). 12.22 **consumes** that repo for the merged
directory + add-by-RSS follows; land 9b.8 first.

## Why this phase

Track 12 is otherwise complete, but two steps remain `_TBD_` and both are unblocked:

- **12.22 (real gap):** the car **Library** browse node is projected from **add-by-RSS follows
  only**. Directory subscriptions (`account_following_channels`, numeric ids) and followed
  playlists (`account_following_playlists`) are **not** projected. A user who only follows
  directory channels sees **no Library node** in Android Auto / CarPlay (empty nodes are
  omitted), so the head unit drops straight into Downloads. This was confirmed during the 12.17
  DHU pass and again flagged by the just-completed CarPlay app-closed set ("empty root rows =
  empty cache"). Detail doc is already written:
  [401-car-library-directory-follows](/docs/proposals/mobile/_master-plan_/details/401-car-library-directory-follows.md).
- **12.21 (operator doc):** parallel-worktree guidance for car native work; detail 400 does not
  exist yet. Small Auto step that flips Track 12 to `(DONE)`.

## Scope

- **12.22:** rebuild `toLibraryBrowseNodes` in
  `apps/mobile/src/data/repositories/accountRepository.ts` to project from the **shared
  `subscriptionsRepository` (9b.8 / 600)** — the merged directory + add-by-RSS follows (already
  deduped/sorted/hydrated/cached) → `library-browse` native-cache nodes. Do **not** re-implement
  the channel merge/hydration here (that now lives in the shared repo). Followed playlists
  (`account_following_playlists`) are still projected separately (hydrate via `reqPlaylistGetMany`),
  since playlists are outside the shared channel list.
- **12.21:** create `docs/proposals/mobile/_master-plan_/details/400-car-parallel-worktree.md`
  and a short operator note referencing the **mobile-worktree-scope** skill for running car
  native work in a sibling git worktree.

## Locked implementation decisions

- **Channels come from the shared repo (9b.8 / 600).** The merged, hydrated, cached directory +
  add-by-RSS channel list is `subscriptionsRepository.list()`. 12.22 maps that to car nodes; it does
  not duplicate channel hydration. Playlists are hydrated here via `reqPlaylistGetMany` (batch,
  soft-fail). No server `/auth/me` payload change.
- **Node kinds:** reuse `NativeCacheBrowseNode` (`kind: 'podcast' | 'playlist' | 'category'` from
  `apps/mobile/src/data/nativeCache/projection.ts`). Directory channels → `podcast`; playlists →
  `playlist`.
- **Stable ids:** add-by-RSS keeps `feed_url`; directory channels use channel `id_text`; playlists
  use playlist `id_text`.
- **No native/IA change here.** This phase only enriches the JS **projection** (write side); the
  native browse tree already reads `library-browse`. The larger 4-section car IA restructure
  (Podcasts | Music | Queue | History) is the **car-ux-parity** follow-on and is **out of scope**
  (it has open operator decisions — see below).

## Non-goals / follow-on (do not do here)

- The full **car-ux-parity** restructure in `docs/proposals/mobile/car-ux-parity/` (root
  Podcasts | Music | Queue | History, episode/track drill-down, Queue/History in car, native
  cache extensions). That set has 5 open operator questions (History split, artists nesting,
  Downloads root, episode window, CarPlay entitlement gating) — detail it in a separate phase
  after the operator decides.
- iOS production CarPlay entitlement provisioning (12.16 operator step already tracked).

## Files

- `00-EXECUTION-ORDER.md` — run order
- `01-project-directory-follows-and-playlists.md` — 12.22 projection + hydration (Opus 4.8)
- `02-car-parallel-worktree-operator-doc.md` — 12.21 operator doc (Auto)
- `COPY-PASTA.md` — prompts (one per step, model-tagged)

## Definition of done

- Following a directory channel (search/subscribe) yields a **Library** node in Android Auto /
  DHU **and** CarPlay simulator with the phone app force-stopped.
- Followed playlists appear under Library.
- Add-by-RSS follows continue to appear; empty cache still omits Library without crashing.
- Repository unit test covers the merged node builder.
- Master plan 12.22 + 12.21 flipped to `done`; Track 12 heading gets `(DONE)`; detail 401/400
  headers set to `done`; this set archived to `completed/`.
