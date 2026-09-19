# Execution order — P2.1.6 Playlists

Strictly sequential. Each step depends on the one before it.

Prompts to paste: [COPY-PASTA.md](COPY-PASTA.md) · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

| Step                                                                  | What lands                                                         | Model     | Reasoning |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ | --------- | --------- |
| [01](01-playlist-data-layer.md) Data layer                            | Migration 17, playlistRepository, row mapper, native-cache hooks   | Codex 5.3 | high      |
| [02](02-library-playlists-list.md) Library list                       | My / Followed chips, sort/range, FlatList, pagination              | Codex 5.3 | high      |
| [03](03-playlist-detail-parity.md) Detail parity                      | Header meta, follow, paginated play, auto-queue seed               | Codex 5.3 | high      |
| [04](04-edit-items-reorder-and-remove.md) Edit items                  | Long-press drag, swipe remove, private-all while editing           | Opus 5    | high      |
| [05](05-form-and-add-to-parity.md) Form + add-to                      | Medium picker, delete, add-first sheet, soundbite / add-by-RSS     | Codex 5.3 | high      |
| [06](06-e2e-and-closeout.md) E2E & closeout                           | Flows, i18n key, master plan status, archive                       | Codex 5.3 | medium    |

## Why this order

- **01 before everything** — screens must not call `req*` once the set starts rewriting them; the
  repository and mapper are the load-bearing floor.
- **02 before 03** — detail is reached from the list; chip / sort prefs and empty states should be
  stable before follow and playback land on detail.
- **03 before 04** — edit-items mode extends the detail screen; view-mode play and pagination must
  exist so the toggle has a real baseline to leave and return to.
- **04 before 05** — form delete and the add-to sheet are independent of gestures, but keeping
  gesture risk isolated in 04 matches the queue set's Opus step.
- **05 before 06** — E2E asserts create / delete / add-to behavior that 05 owns.
- **06 last** — flows assert the finished screens; master-plan status flips and archive happen once.

## Hard dependency — queue set finished first

Step 04 reuses:

- `ReorderableSections` extended behind a prop for long-press whole-row drag
- The pure drop resolver (index → first / last / between on the reordered neighbor positions)

Those land in completed queue details
[759](/docs/proposals/mobile/_master-plan_/phase-2/details/759-queue-reorder-long-press-drag.md).
Do not start this COPY-PASTA set until that work is on the branch you are implementing against.

## The risk in this set

Step 04 puts three gestures on one edit-items row: tap plays, horizontal swipe removes, vertical
long-press drags. Same acceptance bar as queue: "a tap started a drag" and "a swipe started a drag"
are failures; "drag works" alone is not enough.

## Cross-surface note

Mobile-only. Playlist endpoints, DTOs, and web sort UI already exist. The closeout step adds the
missing `instructions.login_for_playlists` catalog key (web already references it). No API, ORM, or
OpenAPI work. Nothing changes a persisted DTO field name, so no device-data migration beyond the new
SQLite tables in 01.

## Not in this set

Liked playlists / row likes ([777](/docs/proposals/mobile/_master-plan_/phase-2/details/777-defer-liked-playlist-and-row-likes.md)),
public sorts beyond top and Library medium filter
([778](/docs/proposals/mobile/_master-plan_/phase-2/details/778-defer-playlist-medium-and-public-sort.md)),
combined endpoint, Home chip, offline write outbox, DnD polish (599).
