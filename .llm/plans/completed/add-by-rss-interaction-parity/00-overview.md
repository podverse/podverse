# Add-by-RSS Interaction Parity – Plan Overview

## Purpose

Make Add-by-RSS UI behaviors mirror core components: queue/playlist add and remove,
media player play and autoplay-next, chapters/transcripts from parsed feed data,
privacy isolation of add-by-RSS data, and optional Basic Auth for private feeds.

## Execution order

Implement and **audit after each** subplan. Review before starting the next.

| Order | Plan file(s) | Summary |
| ----- | ------------- | ------- |
| 1     | [01-queue-playlist.md](01-queue-playlist.md) → [01a](01a-queue-playlist-backend.md) → [01b](01b-queue-playlist-web-builders.md) → [01c](01c-queue-playlist-web-ui.md) | Canonical payload, minimal hash, wire queue/playlist UI |
| 2     | [02-data-isolation-privacy.md](02-data-isolation-privacy.md) | Redact add-by-RSS data for non-owners (playlists, API) |
| 3     | [03-media-player-play.md](03-media-player-play.md) | Play add-by-RSS; player context and UI |
| 4     | [04-autoplay-next.md](04-autoplay-next.md) | Autoplay next from local add-by-RSS list |
| 5     | **(Completed)** [05-chapters-transcripts.md](05-chapters-transcripts.md) | Chapters/Transcript tabs from bundle |
| 6     | **(Completed)** [06-basic-auth.md](06-basic-auth.md) → 06a → 06a1 → 06b → 06c → 06d | Optional Basic Auth (schema, ORM, encryption, API, web, request-path checklist) |

**Dependencies**

- (1) and (2) first; (2) required before exposing add-by-RSS in playlists to others.
- (3) depends on (1). (4) depends on (3). (5) can run in parallel with (1)–(4).
- (6) is independent; can be scheduled separately.

## Constraints and scope

- **Clips**: Add-by-RSS pages do **not** support clips. The Clip feature is not
  possible with Add-by-RSS feeds (no DB
  clip entity). The clip button must not be available when an add-by-RSS item
  is loaded (e.g. when it is “now playing”). See Subplan 3 (media player).
- **Notifications**: Add-by-RSS pages do **not** support notifications.
- **Chapters / transcripts**: Parsing chapters and transcripts (fetching
  chapters feed URL, transcript URL) must happen via a **backend process** to
  avoid CORS; the client receives parsed data from the API or from a
  server-populated bundle. See Subplan 5.

## Reference

- High-level plan: Cursor plan `add-by-rss_interaction_parity` (if still in use).
- Add-by-RSS parity skill: `.cursor/skills/add-by-rss-parity-sync/SKILL.md`.
- Add-by-RSS index/storage: `apps/web/src/utils/addByRSS/` (itemIndex, storage, types).
