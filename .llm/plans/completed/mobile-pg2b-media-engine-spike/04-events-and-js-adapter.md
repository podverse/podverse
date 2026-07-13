# Plan 04 — Native→JS events and bridge adapter

**Steps:** 2.10, 2.11
**Model:** Opus 4.8

## Detail references

- [089-native-to-js-events](/docs/proposals/mobile/_master-plan_/details/089-native-to-js-events.md)
- [090-js-bridge-adapter](/docs/proposals/mobile/_master-plan_/details/090-js-bridge-adapter.md)

## Tasks

1. Emit `playbackState`, `progress`, `ended`, `error`, `stalled` from iOS and Android.
2. Implement TS adapter implementing `NativePlaybackBridge`.
3. Ensure screens do not call native modules directly.
4. Optional: temporary debug controls on Hello World to exercise the bridge (remove later if noisy).

## On completion

Mark steps **2.10, 2.11** as `done`.
