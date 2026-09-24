# 03a — Report metrics: tap-to-frame, UI stalls, row renders, footprint

## Goal

Teach `scripts/mobile/perf-report.mjs` to read the 02 marks and print what the user feels:

- `tapUi` — per tap: touch lag, finger lift → chip / spinner / list frame, and the longest UI-thread
  gap inside that tap's window; grouped as all, first visit, revisit, and per transition;
- `uiLong` — every UI-thread gap over 25 ms from the first gesture mark on;
- `rowRenders` — `home.row.render` per play tap, per refresh load, per synced load;
- `footprint` — app memory at collect time (iOS);
- `timeline.json` saved next to the summary; new `play` and `refresh` gestures; paced chip taps.

## File

- `scripts/mobile/perf-report.mjs` only (tests are 03b).

## Step 1 — Constants

1a. Replace the whole `export const MANUAL_GESTURES = { … };` object with:

```js
export const MANUAL_GESTURES = {
  chips:
    'from Home with Podcasts selected, tap Episodes → Artists → Episodes → Podcasts about one second apart, three times through, then wait three seconds for the timeline to flush.',
  'browse-chips':
    'from Browse with Podcasts selected, tap Episodes → Artists → Episodes → Podcasts about one second apart, three times through, then wait three seconds for the timeline to flush.',
  play: 'from Home Episodes, tap Play on the first row, wait two seconds, tap it again; six taps in all, then wait three seconds for the timeline to flush.',
  refresh:
    'from Home Episodes, pull to refresh and wait for the sync indicator to finish, three times, then wait three seconds for the timeline to flush.',
  scroll:
    'from Home Episodes, fling the list six times up and six times down, then wait three seconds for the timeline to flush.',
};
```

1b. In `CHIP_SURFACES.browse` add `initial: 'browse.chip.initial',` after the `chipFrame` line and
`revisit: 'browse.visit.revisit',` after the `repoEnd` line. In `CHIP_SURFACES.home` add
`initial: 'home.chip.initial',` after `chipFrame` and `revisit: 'home.visit.revisit',` after `repoEnd`.

1c. In `COUNTER_NAMES` append `'home.row.render'`, `'image.thumb.load'`, `'image.thumb.fallback'`.

1d. Replace `export const GESTURE_NAMES = ['chips', 'browse-chips', 'scroll'];` with
`export const GESTURE_NAMES = ['chips', 'browse-chips', 'play', 'refresh', 'scroll'];`

## Step 2 — Counters in `deriveChipSwitchReport`

Replace the whole `const counters = { … };` object literal inside `deriveChipSwitchReport` with:

```js
  const counters = {};
  for (const name of COUNTER_NAMES) {
    counters[name] = typeof countersIn[name] === 'number' ? countersIn[name] : 0;
  }
  counters['home.load.abandoned'] = countAbandonedLoads({ counters: countersIn, marks: timeline.marks });
```

## Step 3 — Revisit taps close on paint

In `pairTaps`, replace:

```js
    if (mark.name === surface.paint) {
      const rowsAt = target.at[surface.rowsSet];
      if (rowsAt === undefined || mark.at < rowsAt) {
```

with:

```js
    if (mark.name === surface.paint) {
      const rowsAt = target.at[surface.rowsSet];
      // A kept list is revealed without a read, so its paint closes the tap on its own.
      const isKeptReveal = surface.revisit !== undefined && target.at[surface.revisit] !== undefined;
      if (!isKeptReveal && (rowsAt === undefined || mark.at < rowsAt)) {
```

## Step 4 — New derivations

Insert this block directly above `export function buildSummary(`:

