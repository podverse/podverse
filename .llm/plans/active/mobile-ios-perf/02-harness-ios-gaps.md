# 02 — Fill iOS measurement gaps

**Cursor model:** Codex 5.3
**Reasoning:** high

## Goal

Give iOS the same measurable surface Android already has: UI-thread frames, JS-thread frames during scroll, Browse chip stages, chip press-in latency, image source size, and an images-off A/B switch. Extend `perf-report.mjs` with `--gesture` and `--profile`.

## Deliverables

1. **Native frame probe** — `apps/mobile/modules/podverse-perf-probe` (Expo module). CADisplayLink on iOS, Choreographer on Android. Start/stop/reset/snapshot: frame count, over 17 ms, over 33 ms, max gap ms. Active only when perf/E2E recording is on.
2. **JS frame sampler** — `apps/mobile/src/lib/perf/perfFrames.ts`. rAF from scroll begin to momentum end. Wire in `FillList` → marks `scroll.jsframes` / `scroll.uiframes` (native snapshot detail).
3. **Chip pressin** — `SectionChip` `onPressIn` → `perfMark('chip.pressin', testID)`.
4. **Browse marks** — Mirror Home stages: `browse.chip.tap`, `browse.prefs.end` (or equivalent prefs gate), `browse.repo.end`, `browse.rows.set`, `browse.paint`.
5. **CoverImage** — `onLoad` → `perfCount('image.load')` + mark with source max edge; when `EXPO_PUBLIC_MOBILE_PERF_NO_IMAGES=1`, never load remote URI.
6. **Root scripts** — `mobile:dev:perf:noimages`.
7. **Row counters** — `perfCount` in `useDownloadAction` and playback-row path as named in the parent plan.
8. **perf-report.mjs** — `--gesture chips|browse-chips|scroll`, parse new marks/frames/images, `--profile` (iOS xctrace Time Profiler attach to PodverseNext). Unit tests for new parsers.

## Constraints

- Comments future-forward; no plan number cites.
- No `as` assertions; strict equality; separate `import type`.
- Do not run tests; leave operator verify commands.
