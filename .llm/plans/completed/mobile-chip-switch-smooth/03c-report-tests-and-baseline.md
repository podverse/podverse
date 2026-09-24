# 03c — Report tests, the chip switch ledger, and baseline captures

## Goal

1. Unit tests for the 03a/03b report code (the operator runs them; a report crash wastes a capture).
2. A **Chip switch ledger** table in `MOBILE-PERF-BASELINES.md` that every checkpoint appends to.
3. Baseline captures B1, B2 (and optional B3), P0, R0, BR0 before any fix lands.

## Preconditions

- 03a and 03b done.

## Files

- `scripts/mobile/perf-report.test.mjs`
- `docs/development/mobile/MOBILE-PERF-BASELINES.md`

## Step 1 — Tests (`perf-report.test.mjs`)

1a. Add to the import list from `'./perf-report.mjs'` (keep it alphabetical):
`deriveCounterDeltas`, `deriveTapUiReport`, `deriveUiLongReport`, `parseFootprint`.

1b. In the test that asserts `MANUAL_GESTURE` equals a string, replace the expected string with:
`'from Home with Podcasts selected, tap Episodes → Artists → Episodes → Podcasts about one second apart, three times through, then wait three seconds for the timeline to flush.'`

1c. Append at the end of the file:

```js
const TAP_UI_TIMELINE = {
  counters: {},
  marks: [
    mark('home.chip.initial', 0, 'podcasts'),
    mark('chip.touch', 1000, 'touchMs=5000.000,lagMs=12.0'),
    mark('home.chip.tap', 1002, 'episodes'),
    mark('chip.visible', 1100, 'touchMs=5000.000,ms=40.0'),
    mark('spinner.visible', 1100, 'touchMs=5000.000,ms=40.0'),
    mark('list.visible', 1500, 'touchMs=5000.000,ms=380.0'),
    mark('ui.long', 1500, 'gapMs=150.0,agoMs=400.0'),
    mark('chip.touch', 2000, 'touchMs=6000.000,lagMs=4.0'),
    mark('home.chip.tap', 2001, 'podcasts'),
    mark('home.visit.revisit', 2001, 'podcasts'),
    mark('chip.visible', 2100, 'touchMs=6000.000,ms=20.0'),
    mark('list.visible', 2100, 'touchMs=6000.000,ms=20.0'),
  ],
};

test('deriveTapUiReport pairs touches with stamps and splits first visits from revisits', () => {
  const report = deriveTapUiReport(TAP_UI_TIMELINE, 'home');
  assert.equal(report.all.taps, 2);
  assert.equal(report.first.taps, 1);
  assert.equal(report.revisit.taps, 1);
  assert.equal(report.revisit.keptReveals, 1);
  assert.equal(report.first.touchLagMs.p95, 12);
  assert.equal(report.first.chipVisibleMs.p95, 40);
  assert.equal(report.first.listVisibleMs.p95, 380);
  assert.equal(report.first.uiMaxGapMs.p95, 150);
  assert.equal(report.first.uiOver100Taps, 1);
  assert.equal(report.revisit.uiMaxGapMs.p95, 0);
  assert.deepEqual(Object.keys(report.byTransition), ['podcasts→episodes', 'episodes→podcasts']);
});

test('deriveTapUiReport never pairs stamps to a touch on a mismatched clock', () => {
  const report = deriveTapUiReport(
    {
      counters: {},
      marks: [
        mark('home.chip.initial', 0, 'podcasts'),
        mark('chip.touch', 1000, 'clock=mismatch'),
        mark('home.chip.tap', 1001, 'episodes'),
        mark('chip.visible', 1100, 'touchMs=5000.000,ms=40.0'),
        mark('home.chip.tap', 3000, 'episodes'),
      ],
    },
    'home'
  );
  assert.equal(report.all.taps, 1);
  assert.equal(report.all.chipVisibleMs.n, 0);
  assert.equal(report.all.touchLagMs.n, 0);
  assert.equal(report.noopTaps, 1);
});

test('deriveCounterDeltas measures a counter from each start mark to the next', () => {
  const plays = deriveCounterDeltas(
    {
      counters: { 'home.row.render': 70 },
      marks: [
        mark('home.play.tap', 0, 'episodes', { 'home.row.render': 10 }),
        mark('home.play.tap', 100, 'episodes', { 'home.row.render': 30 }),
        mark('home.play.tap', 200, 'episodes', { 'home.row.render': 32 }),
      ],
    },
    { counter: 'home.row.render', start: 'home.play.tap' }
  );
  assert.equal(plays.n, 3);
  assert.equal(plays.p50, 20);
  assert.equal(plays.max, 38);

  const refreshes = deriveCounterDeltas(
    {
      counters: { 'home.row.render': 9 },
      marks: [
        mark('home.load.start', 0, 'refresh', { 'home.row.render': 1 }),
        mark('home.load.start', 50, 'synced', { 'home.row.render': 5 }),
      ],
    },
    { counter: 'home.row.render', detail: 'refresh', start: 'home.load.start' }
  );
  assert.equal(refreshes.n, 1);
  assert.equal(refreshes.max, 4);
});

test('deriveUiLongReport counts only gaps that end after the gesture starts', () => {
  const report = deriveUiLongReport(
    {
      counters: {},
      marks: [
        mark('ui.long', 100, 'gapMs=300.0,agoMs=50.0'),
        mark('home.chip.tap', 1000, 'episodes'),
        mark('ui.long', 1500, 'gapMs=120.0,agoMs=100.0'),
        mark('ui.long', 1600, 'gapMs=30.0,agoMs=10.0'),
      ],
    },
    900
  );
  assert.equal(report.n, 2);
  assert.equal(report.over100, 1);
  assert.equal(report.max, 120);
});

test('parseFootprint reads phys_footprint and its peak in MB', () => {
  const text = 'Auxiliary data:\n    phys_footprint: 822083584 B\n    phys_footprint_peak: 1159725056 B\n';
  assert.deepEqual(parseFootprint(text), { peakMb: 1106, physMb: 784 });
  assert.equal(parseFootprint('no footprint here'), null);
});

test('buildSummary reports row renders for play captures without chip stages', () => {
  const summary = buildSummary({
    commit: 'abc',
    device: 'ios',
    dirty: false,
    frames: null,
    gesture: 'play',
    mode: 'manual',
    timeline: {
      counters: { 'home.row.render': 8 },
      marks: [
        mark('home.chip.tap', 0, 'episodes'),
        mark('home.play.tap', 100, 'episodes', { 'home.row.render': 2 }),
      ],
    },
  });
  assert.equal(summary.surface, null);
  assert.equal(summary.tapUi, undefined);
  assert.equal(summary.rowRenders.playTap.max, 6);
  assert.equal(summary.uiLong.n, 0);
});

test('formatSummaryTxt prints tapUi, uiLong, rowRenders, and footprint', () => {
  const text = formatSummaryTxt({
    commit: 'abc',
    counters: {},
    countersPerTap: {},
    device: 'ios',
    dirty: false,
    footprint: { peakMb: 900, physMb: 700 },
    frames: null,
    mode: 'manual',
    passes: [],
    rowRenders: {
      playTap: deriveCounterDeltas(TAP_UI_TIMELINE, { counter: 'home.row.render', start: 'home.play.tap' }),
    },
    tapUi: deriveTapUiReport(TAP_UI_TIMELINE, 'home'),
    uiLong: deriveUiLongReport(TAP_UI_TIMELINE),
  });
  assert.match(text, /tapUi/);
  assert.match(text, /podcasts→episodes/);
  assert.match(text, /uiLong/);
  assert.match(text, /rowRenders/);
  assert.match(text, /footprint {2}phys 700 MB {2}peak 900 MB/);
});
```

