# Draft: Track 9 — browse/content screens + RSS

RSS tab content lives primarily in this track (Add-by-RSS screen). OPML import/export UI entry points
are introduced here; full OPML implementation steps are in Track 16.

Reference:
[DOCS-MOBILE-PROCESS-OVERVIEW.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md) §5,
[DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)

## Track 9 — Browse and content screens

9.1. Podcast detail screen: channel header, tabs, item list via `reqChannelGet*` + `reqItemGetManyByChannel`. Model: Codex 5.3. Detail: [260-podcast-detail-screen](/docs/proposals/mobile/_master-plan_/details/260-podcast-detail-screen.md) — _TBD_
9.2. Podcast detail: live items section via live item endpoints where applicable. Model: Codex 5.3. Detail: [261-podcast-live-items](/docs/proposals/mobile/_master-plan_/details/261-podcast-live-items.md) — _TBD_
9.3. Episode detail screen: metadata, enclosure, play/queue actions via `reqItemGet*`. Model: Codex 5.3. Detail: [262-episode-detail-screen](/docs/proposals/mobile/_master-plan_/details/262-episode-detail-screen.md) — _TBD_
9.4. Episode detail tabs: chapters, soundbites, clips, transcript (parity with web tabs). Model: Codex 5.3. Detail: [263-episode-detail-tabs](/docs/proposals/mobile/_master-plan_/details/263-episode-detail-tabs.md) — _TBD_
9.5. Album detail screen for music channels (mirror web `/album/[id]`). Model: Codex 5.3. Detail: [264-album-detail-screen](/docs/proposals/mobile/_master-plan_/details/264-album-detail-screen.md) — _TBD_
9.6. Artist detail screen for music artists (mirror web `/artist/[id]`). Model: Codex 5.3. Detail: [265-artist-detail-screen](/docs/proposals/mobile/_master-plan_/details/265-artist-detail-screen.md) — _TBD_
9.7. Clip detail screen via `reqClipGet*` with play-at-clip-bounds action. Model: Codex 5.3. Detail: [266-clip-detail-screen](/docs/proposals/mobile/_master-plan_/details/266-clip-detail-screen.md) — _TBD_
9.8. Search screen: query UI and `reqPodcastIndexSearchPodcasts` results list. Model: Codex 5.3. Detail: [267-search-screen](/docs/proposals/mobile/_master-plan_/details/267-search-screen.md) — _TBD_
9.9. Search filters and sort defaults matching web search behavior. Model: Codex 5.3. Detail: [268-search-filters-sort](/docs/proposals/mobile/_master-plan_/details/268-search-filters-sort.md) — _TBD_
9.10. My Library — playlists list via `reqPlaylistGetMany`. Model: Codex 5.3. Detail: [269-library-playlists-list](/docs/proposals/mobile/_master-plan_/details/269-library-playlists-list.md) — _TBD_
9.11. Playlist detail screen via playlist resource endpoints. Model: Codex 5.3. Detail: [270-playlist-detail-screen](/docs/proposals/mobile/_master-plan_/details/270-playlist-detail-screen.md) — _TBD_
9.12. My Library — manual queue screen via queue resource endpoints. Model: Codex 5.3. Detail: [271-library-queue-screen](/docs/proposals/mobile/_master-plan_/details/271-library-queue-screen.md) — _TBD_
9.13. My Library — history screen with history-paginated queue resources. Model: Codex 5.3. Detail: [272-library-history-screen](/docs/proposals/mobile/_master-plan_/details/272-library-history-screen.md) — _TBD_
9.14. My Library — my clips list via `reqClip*` account endpoints. Model: Codex 5.3. Detail: [273-library-my-clips](/docs/proposals/mobile/_master-plan_/details/273-library-my-clips.md) — _TBD_
9.15. Profile screen: public profile via `reqProfile*`. Model: Codex 5.3. Detail: [274-profile-screen](/docs/proposals/mobile/_master-plan_/details/274-profile-screen.md) — _TBD_
9.16. My profile screen via `reqMyProfile*` for authenticated user. Model: Codex 5.3. Detail: [275-my-profile-screen](/docs/proposals/mobile/_master-plan_/details/275-my-profile-screen.md) — _TBD_
9.17. More — settings screen entry (detailed prefs in Track 16). Model: Auto. Detail: [276-more-settings-entry](/docs/proposals/mobile/_master-plan_/details/276-more-settings-entry.md) — _TBD_
9.18. RSS tab — Add-by-RSS main screen mirroring web `/add-by-rss` UX (native simplified). Model: Codex 5.3. Detail: [277-rss-add-by-rss-screen](/docs/proposals/mobile/_master-plan_/details/277-rss-add-by-rss-screen.md) — _TBD_
9.19. RSS tab — feed URL input, validation, and add-by-rss queue resource mutations. Model: Codex 5.3. Detail: [278-rss-feed-add-flow](/docs/proposals/mobile/_master-plan_/details/278-rss-feed-add-flow.md) — _TBD_
9.20. RSS tab — list of added RSS feeds from local/RN state mirroring web AddByRSSList context. Model: Codex 5.3. Detail: [279-rss-feed-list](/docs/proposals/mobile/_master-plan_/details/279-rss-feed-list.md) — _TBD_
9.21. RSS tab — play add-by-rss resource using `PlaybackTarget.kind` add-by-rss policy. Model: Opus 4.8. Detail: [280-rss-play-add-by-rss](/docs/proposals/mobile/_master-plan_/details/280-rss-play-add-by-rss.md) — _TBD_
9.22. More/ Library — OPML import entry point button (implementation Track 16). Model: Auto. Detail: [281-opml-import-entry-ui](/docs/proposals/mobile/_master-plan_/details/281-opml-import-entry-ui.md) — _TBD_
9.23. More/ Library — OPML export entry point button (implementation Track 16). Model: Auto. Detail: [282-opml-export-entry-ui](/docs/proposals/mobile/_master-plan_/details/282-opml-export-entry-ui.md) — _TBD_
9.24. Categories browse optional screen via `reqCategory*` if exposed on web home. Model: Codex 5.3. Detail: [283-categories-browse-optional](/docs/proposals/mobile/_master-plan_/details/283-categories-browse-optional.md) — _TBD_
9.25. E2E: podcast → episode navigation with screenshots at each step. Model: Codex 5.3. Detail: [284-e2e-podcast-episode-flow](/docs/proposals/mobile/_master-plan_/details/284-e2e-podcast-episode-flow.md) — _TBD_
9.26. E2E: search query and result tap screenshot flow. Model: Auto. Detail: [285-e2e-search-flow](/docs/proposals/mobile/_master-plan_/details/285-e2e-search-flow.md) — _TBD_
9.27. E2E: add-by-RSS happy path screenshot flow on RSS tab. Model: Codex 5.3. Detail: [286-e2e-add-by-rss-flow](/docs/proposals/mobile/_master-plan_/details/286-e2e-add-by-rss-flow.md) — _TBD_
9.28. Document web→mobile screen map table in master plan appendix reference. Model: Auto. Detail: [287-screen-map-appendix-ref](/docs/proposals/mobile/_master-plan_/details/287-screen-map-appendix-ref.md) — _TBD_
