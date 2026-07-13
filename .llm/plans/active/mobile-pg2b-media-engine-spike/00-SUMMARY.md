# PG-2b — Track 2 media-engine audio spike

**Parallel group:** PG-2b (Track 2 spike + cache-hook contract)
**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 2.1–2.13, 2.34, **2.35 (contract/stubs)**
**Detail IDs:** 080–092, 113, **114**

## Goal

Stand up first-party `podverse-media-engine` with a single AVPlayer (iOS) / ExoPlayer (Android),
TypeScript `NativePlaybackBridge`, background + lock-screen controls, JS events, **car-foundation
constraints**, reserved native-cache write hooks, and a documented go/no-go gate before Tracks
10/11/12. **Do not** use `react-native-track-player`.

**Seamless CarPlay / Android Auto is a hard product requirement.** This phase builds the native
media process car will own; it does **not** complete seamless car QA (that is Track 12).

Read first: [00-CAR-FOUNDATION.md](./00-CAR-FOUNDATION.md).

## Outputs

- `apps/mobile/modules/podverse-media-engine/` native module (iOS + Android)
- Bridge interface + method contract + JS adapter
- Android `MediaLibraryService` (stub browse OK) + shared MediaSession
- iOS shared AVPlayer + shared `MPRemoteCommandCenter`
- Reserved cache write APIs (detail 114)
- Spike notes for background and after-kill behavior
- Go/no-go checklist (detail 113) including car-foundation constraints

## Prerequisites

- Track 3 hello-world runnable on iOS + Android (simulators verified)
- Track 1 `@podverse/playback-core` exists (policy reused later; not required for raw bridge spike)

## Out of scope this phase

- Video surface / mini↔full reparenting (2.14–2.24)
- Full player UI, queue orchestration (Tracks 10–11)
- CarPlay scene / Auto browse trees / app-closed DHU proof (Track 12 UI + **12.5–12.6**, **12.17–12.18**)
- Full durable cache storage (12.2–12.3) — **contract stubs only** in 2.35
- Steps 2.28–2.33 (tests, readme polish, e2e screenshots) — follow-up after go

## After this phase

If gate **go**: continue engine remainder / video as needed, then Tracks 10+; Track 12 delivers
seamless car using this engine + cache.
If gate **no-go**: revise Track 2 with operator before player UI or car work.