```js
export const UI_LONG_OVER_MS = 100;
const TAP_WINDOW_TAIL_MS = 3000;
const TOUCH_TO_TAP_MAX_MS = 100;
const TAP_UI_METRICS = ['touchLagMs', 'chipVisibleMs', 'spinnerVisibleMs', 'listVisibleMs', 'uiMaxGapMs'];
const STAMP_METRICS = {
  'chip.visible': 'chipVisibleMs',
  'list.visible': 'listVisibleMs',
  'spinner.visible': 'spinnerVisibleMs',
};

export function parseKeyValueDetail(detail) {
  const values = {};
  if (typeof detail !== 'string') {
    return values;
  }
  for (const part of detail.split(',')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      values[part.slice(0, eq)] = part.slice(eq + 1);
    }
  }
  return values;
}

// `ui.long` detail is relative to the drain; `at - agoMs` puts the frame on the timeline clock.
function longFramesFrom(marks) {
  const frames = [];
  for (const mark of marks) {
    if (mark.name !== 'ui.long') {
      continue;
    }
    const values = parseKeyValueDetail(mark.detail);
    const gapMs = Number(values.gapMs);
    const agoMs = Number(values.agoMs);
    if (Number.isFinite(gapMs) && Number.isFinite(agoMs)) {
      frames.push({ gapMs, startAt: mark.at - agoMs });
    }
  }
  return frames;
}

function metricStats(values) {
  if (values.length === 0) {
    return { max: null, n: 0, p50: null, p95: null };
  }
  return {
    max: Math.max(...values),
    n: values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
  };
}

export function deriveUiLongReport(timeline, startAt = Number.NEGATIVE_INFINITY) {
  const marks = Array.isArray(timeline?.marks) ? timeline.marks : [];
  const gaps = longFramesFrom(marks)
    .filter((frame) => frame.startAt + frame.gapMs >= startAt)
    .map((frame) => frame.gapMs);
  return { over100: gaps.filter((gap) => gap >= UI_LONG_OVER_MS).length, ...metricStats(gaps) };
}

function tapUiBlock(taps) {
  const block = {
    keptReveals: taps.filter((tap) => tap.kept).length,
    taps: taps.length,
    uiOver100Taps: taps.filter((tap) => tap.uiOver100Count > 0).length,
  };
  for (const name of TAP_UI_METRICS) {
    block[name] = metricStats(taps.map((tap) => tap[name]).filter((value) => typeof value === 'number'));
  }
  return block;
}

/**
 * Finger lift to displayed frame for each chip tap. A `chip.touch` within 100 ms before the tap
 * mark gives the lift time; stamps pair to the tap through the same `touchMs` text. A tap's window
 * runs from its lift to the next lift or 3 s, whichever is first; `uiMaxGapMs` 0 means no UI-thread
 * gap over 25 ms in it. A revisit is a chip already shown earlier in the capture.
 */
export function deriveTapUiReport(timeline, surfaceName = 'home') {
  const surface = surfaceName === 'browse' ? CHIP_SURFACES.browse : CHIP_SURFACES.home;
  const marks = Array.isArray(timeline?.marks) ? timeline.marks : [];
  const taps = [];
  const visited = new Set();
  let current = null;
  let lastTouch = null;
  for (const mark of marks) {
    if (mark.name === surface.initial && taps.length === 0 && typeof mark.detail === 'string') {
      current = mark.detail;
      visited.clear();
      visited.add(mark.detail);
    } else if (mark.name === 'chip.touch') {
      lastTouch = mark;
    } else if (mark.name === surface.tap && typeof mark.detail === 'string') {
      const touch =
        lastTouch !== null && mark.at - lastTouch.at <= TOUCH_TO_TAP_MAX_MS
          ? parseKeyValueDetail(lastTouch.detail)
          : {};
      lastTouch = null;
      const lagMs = Number(touch.lagMs);
      const to = mark.detail;
      taps.push({
        from: current,
        kept: false,
        liftAt: Number.isFinite(lagMs) ? mark.at - lagMs : mark.at,
        to,
        touchLagMs: Number.isFinite(lagMs) ? lagMs : undefined,
        touchMs: touch.touchMs,
        visit: to === current ? 'noop' : visited.has(to) ? 'revisit' : 'first',
      });
      visited.add(to);
      current = to;
    } else if (mark.name === surface.revisit && taps.length > 0) {
      const last = taps[taps.length - 1];
      if (last.to === mark.detail) {
        last.kept = true;
      }
    } else if (STAMP_METRICS[mark.name] !== undefined) {
      const values = parseKeyValueDetail(mark.detail);
      const ms = Number(values.ms);
      const metric = STAMP_METRICS[mark.name];
      const tap = taps.findLast((entry) => entry.touchMs !== undefined && entry.touchMs === values.touchMs);
      if (tap !== undefined && Number.isFinite(ms) && tap[metric] === undefined) {
        tap[metric] = ms;
      }
    }
  }
  const frames = longFramesFrom(marks);
  taps.forEach((tap, index) => {
    const next = taps[index + 1];
    const windowEnd = Math.min(
      tap.liftAt + TAP_WINDOW_TAIL_MS,
      next === undefined ? Number.POSITIVE_INFINITY : next.liftAt
    );
    const inWindow = frames.filter(
      (frame) => frame.startAt < windowEnd && frame.startAt + frame.gapMs > tap.liftAt
    );
    tap.uiMaxGapMs = inWindow.reduce((max, frame) => Math.max(max, frame.gapMs), 0);
    tap.uiOver100Count = inWindow.filter((frame) => frame.gapMs >= UI_LONG_OVER_MS).length;
  });
  const switches = taps.filter((tap) => tap.visit !== 'noop');
  const byTransition = {};
  for (const tap of switches) {
    const key = `${tap.from ?? '?'}→${tap.to}`;
    (byTransition[key] ??= []).push(tap);
  }
  return {
    all: tapUiBlock(switches),
    byTransition: Object.fromEntries(
      Object.entries(byTransition).map(([key, list]) => [key, tapUiBlock(list)])
    ),
    first: tapUiBlock(switches.filter((tap) => tap.visit === 'first')),
    noopTaps: taps.length - switches.length,
    revisit: tapUiBlock(switches.filter((tap) => tap.visit === 'revisit')),
    taps,
  };
}

/** A counter's growth from each `start` mark (matching `detail` when given) to the next `start`. */
export function deriveCounterDeltas(timeline, { counter, detail, start }) {
  const marks = Array.isArray(timeline?.marks) ? timeline.marks : [];
  const starts = marks.filter((mark) => mark.name === start);
  const samples = [];
  starts.forEach((mark, index) => {
    if (detail !== undefined && mark.detail !== detail) {
      return;
    }
    const next = starts[index + 1];
    const endCounters = next !== undefined ? next.counters : (timeline.counters ?? mark.counters);
    samples.push(counterAt(endCounters, counter) - counterAt(mark.counters, counter));
  });
  return metricStats(samples);
}

function gestureStartAt(timeline, gesture, surface) {
  const marks = Array.isArray(timeline?.marks) ? timeline.marks : [];
  let first;
  if (gesture === 'play') {
    first = marks.find((mark) => mark.name === 'home.play.tap');
  } else if (gesture === 'refresh') {
    first = marks.find((mark) => mark.name === 'home.load.start' && mark.detail === 'refresh');
  } else if (gesture !== 'scroll') {
    first = marks.find((mark) => mark.name === CHIP_SURFACES[surface].tap);
  }
  return first === undefined ? Number.NEGATIVE_INFINITY : first.at - TOUCH_TO_TAP_MAX_MS;
}

export function parseFootprint(text) {
  const phys = /phys_footprint: (\d+) B/.exec(text ?? '');
  if (phys === null) {
    return null;
  }
  const peak = /phys_footprint_peak: (\d+) B/.exec(text ?? '');
  const toMb = (bytes) => Math.round(Number(bytes) / (1024 * 1024));
  return { peakMb: peak === null ? null : toMb(peak[1]), physMb: toMb(phys[1]) };
}
```

Step 5 (wiring these into the summary, text output, and collect) is in 03b.

## Do not

- Do not change existing stage math, `STAGE_NAMES`, or the Maestro (non-manual) flow order.
- Do not rename existing exports.

## Done when

- [ ] Steps 1–4 applied; Prettier run on `scripts/mobile/perf-report.mjs`.
- [ ] COPY-PASTA 03a ticked; this file moved to `.llm/plans/completed/mobile-chip-switch-smooth/`.

## Operator checkpoint

None yet. Paste prompt 03b next.
