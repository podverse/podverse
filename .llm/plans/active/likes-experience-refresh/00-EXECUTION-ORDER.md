# Likes experience refresh — execution order

**Read first:** [00-SUMMARY.md](./00-SUMMARY.md) (gaps, DoD) and [00-master.md](./00-master.md) (product scope).

## Hard rule

Phases run in **order** (01 → 02 → …) unless a step explicitly says you may run **in parallel** with another. **Do not** skip 01 and start 04 if 04 will depend on DTO/API from 01 without confirming those contracts exist.

## Phase map

| Order | File | What it unblocks |
|------:|------|------------------|
| 1 | [01](./01-api-and-helpers-likes-summary.md) | List order, `include_resources` query, `PATCH` contract (check vs code), helpers client |
| 2 | [02](./02-web-more-menus-and-membership.md) | Likes in UI + **logged-out** rules; may assume 01’s API for membership/toggle |
| 3 | [03](./03-web-playlists-my-playlists-pinned.md) | “My Playlists” ordering; assumes 01 server sort |
| 4 | [04](./04-web-full-player-vts-heart.md) | Full + mini metadata precedence + VTS heart (may need **sequential** API/DTO work before or inside this phase) |
| 5 | [05](./05-web-playlist-edit-constraints.md) | Playlist edit; may already be **done** in tree — reconcile with 01/ORM |
| 6 | [06](./06-tests-e2e-and-verification.md) | Baseline tests + verification gates after 01–05 |
| 7 | [07](./07-e2e-media-player-test-foundation.md) | Deterministic player E2E foundations (seed + helpers + reliability) |
| 8 | [08](./08-e2e-likes-and-player-overlay-matrix.md) | Final E2E behavior proof + screenshot reports for likes/auth + overlay hierarchy |

## Parallelization (conservative)

This set is **mostly sequential** (later phases touch the same “likes” product surface). Safe parallel work **only** if branches do not conflict:

- **Option A (sequential):** One agent, one phase at a time — **lowest risk.**
- **Option B (after 01 is merged):** **02 (web UI)** and **04 (player)** *can* be split **only** if: (1) 04’s data needs are either already in `DTOItem` or stubbed, and (2) you use **different** files to avoid merge pain. If unsure, run **02 → 03 → 04** in order.
- **07/08 guidance:** do **not** start 08 until 07 foundation exists (or equivalent helpers are confirmed). 07 and 08 are intentionally sequential for reliability.

**Do not** parallelize 01 and 02 on the same branch if 02 assumes client types from helpers that 01 is changing in the same PR (prefer 01 first).

## When to use [COPY-PASTA.md](./COPY-PASTA.md)

For **one prompt per phase** to paste into an agent. Each prompt references the numbered plan; detailed steps stay in those files (DRY per parallel-plan-execution).

## After all phases

- [Plan completion / archive](../../../../.cursor/skills/plan-completion/SKILL.md): move the whole `likes-experience-refresh/` directory to `.llm/plans/completed/` **only** when [06 minimum](./06-tests-e2e-and-verification.md#minimum-must-have-before-phase-06-done) is complete and any 04 blocker/deferral is explicitly accepted.
