# Execution Guide

## How to use these plans

1. **Order**: Implement subplans in the order given in [00-overview.md](00-overview.md).
2. **Audit after each**: Before starting the next subplan, review the code and
   behavior for the one just completed. Use the “Deliverables checklist” and
   “Audit” bullets in each plan.
3. **One at a time**: Each file (01–06) is a standalone, detailed plan. Do not
   skip steps; they are sized for careful implementation and review.

## Plan index

| File | Focus |
| ---- | ----- |
| [00-overview.md](00-overview.md) | Overview and execution order |
| [01-queue-playlist.md](01-queue-playlist.md) | Overview; implement [01a](01a-queue-playlist-backend.md) → [01b](01b-queue-playlist-web-builders.md) → [01c](01c-queue-playlist-web-ui.md) |
| [02-data-isolation-privacy.md](02-data-isolation-privacy.md) | Redact add-by-RSS for non-owners |
| [03-media-player-play.md](03-media-player-play.md) | Play add-by-RSS; player state and UI |
| [04-autoplay-next.md](04-autoplay-next.md) | Autoplay next from add-by-RSS list |
| [05-chapters-transcripts.md](05-chapters-transcripts.md) | Chapters/Transcript tabs from bundle |
| **(Completed)** [06-basic-auth.md](06-basic-auth.md) | Overview; 06a → 06a1 → 06b → 06c → 06d (Basic Auth for add-by-RSS) |

## Dependencies

- **01** and **02** first; **02** required before add-by-RSS appears in
  playlists for other users.
- **03** after **01**. **04** after **03**. **05** can run in parallel with
  **01–04**. **06** is independent.
