# Authoring: Track 9 — browse/content screens + RSS

**Phase:** B (parallel). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-09.md`

**Detail ID range:** 260–309

## Instructions

RSS tab content lives primarily in Track 9 (Add-by-RSS screen). OPML import/export UI surfaces are
introduced here as browse/library entry points; full OPML implementation steps are in Track 16.

Emit master-plan lines with **Model** on each step (see 01-authoring file).

Reference:
[DOCS-MOBILE-PROCESS-OVERVIEW.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md) §5,
[DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)

## Track 9 — Browse and content screens

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 9.1 | Podcast detail screen: channel header, tabs, item list via `reqChannelGet*` + `reqItemGetManyByChannel`. | Codex 5.3 | 260-podcast-detail-screen |
| 9.2 | Podcast detail: live items section via live item endpoints where applicable. | Codex 5.3 | 261-podcast-live-items |
| 9.3 | Episode detail screen: metadata, enclosure, play/queue actions via `reqItemGet*`. | Codex 5.3 | 262-episode-detail-screen |
| 9.4 | Episode detail tabs: chapters, soundbites, clips, transcript (parity with web tabs). | Codex 5.3 | 263-episode-detail-tabs |
| 9.5 | Album detail screen for music channels (mirror web `/album/[id]`). | Codex 5.3 | 264-album-detail-screen |
| 9.6 | Artist detail screen for music artists (mirror web `/artist/[id]`). | Codex 5.3 | 265-artist-detail-screen |
| 9.7 | Clip detail screen via `reqClipGet*` with play-at-clip-bounds action. | Codex 5.3 | 266-clip-detail-screen |
| 9.8 | Search screen: query UI and `reqPodcastIndexSearchPodcasts` results list. | Codex 5.3 | 267-search-screen |
| 9.9 | Search filters and sort defaults matching web search behavior. | Codex 5.3 | 268-search-filters-sort |
| 9.10 | My Library — playlists list via `reqPlaylistGetMany`. | Codex 5.3 | 269-library-playlists-list |
| 9.11 | Playlist detail screen via playlist resource endpoints. | Codex 5.3 | 270-playlist-detail-screen |
| 9.12 | My Library — manual queue screen via queue resource endpoints. | Codex 5.3 | 271-library-queue-screen |
| 9.13 | My Library — history screen with history-paginated queue resources. | Codex 5.3 | 272-library-history-screen |
| 9.14 | My Library — my clips list via `reqClip*` account endpoints. | Codex 5.3 | 273-library-my-clips |
| 9.15 | Profile screen: public profile via `reqProfile*`. | Codex 5.3 | 274-profile-screen |
| 9.16 | My profile screen via `reqMyProfile*` for authenticated user. | Codex 5.3 | 275-my-profile-screen |
| 9.17 | More — settings screen entry (detailed prefs in Track 16). | Auto | 276-more-settings-entry |
| 9.18 | RSS tab — Add-by-RSS main screen mirroring web `/add-by-rss` UX (native simplified). | Codex 5.3 | 277-rss-add-by-rss-screen |
| 9.19 | RSS tab — feed URL input, validation, and add-by-rss queue resource mutations. | Codex 5.3 | 278-rss-feed-add-flow |
| 9.20 | RSS tab — list of added RSS feeds from local/RN state mirroring web AddByRSSList context. | Codex 5.3 | 279-rss-feed-list |
| 9.21 | RSS tab — play add-by-rss resource using `PlaybackTarget.kind` add-by-rss policy. | Opus 4.8 | 280-rss-play-add-by-rss |
| 9.22 | More/ Library — OPML import entry point button (implementation Track 16). | Auto | 281-opml-import-entry-ui |
| 9.23 | More/ Library — OPML export entry point button (implementation Track 16). | Auto | 282-opml-export-entry-ui |
| 9.24 | Categories browse optional screen via `reqCategory*` if exposed on web home. | Codex 5.3 | 283-categories-browse-optional |
| 9.25 | E2E: podcast → episode navigation with screenshots at each step. | Codex 5.3 | 284-e2e-podcast-episode-flow |
| 9.26 | E2E: search query and result tap screenshot flow. | Auto | 285-e2e-search-flow |
| 9.27 | E2E: add-by-RSS happy path screenshot flow on RSS tab. | Codex 5.3 | 286-e2e-add-by-rss-flow |
| 9.28 | Document web→mobile screen map table in master plan appendix reference. | Auto | 287-screen-map-appendix-ref |

## Verification

- Steps 9.1–9.28 with Detail IDs 260–287 and Model on every step.
- RSS tab and Add-by-RSS called out explicitly.
- OPML entry points linked forward to Track 16.
