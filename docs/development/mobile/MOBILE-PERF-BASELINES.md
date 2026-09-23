# Mobile performance baselines

Measured numbers for `apps/mobile`, kept here because plan directories under `.llm/plans/` are
deleted once their work lands. Anything worth not re-measuring belongs in this file.

For a short narrative of the Home and Browse chip-tap fix (cause, fix, iOS versus Android), see
[MOBILE-CHIP-TAP.md](./MOBILE-CHIP-TAP.md).

A perf capture costs four to ten minutes of device time per run, and a reseed on top of that. Read
this file before running one. If the number you need is here, cite it instead.

## The harness

| Piece                  | Where                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| Span recorder          | `apps/mobile/src/lib/perf/perfSpans.ts` (dev/E2E only, inert in production) |
| Home chip-switch marks | `apps/mobile/src/screens/home/HomeScreen.tsx`                               |
| Report script          | `scripts/mobile/perf-report.mjs`                                            |
| Seeded flows           | `apps/mobile/e2e/perf-chip-switch.yaml`, `apps/mobile/e2e/perf-scroll.yaml` |
| Output                 | `.artifacts/mobile-perf/<timestamp>/summary.{json,txt}`                     |

```bash
PODVERSE_E2E_PERF_VOLUME=1 make mobile_e2e_seed
node scripts/mobile/perf-report.mjs --device android
node scripts/mobile/perf-report.mjs --manual --arm --device ios
node scripts/mobile/perf-report.mjs --manual --collect --device ios
```

Seeded runs use `Pixel_6_Pro_API_33_e2e` and `"iPhone 17 Pro E2E"` against the perf account's 100
channels and 300 items. Manual runs use `Pixel_6_Pro_API_33` and `"iPhone 17 Pro"` against a real
library with a real hand gesture. **Never compare a number from one of those against the other**, or
a cold pass against a warm one.

## Stages

`prefsGate` is the tap to persisted sort/filter preferences resolving, `read` is the SQLite read,
`commit` is `setState`, `paint` is the commit to the render that carries the new rows, and `total` is
tap to that paint. An **abandoned tap** has no closing paint because a later tap superseded it, so it
contributes to `prefsGate` and `read` but not to `paint` or `total`. An **early paint** is a render
between the tap and the new rows — the user sees the previous media type under the new chip.

## Home chip switch — baseline, 2026-09-22

Gesture: Podcasts → Episodes → Artists → Episodes → Podcasts, as fast as possible. Medians across
runs of each run's own p95. Commit `c17b8754`, working tree dirty.

| Capture                     | prefsGate p95 | read p95 | paint p95 | total p95 | Largest stage  |
| --------------------------- | ------------- | -------- | --------- | --------- | -------------- |
| Manual Android, 3 runs      | 509 ms        | 44 ms    | 224 ms    | 770 ms    | prefsGate, 66% |
| Seeded Android cold, 3 runs | 632 ms        | 126 ms   | 379 ms    | 1009 ms   | prefsGate, 63% |
| Seeded Android warm, 3 runs | 555 ms        | 130 ms   | 466 ms    | 1145 ms   | prefsGate, 48% |
| Manual iOS, 2 clean runs    | 94 ms         | 31 ms    | 117 ms    | 261 ms    | paint, 45%     |
| Seeded iOS cold, 6 runs     | 261 ms        | 101 ms   | 291 ms    | 696 ms    | paint, 42%     |
| Seeded iOS warm, 6 runs     | 278 ms        | 101 ms   | 285 ms    | 709 ms    | paint, 40%     |

**The two devices do not have the same bottleneck.** Android is preference-gate bound; iPhone is
paint bound with the gate close behind. A fix aimed at one leaves the other alone. `read` is 6–14%
everywhere and is not the stall.

