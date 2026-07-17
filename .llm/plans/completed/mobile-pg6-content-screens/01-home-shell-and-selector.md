# 01 — Home shell + media-type selector + pref

Implement master steps **8.1–8.3**.

## Detail docs

- 240-home-screen-layout, 241-media-type-selector-chips, 242-media-type-pref-sync

## Tasks

1. Build `HomeScreen` shell (header slot → selector row → scrollable feed area) as the Home stack
   root, replacing the placeholder. Mirror web Home IA (`HomePageClient`/`HomePageHeader`/
   `HomePageList`), adapted to RN; tokens only.
2. Build the horizontal `MediaTypeSelector` (Podcasts, Episodes, Clips, Artists, Albums, Tracks) —
   controlled, localized labels, `testID` per chip.
3. Persist selection with `preferred_media_type` semantics via `apps/mobile/src/prefs/`; hydrate the
   default on mount.
4. Mark **8.1–8.3** / **240–242** `done`.

Follow **mobile-theme-parity** § Screen & visual parity. Do not run tests during agent work.
