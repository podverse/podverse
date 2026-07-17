# 09 — More entry, RSS/add-by-rss tab, OPML entry points

Implement master steps **9.17–9.23**.

## Detail docs

- 276-more-settings-entry, 277-rss-add-by-rss-screen, 278-rss-feed-add-flow, 279-rss-feed-list,
  280-rss-play-add-by-rss (**Opus 4.8**), 281-opml-import-entry-ui, 282-opml-export-entry-ui

## Tasks

1. More tab: settings entry point + navigation (settings internals are Track 16.3).
2. RSS tab: add-by-rss screen, feed URL input + validation + add mutation, added-feeds list
   (persisted; mirror web AddByRSSList context). Follow **add-by-rss-parity-sync** /
   **add-by-rss-components-sync**.
3. **9.21 (Opus):** play add-by-rss resource via `@podverse/playback-core` `PlaybackTarget` add-by-rss
   policy + native bridge `loadAndStart` (no ad-hoc policy in app).
4. OPML import/export **entry points only** (parse/generate deferred to Track 16.4–16.7).
5. Mark **9.17–9.23** / **276–282** `done`.

Follow **mobile-theme-parity** § Screen & visual parity + **mobile-playback**. Do not run tests
during agent work.
