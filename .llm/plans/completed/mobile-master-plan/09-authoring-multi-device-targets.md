# Authoring: Track 18 — tablet, watch, TV targets

**Phase:** B (parallel). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-18.md`

**Detail ID range:** 510–559

Reference:
[DOCS-MOBILE-PROCESS-MULTI-DEVICE-TARGETS.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MULTI-DEVICE-TARGETS.md)

**Prerequisite:** Track 6 shell + Track 11 player before TV/watch polish.

Emit master-plan lines with **Model** on each step (see 01-authoring file).

## Track 18 — Multi-device targets

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 18.1 | Document device matrix: phone (primary), tablet, watch, TV (Android TV / tvOS). | Auto | 510-device-matrix-doc |
| 18.2 | Tablet: responsive breakpoints for Home grid and browse lists (2-column+). | Codex 5.3 | 511-tablet-home-grid |
| 18.3 | Tablet: split view optional for podcast detail + episode list side-by-side. | Codex 5.3 | 512-tablet-split-detail |
| 18.4 | Tablet: mini player width constraint and full player two-column layout. | Codex 5.3 | 513-tablet-player-layout |
| 18.5 | Tablet E2E: screenshot Home and podcast detail at tablet viewport. | Codex 5.3 | 514-e2e-tablet-screenshots |
| 18.6 | Watch (Wear OS): scope decision — remote control only vs standalone player. | Opus 4.8 | 520-watch-scope-decision |
| 18.7 | Watch: MediaSession remote commands from phone engine (play/pause/skip). | Opus 4.8 | 521-watch-remote-commands |
| 18.8 | Watch: now-playing complication data from native cache or phone bridge. | Opus 4.8 | 522-watch-now-playing-complication |
| 18.9 | Watch: document Apple Watch as post-v1 deferral if Wear-only v1. | Auto | 523-watch-apple-deferral |
| 18.10 | TV (Android TV): leanback launcher entry and banner assets. | Codex 5.3 | 530-tv-leanback-launcher |
| 18.11 | TV: D-pad focus navigation for Home rows and browse lists. | Codex 5.3 | 531-tv-dpad-navigation |
| 18.12 | TV: full-screen player with remote-friendly controls (no mini player). | Opus 4.8 | 532-tv-full-player |
| 18.13 | TV: sign-in flow adapted for TV input (QR code or device code OAuth). | Opus 4.8 | 533-tv-auth-flow |
| 18.14 | TV E2E: screenshot browse row focus state (emulator). | Codex 5.3 | 534-e2e-tv-browse-screenshot |
| 18.15 | Document which tracks are phone-only vs shared native modules per device. | Auto | 535-device-track-scope-matrix |
| 18.16 | CI: add tablet emulator matrix job (optional nightly, not PR gate v1). | Codex 5.3 | 536-ci-tablet-emulator-nightly |
| 18.17 | Store listings: separate screenshots per form factor where stores require. | Auto | 537-store-form-factor-screenshots |

## Verification

- Track 18 complete; Detail IDs 510–537; Model on every step.
- Watch/TV scope decisions documented with deferral notes where applicable.