## Step 2 — Ledger section (`MOBILE-PERF-BASELINES.md`)

Insert directly above the heading `## Episodes fling — corrected frame baseline, 2026-09-22`:

```markdown
## Chip switch ledger — native frame stamps, from 2026-09-22

Manual iOS on `"iPhone 17 Pro"` with the operator's real library; dev JS unless the Build column
says otherwise. Times run from finger lift to the display time of the frame that shows the change,
measured natively on one clock, so they are what the user sees (rAF marks are not). Gestures are the
`MANUAL_GESTURES` texts in `scripts/mobile/perf-report.mjs`, at about one tap per second. A
difference smaller than the B1–B2 spread, and never less than 8 ms, is no change. Each change lands
alone and is captured before the next, so this table shows which changes mattered.

| Label | Date | Build | chipVisible p95 first / revisit | spinnerVisible p95 | listVisible p95 revisit | uiMaxGap p95 | taps ≥100 ms gap | touchLag p95 | row renders (play / refresh) | footprint MB | Impression | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

```

## Do not

- Do not edit existing rows or sections of `MOBILE-PERF-BASELINES.md`.
- Do not fill in ledger rows now; checkpoint reviews add them from real captures.

## Done when

- [ ] Tests added and the gesture assertion updated; Prettier run on the test file.
- [ ] Ledger heading, paragraph, and empty table exist above the Episodes fling section.
- [ ] COPY-PASTA 03c ticked; this file moved to `.llm/plans/completed/mobile-chip-switch-smooth/`.

## Operator checkpoint

First run the report tests in **Mobile** (they must pass before captures are worth anything):

```bash
node --test scripts/mobile/perf-report.test.mjs
npm --prefix apps/mobile run test -- src/lib/perf
```

Then capture baselines with [CHECKPOINT.md](./CHECKPOINT.md) — same routine each time, cold start
before each: **B1** (`chips`), **B2** (`chips`), **P0** (`play`), **R0** (`refresh`), **BR0**
(`browse-chips`). Optional **B3**: stop **Mobile Metro**, start `npm run mobile:dev:perf:prodjs`
there, capture `chips`, then return **Mobile Metro** to `npm run mobile:dev:perf`.

Check the first summary before doing the rest: `tapUi` should list 12 taps with numbers in the
`chipVisible` column. If every cell reads `—/—`, the rebuild after 01b did not happen.

Then paste the **Checkpoint review** prompt listing `B1, B2, P0, R0, BR0` (and B3) for milestone 03.
