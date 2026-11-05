# 14 — F-Droid (Placeholder)

## Goal

Acknowledge F-Droid as a supported distribution path for v4 today, and defer
detailed NextGen planning until the Play / App Store migration path is solid.

## Status

Placeholder only. Not scheduled.

## What we know

- v4 F-Droid package id: **`com.podverse.fdroid`** (separate from Play
  `com.podverse`).
- Source and metadata live in `~/repos/podverse-fdroid` (and related F-Droid
  metadata processes). Builds are typically from source with F-Droid signing,
  not Play App Signing.
- The v4 app detects F-Droid via `RELEASE_TYPE` and points the update overlay
  at F-Droid, not Play.
- NextGen mobile has not started F-Droid packaging work.

## Why this is harder than Play

- In-place upgrade requires publishing a NextGen build into the **same** F-Droid
  application id with a higher version code, using the F-Droid-compatible
  build recipe and signing model.
- FOSS dependency policy may differ from the Play flavor (see existing mobile
  FOSS / playstore flavor thinking in the monorepo).
- Grace-period messaging and min-version behavior must open the F-Droid client
  listing, not Google Play.

## Proposed approach (for later)

1. Finish Play / iOS in-place migration design and rehearsal.
2. Inventory F-Droid recipe, signing, and anti-feature declarations.
3. Decide whether NextGen ships as an update to `com.podverse.fdroid` or a new
   id (new id loses local data continuity).
4. Write a full step doc parallel to [03](03-store-identity-and-signing.md) and
   [08](08-mobile-first-launch-migration.md) specifically for F-Droid.

## Honest limits and risks

- Treating F-Droid as "same as Play" will fail. Do not assume store timelines
  or signing match.
- Until a plan exists, F-Droid users may remain on v4 longer than Play users.

## Open questions

- Target: update `com.podverse.fdroid` in place, or new id?
- Who maintains the F-Droid metadata PR process today?

## Future plan sets

- Replace this placeholder with a full sequential doc when ready.
