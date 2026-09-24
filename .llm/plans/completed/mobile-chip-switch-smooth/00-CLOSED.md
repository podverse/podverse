# Closed — smooth Home media-type chip switching on iOS

Closed on 2026-09-23 after the thumbnail work. The operator's impression was that chip taps and
image loading felt fast, and grid photographs looked sharp enough after the screen-scale tag.

## What landed

| File | What it did |
| --- | --- |
| [01a](./01a-native-monitor-ios.md) / [01b](./01b-native-monitor-android.md) | Native frame monitor |
| [02a](./02a-harness-recorder.md) / [02b](./02b-harness-stamps.md) | Harness recorder and stamps |
| [03a](./03a-report-metrics.md) / [03b](./03b-report-wiring.md) / [03c](./03c-report-tests-and-baseline.md) | Report, then baselines B1, B2, P0, R0 |
| [05a](./05a-thumbnail-cache.md) / [05b](./05b-ios-thumbnail-artwork.md) | iOS cover thumbnails (capture T5, kept) |

After 05b, two image-quality edits stayed in the same code and were not separate milestones: the
thumbnail edge is the exact device-pixel size, and `Image.loadAsync` is given the screen scale so
the layer draws 1:1. The channel header uses that path at 78 pt. The full-screen viewer does not.

04 (optional profile) was skipped. Browse was never in this set.

## Why it stopped

T5, before those two quality edits: revisit chip visible p95 66.7 ms (was ~777 ms), UI-thread gap
p95 59.2 ms (was 400–760 ms), 0 of 13 taps with a gap ≥ 100 ms, footprint 265 MB (was ~614 MB).
The same-frame targets were not met. The work that would chase them is parked in
[mobile-home-switch-followups](../../active/mobile-home-switch-followups/00-EXECUTION-ORDER.md).

Narrative: [MOBILE-IOS-CHIP-SWITCH.md](/docs/development/mobile/MOBILE-IOS-CHIP-SWITCH.md).
Numbers: [MOBILE-PERF-BASELINES.md](/docs/development/mobile/MOBILE-PERF-BASELINES.md).
