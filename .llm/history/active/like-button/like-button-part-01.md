# Feature: like-button (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `like-button-part-02.md`.

## Metadata

- Started: 2026-04-23
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: None
- Branch: feature/like-button
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 1 - 2026-04-23

#### Prompt (Developer)

[First prompt will go here]

#### Key Decisions

- [Decision and rationale]

#### Files Changed

- [List of files]

---

### Session 2 - 2026-04-23

#### Prompt (Developer)

update the plans then implement them

#### Key Decisions

- Update like-button plan docs first (completion semantics and scoped verification guidance), then execute implementation phases.
- Execute Phase 01 fully (favorites-to-likes contract rename) and archive the phase file to completed.
- Implement core Phase 02 backend/API scaffolding now: likes membership + toggle endpoints, default likes playlist resolve/create, and request-helper wiring.
- Keep web rollout incremental by renaming provider/context semantics to likes without broad UI placement changes in this pass.

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md
- apps/workers/src/commands/parser/rss/parsePodcasting20Feeds.ts
- apps/workers/src/commands/index.ts
- apps/workers/src/lib/startup/categoriesForCommand.ts
- apps/workers/src/lib/startup/categoriesForCommand.test.ts
- packages/worker-commands/src/registry.ts
- .llm/plans/active/web-like-button-clean-break/COPY-PASTA.md (removed)
- .llm/plans/active/web-like-button-clean-break/COPY-PASTA.md
- .llm/plans/completed/web-like-button-clean-break/01-schema-and-contract-rename.md
- infra/database/migrations/0004_playlist.sql
- infra/k8s/base/db/source/0001_init_database.sql
- packages/orm/src/entities/playlist/playlist.ts
- packages/orm/src/services/playlist/playlist.ts
- packages/helpers/src/dtos/playlist/playlist.ts
- apps/api/src/routes/playlist.ts
- apps/api/src/controllers/playlist/playlist.ts
- packages/helpers-requests/src/api/playlist/playlist.ts
- packages/helpers-requests/src/api/\_request.ts
- packages/helpers/src/dtos/account/accountDataExport.ts
- packages/orm/src/services/account/accountDataExport.ts
- packages/orm/src/services/stats/statsAggregatedPlaylist.ts
- apps/api/src/test/playlist.test.ts
- apps/web/src/contexts/PlaylistsFavorites.tsx
- apps/web/src/providers/Providers.tsx

---

### Session 3 - 2026-04-23

#### Prompt (Developer)

are all the steps completed in this file? if they are not, complete them. when they are completed, move the plan files to completed and make the steps as completed in copy pasta

#### Key Decisions

- Finalize plan-set bookkeeping by marking COPY-PASTA phase statuses as completed.
- Move remaining like-button plan files from active to completed to close the plan set.

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md
- apps/workers/src/commands/parser/rss/parsePodcasting20Feeds.ts
- apps/workers/package.json
- package.json
- apps/workers/APPS-WORKERS.md
- apps/workers/ENV.md
- .llm/plans/completed/web-like-button-clean-break/COPY-PASTA.md
- .llm/plans/completed/web-like-button-clean-break/00-master-plan.md
- .llm/plans/completed/web-like-button-clean-break/01-schema-and-contract-rename.md
- .llm/plans/completed/web-like-button-clean-break/02-api-likes-service-and-toggle.md
- .llm/plans/completed/web-like-button-clean-break/03-web-like-button-rollout.md
- .llm/plans/completed/web-like-button-clean-break/04-player-and-value-time-split-likes.md
- .llm/plans/completed/web-like-button-clean-break/05-my-likes-page-and-sidebar.md
- .llm/plans/completed/web-like-button-clean-break/06-tests-and-verification.md
- .llm/plans/completed/web-like-button-clean-break/07-future-vts-boost-and-metadata.md

---

### Session 4 - 2026-04-23

#### Prompt (Developer)

it looks like the copypasta is still in active. move it to completed if it is completed

#### Key Decisions