Counters, per tap rather than per session (the session total includes startup and every earlier tap,
which is what made the first attempt's numbers meaningless):

| Capture        | `prefs.getItem` p95 | `home.row.mount` p95 | `home.load.abandoned` |
| -------------- | ------------------- | -------------------- | --------------------- |
| Manual Android | 4                   | 39–44                | 0                     |
| Manual iOS     | 4                   | 16–24                | 0                     |
| Seeded Android | 4                   | 78                   | 0                     |
| Seeded iOS     | 4                   | 72                   | 0                     |

About 8–10 rows are on screen, so mount counts run several times the visible row count on the seeded
volume.

Early paints: Android shows one on 2–3 of 4 hand taps and 3 of 4 seeded taps, with the previous
media type visible for roughly 280–510 ms by hand and 660–850 ms seeded. iOS records **zero**, even
on a run where the operator watched Episodes rows sit under the Podcasts chip — on that run the paint
mark did not fire until rows committed, so the flash is inside `total` rather than in `staleMs`.
**A zero early-paint count on iOS is not evidence the flash is absent.**

### Variance

Seeded iOS **cold** `total` p95 across six runs: 707, 542, 475, 722, 684, 713 ms — a 51.8% spread.
**Warm** across the same six: 709, 709, 714, 706, 696, 710 ms — 2.5%. Gate later work on the warm
number. Seeded Android warm spread is 29%, just inside the 30% line.

## Candidate results

| Candidate                            | Change                                                                                                                | Result                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cache sort preferences in memory     | Module-level cache in `sortPrefs.ts` for `sort.` keys, including cached `null`                                        | **Reverted.** Warm `prefsGate` p95 406 ms vs 555 ms baseline, −26.9%. Bar was −60%. Per-tap `prefs.getItem` fell from 4 to 1, warm `total` p95 from 1145 ms to 642 ms, cold gate unchanged (620 ms vs 632 ms).                                                                                                                                                             |
| Urgent clear plus loading state      | Home chip and list clear commit together; `ListLoading` while `hasCompletedFeedRead` is false                         | **Kept.** One seeded Android run, warm `total` p95 304 ms vs 1145 ms baseline (−73%). `prefs.getItem` per tap stayed at 4. Early paints 0 of 4. Rapid Android chip taps feel smooth. iOS was not rechecked.                                                                                                                                                                |
| Third-party artwork on the perf seed | `PODVERSE_E2E_PERF_REMOTE_IMAGES=1` assigns 100 unique channel URLs and 300 unique item URLs. Default seed unchanged. | **Did not move the numbers.** One seeded Android run vs the post-07 localhost run: cold paint p95 136 ms vs 138 ms, warm total p95 304 ms vs 304 ms, fling 116 of 120 frames over 32 ms after the first two (localhost 117 and 116), worst frame 692 ms (localhost 653 ms and 400 ms). Screenshot shows distinct remote covers. Do not average with the localhost baseline. |
| One translator for every list row    | A single `useTranslation()` published to the Home row subtree, replacing nine per-row subscriptions                   | **Reverted.** Warm paint p95 128 ms vs 139 ms post-07 (−8%; bar was −30%). Per-tap `home.row.mount` p95 stayed 24. Fling 117 of 120 frames over 32 ms after the first two, matching the post-07 Episodes fling.                                                                                                                                                            |
| Urgent clear on Browse               | Browse chip and list clear commit together; pull-to-refresh lock releases even when the refresh is superseded         | **Kept.** No Browse perf flow; checked by hand on Android. Home re-measured to confirm it was untouched: warm `total` p95 371 ms, early paints 0 of 4, inside the Android warm spread.                                                                                                                                                                                     |

The preference cache is worth knowing about: the storage round-trips were real and removing them did
help, but about three quarters of the gate time survived, so **the gate is not the `AsyncStorage`
reads**. Whatever else `arePrefsHydrated` waits on is where the rest of that time is. Do not re-run
this experiment to re-learn that.

The shared translator is the same kind of result. The nine `useTranslation()` subscriptions per row
were real, and publishing one translator did not move warm `paint` (128 ms vs 139 ms) or the Episodes
fling. Do not re-run that experiment unless the row subtree starts subscribing to i18n again.

## Episodes fling — corrected frame baseline, 2026-09-22

One seeded Android run after the column-name parser fix (`.artifacts/mobile-perf/20260922-111738`).
`Pixel_6_Pro_API_33_e2e`, volume seed, scripted fling in `perf-scroll.yaml`.

| total | over 16 ms | over 32 ms | over 32 ms after the first two | skipped | worstMs |
| ----- | ---------- | ---------- | ------------------------------ | ------- | ------- |
| 120   | 63         | 0          | 0                              | 0       | 20.8    |

No frame in that fling exceeded 32 ms. 63 of 120 exceeded 16 ms. **Do not score a window change
against it.** `perf-scroll.yaml` waits for any `home-feed-row-*`, and that run still had the previous
chip's rows mounted, so the swipe could start before Episodes rows existed.

After the Home clear commits with the chip, that wait cannot succeed until an Episodes row exists.
Two flings from that state, same device and seed: 119 and 118 of 120 frames over 32 ms, 117 and 116
after the first two, worst frame 653 ms and 400 ms. That is the Episodes-list number from the
scripted flow.

A hand fling of Home → Episodes on the Android emulator on 2026-09-22 showed no stutter. Those
scripted counts are a different gesture: `perf-scroll.yaml` swipes a fixed number of times and
`dumpsys gfxinfo` scores frames. Do not open follow-up work from the frame table alone.

## Known-bad measurements

**Android frame stats before the column-name parser are void.** `parseGfxinfoFramestats` used to
index the pre-Android-12 `dumpsys gfxinfo framestats` layout. API 31+ inserts `FrameTimelineVsyncId`
at index 1 and appends six columns, so the code subtracted a vsync **id** from `SyncStart` and
reported every frame as janky: 120 of 120 over 32 ms, `worstMs` about 24,040,438 ms. Any smoothness
claim citing `android-1` through `android-3` frame blocks is void. The parser now reads `IntendedVsync`
and `FrameCompleted` by header name. A physically impossible duration is still a harness bug.

**iOS has no automatable frame timing.** `frames` is `null` on iOS by design. A smoothness claim
verified only on iOS is not verified.

**Maestro `tapOn` is not a fast gesture.** `waitToSettleTimeoutMs: 0` governs what happens after a
tap, not the hierarchy search before it. Element taps landed about 2348 ms apart; screen-point taps
about 924 ms apart, still above the 600 ms an overlapping gesture needs. The scripted flow is
therefore a **sequential** gesture. Anything about superseding an in-flight load has to come from the
manual capture.

**Chip coordinates differ per platform.** Android taps at y=13%; on a 402×874 iPhone the chips sit at
y=122–150, so 13% lands above them and the flow passes while Podcasts stays selected. iOS taps use
y=16%.

**The manual timeline is not cleared on arm.** `--manual --arm` starts a fresh log window but the
in-memory marks survive, so a second gesture without reloading the app produces a file containing
both. Reload between manual gestures.

## Open questions

- **Third-party artwork is measured and is not the chip-switch stall.** The default volume seed still
  points every channel at one `localhost:2111` PNG and inserts no item images.
  `PODVERSE_E2E_PERF_REMOTE_IMAGES=1` assigns `tools/web/perf-remote-image-urls.json`. One Android
  capture with that flag (distinct covers visible) matched the localhost chip and fling numbers
  inside run-to-run spread. Do not re-run it to re-learn that unless the image path or the device
  changes. Those captures stay a separate population.
- **What the rest of `prefsGate` is.** Removing the storage reads left about 400 ms of it.
- **Why iOS taps sometimes never reach the handler.** During manual capture the first Podcasts press
  did nothing twice; those presses produce no `home.chip.tap` mark at all, so they are not abandoned
  taps and not a cancellation.

## Related

- [MOBILE-CHIP-TAP.md](./MOBILE-CHIP-TAP.md) — why chip taps stalled and what the urgent clear fixed
- [mobile-perf-measured-claims](/.cursor/rules/mobile-perf-measured-claims.mdc) — when a perf claim
  needs a number, and where the number goes
- [mobile-row-render-cost](/.cursor/rules/mobile-row-render-cost.mdc) — per-row cost, paid once per
  mounted row
- [mobile-list-virtualization](/.cursor/rules/mobile-list-virtualization.mdc) — render window and
  scroll ownership
