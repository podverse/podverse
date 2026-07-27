# 399-abcmemory-car-native-only

**Master step:** 12.20
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Lock the "car surfaces are native-only, not JS/track-player browse" guidance into abcmemory now that
Android Auto browse + play are implemented natively from the cache (12.11–12.15).

## Deliverable

- Update [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc) with an
  **Android Auto: implemented natively from the cache (12.11–12.15)** section:
  - Service + allowed callers + app-closed root (12.11 / 12.13).
  - Browse tree from cache (12.12 / 12.14) via `PodverseNativeCacheModel`.
  - Play via `onAddMediaItems` / `onPlaybackResumption` on the one shared engine (12.15).
  - Reinforce: edit the **native** module for car changes; **never** a JS/track-player car browser.
  - Link the DHU checklist; note iOS CarPlay is a later slice.
- This is an **abcmemory** change — commit only `.cursor/**` for the rule edit.

## Acceptance criteria

- Rule states Android Auto browse + play are native-from-cache and points at the DHU checklist.
- Reinforces the no-JS/track-player-car-browse constraint.
- iOS CarPlay flagged as later (entitlement not provisioned).

## Verification

```bash
rg -n 'implemented natively from the cache|ANDROID-AUTO-DHU-CHECKLIST' \
  .cursor/rules/mobile-carplay-android-auto.mdc
```

## Depends on

- 12.11–12.15 Android Auto browse + play (details 390–394) — this phase