- Remove duplicate active COPY-PASTA and keep completed COPY-PASTA as the source of truth for the closed plan set.

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md
- packages/helpers/src/lib/playlist.ts
- packages/helpers/src/index.ts
- apps/api/src/controllers/playlist/playlist.ts
- apps/api/src/test/playlist.test.ts

---

### Session 5 - 2026-04-23

#### Prompt (Developer)

the max of 500 for likes query is too small. update it to 1000 and also it should be set as a constant somewhere and imported across wherever it gets used

#### Key Decisions

- Introduce a shared likes membership request cap constant in helpers and use it in API validation and tests.

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md

---

### Session 6 - 2026-04-23

#### Prompt (Developer)

since the getLikesMembership can be a potentially large or slower query, it should never block a page from loading. we can lazily update the ui with filled in likes or not. also, make sure the endpoint returns only the minimal info necessary so the response is not too large.

#### Key Decisions

- Keep likes membership as a separate endpoint intended for async/lazy hydration so page render is not blocked by membership checks.
- Shrink the membership response contract to only liked IDs (arrays) instead of per-id boolean maps to reduce payload size.
- Update API request typing and integration tests to enforce the compact response shape.

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md
- packages/orm/src/services/playlist/playlist.ts
- packages/helpers-requests/src/api/playlist/playlist.ts
- apps/api/src/test/playlist.test.ts

---

### Session 7 - 2026-04-23

#### Prompt (Developer)

Start implementation

#### Key Decisions

- Begin implementation for a new Podverse workers dev job that parses a curated set of 33 Podcasting 2.0-related feeds by Podcast Index ID.
- Use a fixed, repo-committed curated ID list (including No Agenda Show, Podcasting 2.0, and Boostagram Ball), continue on per-feed failures, and summarize at the end.

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md

---

### Session 8 - 2026-04-23

#### Prompt (Developer)

instead of you querying PI for PI IDs, i will just give you them. also, we do not need 33. here is the full list you should use for this helper

41504 No Agenda Show
920666 Podcasting 2.0
6524027 Boostagram Ball
575694 Linux Unplugged
6813728 This Week in Bitcoin

#### Key Decisions

- Scope changed from a 33-feed curated list to a fixed 5-feed helper list provided by the developer.
- The new workers helper will parse these 5 Podcast Index IDs on demand, with continue-on-error behavior and end-of-run summary.

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md

---

### Session 9 - 2026-04-23

#### Prompt (Developer)

remove 41504 from this

#### Key Decisions

- Remove Podcast Index ID 41504 (No Agenda Show) from the fixed helper list.
- Keep the helper as a fixed developer-provided set and preserve continue-on-error parsing behavior.

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md

---

### Session 10 - 2026-04-23

#### Prompt (Developer)

i see what looks like an empty row getting returned in channels endpoints. i don't know if items will have the same problem. i think it is happening because a feed always creates a channel at the same time, but the channel will not have data in it that is useful to us until the first rss parsing run is completed. any channels that do not have useful data in them yet should not be returned by these endpoints. the query should efficiently filter them out. if this requires schema changes to the database to handle efficiently let me know but avoid schema changes if they won't meaningfully help.

Start implementation

#### Key Decisions

- Use a parsed-ready channel gate based on `channel_about` existence (created during successful parse), avoiding schema changes.
- Apply the gate across channel list/stat/followed queries, item list/stat queries, and single-channel/by-channel controller responses.
- Keep performance-friendly query composition by reusing existing relational where paths and indexes (notably `channel_about.channel_id` and `channel_about.last_pub_date`).

#### Files Changed

- .llm/history/active/like-button/like-button-part-01.md
- apps/api/src/controllers/channel.ts
- apps/api/src/controllers/item.ts
- apps/api/src/controllers/liveItem.ts
- apps/api/src/test/category-channel-item-read.test.ts
- packages/orm/src/lib/feedFlagHelpers.ts
- packages/orm/src/lib/feedFlagHelpers.test.ts
- packages/orm/src/services/account/accountFollowingChannel.ts
- packages/orm/src/services/channel/channel.ts
- packages/orm/src/services/item/item.ts

---

## Related Resources

- [Link to PR]
- [Link to related issues]
