# 03b — Report wiring: summary, text output, collect, and a production-JS Metro

## Goal

Put the 03a derivations into `summary.json` / `summary.txt`, save `timeline.json`, read iOS memory
at collect time, and add a Metro script that serves production JS (no dev checks) to the same
native build, for an optional baseline.

## Preconditions

- 03a done (`deriveTapUiReport`, `deriveUiLongReport`, `deriveCounterDeltas`, `parseFootprint`,
  `gestureStartAt`, `TAP_UI_METRICS` exist in `scripts/mobile/perf-report.mjs`).

## Files

- `scripts/mobile/perf-report.mjs`
- `package.json` (repo root)

## Step 1 — `buildSummary`

1a. Replace the `const skipChip =` statement's first condition line `    gesture === 'scroll' ||` with:

```js
    gesture === 'scroll' ||
    gesture === 'play' ||
    gesture === 'refresh' ||
```

1b. Directly after the whole `const skipChip = …;` statement add:

```js
  const rowRenders = {
    playTap: deriveCounterDeltas(timeline, { counter: 'home.row.render', start: 'home.play.tap' }),
    refreshLoad: deriveCounterDeltas(timeline, {
      counter: 'home.row.render',
      detail: 'refresh',
      start: 'home.load.start',
    }),
    syncedLoad: deriveCounterDeltas(timeline, {
      counter: 'home.row.render',
      detail: 'synced',
      start: 'home.load.start',
    }),
  };
  const uiLong = deriveUiLongReport(timeline, gestureStartAt(timeline, gesture, surface));
```

1c. In the object returned inside `if (skipChip) { return { … }; }`, add `rowRenders,` and `uiLong,`
as the last two properties.

1d. In the final `return { … };` of `buildSummary`, add as the last three properties:

```js
    rowRenders,
    tapUi: deriveTapUiReport(timeline, surface),
    uiLong,
```

## Step 2 — `helpText`

2a. In the manual usage line, replace `[--gesture chips|browse-chips|scroll]` with
`[--gesture chips|browse-chips|play|refresh|scroll]`.

2b. Replace the line `'  --gesture            chips (default) | browse-chips | scroll',` with
`'  --gesture            chips (default) | browse-chips | play | refresh | scroll',`.

2c. After the line ``    `browse-chips: ${MANUAL_GESTURES['browse-chips']}`,`` add:

```js
    `play:         ${MANUAL_GESTURES.play}`,
    `refresh:      ${MANUAL_GESTURES.refresh}`,
```

## Step 3 — `formatSummaryTxt`

3a. Directly above `export function formatSummaryTxt(summary) {` add:

```js
function tapUiLine(label, block) {
  const cells = TAP_UI_METRICS.map((name) =>
    pad(`${formatMs(block[name].p50)}/${formatMs(block[name].p95)}`, 15)
  );
  return `${pad(label, 24)}  ${pad(block.taps, 4)}  ${pad(block.keptReveals, 4)}  ${cells.join('  ')}  ${pad(block.uiOver100Taps, 6)}`;
}

```

3b. At the end of `formatSummaryTxt`, find the last two statements:

```js
  lines.push('');
  return lines.join('\n');
}
```

and insert this block directly above that final `lines.push('');`:

```js
  if (summary.tapUi !== undefined) {
    lines.push('');
    lines.push('tapUi  (finger lift → displayed frame, ms, p50/p95)');
    const header = TAP_UI_METRICS.map((name) => pad(name.replace(/Ms$/, ''), 15)).join('  ');
    lines.push(`${pad('group', 24)}  ${pad('taps', 4)}  ${pad('kept', 4)}  ${header}  ${pad('≥100ms', 6)}`);
    const groups = [
      ['all', summary.tapUi.all],
      ['first', summary.tapUi.first],
      ['revisit', summary.tapUi.revisit],
      ...Object.entries(summary.tapUi.byTransition),
    ];
    for (const [label, block] of groups) {
      lines.push(tapUiLine(label, block));
    }
    lines.push(`noop taps: ${summary.tapUi.noopTaps}`);
  }
  if (summary.uiLong !== undefined) {
    lines.push('');
    lines.push('uiLong  (UI-thread gaps over 25 ms, from the first gesture mark)');
    lines.push(
      `count ${summary.uiLong.n}  ≥100ms ${summary.uiLong.over100}  p50 ${formatMs(summary.uiLong.p50)}  p95 ${formatMs(summary.uiLong.p95)}  max ${formatMs(summary.uiLong.max)}`
    );
  }
  if (summary.rowRenders !== undefined) {
    lines.push('');
    lines.push('rowRenders  (home.row.render per event)');
    for (const [label, stats] of Object.entries(summary.rowRenders)) {
      lines.push(
        `${pad(label, 22)}  p50 ${formatMs(stats.p50)}  p95 ${formatMs(stats.p95)}  max ${formatMs(stats.max)}  n ${stats.n}`
      );
    }
  }
  if (summary.footprint !== undefined && summary.footprint !== null) {
    lines.push('');
    lines.push(`footprint  phys ${summary.footprint.physMb} MB  peak ${summary.footprint.peakMb ?? '—'} MB`);
  }
```

## Step 4 — `writeReport` saves the timeline

4a. Change `function writeReport(summary) {` to `function writeReport(summary, timeline = null) {`.

4b. Directly after the line that writes `summary.json` add:

```js
  if (timeline !== null) {
    writeFileSync(join(reportDir, 'timeline.json'), `${JSON.stringify(timeline)}\n`);
  }
```

4c. In `collectManual`, change `writeReport(summary);` to `writeReport(summary, timeline);`.
In `main`, change the final `writeReport({` call so it passes the chip timeline as a second
argument: `writeReport({ ...chipSummary, scrollFrames: scrollSummary.scrollFrames }, timeline);`
(keep the object's contents as they are; only add `, timeline`).

## Step 5 — iOS footprint at collect

5a. Directly above `function collectManual(device, gesture, profile) {` add:

```js
// Host-side read of the simulator app's memory. Only one PodverseNext may be running.
function readIosFootprint() {
  const result = spawnSync('footprint', ['--noCategories', '-f', 'bytes', '-p', 'PodverseNext'], {
    encoding: 'utf8',
  });
  if (result.error !== undefined || result.status !== 0) {
    return null;
  }
  return parseFootprint(result.stdout);
}

```

5b. In `collectManual`: add `let footprint = null;` directly after `let profilePaths = null;`. In
the iOS `else` branch, directly after `logText = collectIosLog(udid, readIosLogStart());` add
`footprint = readIosFootprint();`. Directly after the `const summary = buildSummary({ … });`
statement add `summary.footprint = footprint;`.

## Step 6 — Root `package.json`

After the `"mobile:dev:perf:noimages": …` line add:

```json
    "mobile:dev:perf:prodjs": "EXPO_PUBLIC_MOBILE_PERF=1 npm --prefix apps/mobile run start -- --no-dev --minify",
```

## Do not

- Do not change the Maestro mode flow list or its `sleep` waits.
- Do not change `--profile` behavior (04 owns that).

## Done when

- [ ] Steps 1–6 applied; Prettier run on `scripts/mobile/perf-report.mjs` and `package.json`.
- [ ] `rg -n "tapUi|uiLong|rowRenders|footprint" scripts/mobile/perf-report.mjs` shows the
      buildSummary, formatSummaryTxt, and collectManual uses.
- [ ] COPY-PASTA 03b ticked; this file moved to `.llm/plans/completed/mobile-chip-switch-smooth/`.

## Operator checkpoint

None yet. Paste prompt 03c next.
