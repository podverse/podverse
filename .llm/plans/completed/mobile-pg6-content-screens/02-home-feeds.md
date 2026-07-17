# 02 — Home per-media-type feeds

Implement master steps **8.4–8.9**.

## Detail docs

- 243-home-podcasts-feed, 244-home-episodes-feed, 245-home-clips-feed, 246-home-artists-feed,
  247-home-albums-feed, 248-home-tracks-feed

## Tasks

1. Implement each media-type feed swapped by the selector, fetching via
   `createMobileApiRequestService()` `req*` methods (channel/item/clip/music).
2. Build reusable, tokenized list rows (channel row, episode row, clip row, artist/album card,
   track row) mirroring web `components/List/*` and `components/Media`. Reuse across Track 9.
3. Use `@podverse/helpers` subpath time formatter for durations; DTOs via helpers subpaths.
4. Mark **8.4–8.9** / **243–248** `done`.

Follow **mobile-theme-parity** § Screen & visual parity. Do not run tests during agent work.
