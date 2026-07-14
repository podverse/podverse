# PG-2b — Car foundation constraints (mandatory)

Seamless **CarPlay** and **Android Auto** are product requirements, not a later nice-to-have.
PG-2b does **not** implement Track 12 UI, but every engine decision must leave a clean attach point.

## Non-negotiable success (Track 12 — deferred proof)

These are **not** PG-2b go criteria. They define what “seamless” means and must not be designed away:

| Proof | Step | Detail |
| ----- | ---- | ------ |
| Native reads cache with JS not started (CarPlay sim) | 12.5 | 384 |
| Native reads cache with app force-stopped (Android DHU) | 12.6 | 385 |
| DHU browse+play, phone app never opened | 12.17 | 396 |
| CarPlay sim launch from background | 12.18 | 397 |

Authoritative architecture:
[DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
and [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc).

## Hard constraints on this spike

1. **One player process-wide** — same `AVPlayer` / ExoPlayer for phone, lock screen, and future car
   now-playing (12.9 / session binding). No second player for car.
2. **One remote-command / session owner** — `MPRemoteCommandCenter` and Media3 `MediaSession` are
   shared; CarPlay/Auto must not register a competing command center.
3. **Android service shape** — implement **`MediaLibraryService`** (Media3) even if browse children
   are empty/stub. Do not use a throwaway `Service` that cannot become Android Auto browse (12.11–12.13).
4. **iOS singleton access** — expose a documented native accessor for the shared player so a future
   CarPlay scene (12.7–12.10) can bind without starting JS.
5. **Native cache hooks reserved now** — step **2.35** / detail **114** (stubs OK); schema owned by
   **12.1**. Full JS write path is Tracks 10/12.
6. **No `react-native-track-player`.** No JS-owned car browse trees.

## PG-2b gate vs seamless gate

| Gate | When | Proves |
| ---- | ---- | ------ |
| Engine spike go/no-go (**2.34**) | End of PG-2b | Single engine, background audio, lock screen, events, car **constraints** documented |
| Seamless car QA | End of Track 12 | App-closed browse+play on DHU / CarPlay sim |

A **go** on 2.34 means “safe to build player UI on this engine,” **not** “car is done.”

## Implementer checklist (every COPY-PASTA step)

- [ ] Diff does not add a second player or parallel session for “car later”
- [ ] Android path uses / stays compatible with `MediaLibraryService`
- [ ] iOS remotes stay on the shared command center + shared AVPlayer
- [ ] Cache write method names from 114 are reserved or stubbed
- [ ] README notes deferred seamless acceptance (12.5–12.6, 12.17–12.18)
