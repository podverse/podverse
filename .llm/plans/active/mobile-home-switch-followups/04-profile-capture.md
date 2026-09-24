# 04 — Optional: Time Profiler recorded during the gesture

## Goal

`--profile` records the Time Profiler only after the gesture is over, so it never catches the
stall. Record from **arm** to **collect** instead, and print the main-thread functions that took
the most samples. Diagnostic only: a profiled capture carries the profiler's overhead, so its
timings never go in a keep or revert decision. No app code changes; skip it if the operator does
not want a profile — nothing later depends on it.

## Preconditions

- 03a–03c done.

## Files

- `scripts/mobile/perf-report.mjs`
- `scripts/mobile/perf-report.test.mjs`

## Step 1 — Imports

Replace:

```js
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
```

with:

```js
import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
```

## Step 2 — Replace `runIosTimeProfiler`

Delete the whole `function runIosTimeProfiler(udid, outDir) { … }` (from that line through its
closing `}` just above `function collectManual`). Put this in its place:

```js
const IOS_PROFILE_STATE_PATH = join(ARTIFACTS_ROOT, 'ios-profile-state.json');
const PROFILE_TIME_LIMIT = '30s';

// Records while the operator performs the gesture; collect stops it. A profiled capture carries
// the profiler's own overhead, so its timings are diagnostic only.
function startIosProfile() {
  const udid = resolveManualIosUdid();
  const outDir = join(ARTIFACTS_ROOT, `profile-${timestamp()}`);
  mkdirSync(outDir, { recursive: true });
  const tracePath = join(outDir, 'time-profiler.trace');
  const logFd = openSync(join(outDir, 'xctrace-record.log'), 'w');
  const recorder = spawn(
    'xcrun',
    [
      'xctrace',
      'record',
      '--template',
      'Time Profiler',
      '--device',
      udid,
      '--attach',
      'PodverseNext',
      '--time-limit',
      PROFILE_TIME_LIMIT,
      '--output',
      tracePath,
    ],
    { detached: true, stdio: ['ignore', logFd, logFd] }
  );
  recorder.unref();
  closeSync(logFd);
  writeFileSync(
    IOS_PROFILE_STATE_PATH,
    `${JSON.stringify({ outDir, pid: recorder.pid, tracePath })}\n`
  );
  console.log(`Time Profiler recording for up to ${PROFILE_TIME_LIMIT}: ${tracePath}`);
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Leaf frames of main-thread samples in an `xctrace export` of the time-profile table. The export
// writes each thread, backtrace, and frame once with an id and refers back to it with ref.
export function summarizeTimeProfile(xml, limit = 15) {
  const threadFmt = new Map();
  const frameName = new Map();
  const backtraceLeaf = new Map();
  const leafCounts = new Map();
  for (const row of xml.split('<row>').slice(1)) {
    const thread = /<thread (?:id="(\d+)"[^>]*fmt="([^"]*)"|ref="(\d+)")/.exec(row);
    let fmt = '';
    if (thread !== null && thread[1] !== undefined) {
      threadFmt.set(thread[1], thread[2]);
      fmt = thread[2];
    } else if (thread !== null) {
      fmt = threadFmt.get(thread[3]) ?? '';
    }
    for (const definition of row.matchAll(/<frame id="(\d+)" name="([^"]*)"/g)) {
      frameName.set(definition[1], definition[2]);
    }
    const backtrace = /<backtrace (?:id="(\d+)"|ref="(\d+)")/.exec(row);
    let leaf = null;
    if (backtrace !== null && backtrace[2] !== undefined) {
      leaf = backtraceLeaf.get(backtrace[2]) ?? null;
    } else if (backtrace !== null) {
      const first = /<frame (?:id="(\d+)" name="([^"]*)"|ref="(\d+)")/.exec(
        row.slice(backtrace.index)
      );
      if (first !== null) {
        leaf = first[2] ?? frameName.get(first[3]) ?? null;
      }
      if (leaf !== null) {
        backtraceLeaf.set(backtrace[1], leaf);
      }
    }
    if (leaf === null || !/main thread/i.test(fmt)) {
      continue;
    }
    leafCounts.set(leaf, (leafCounts.get(leaf) ?? 0) + 1);
  }
  return [...leafCounts.entries()]
    .map(([name, samples]) => ({ name, samples }))
    .sort((a, b) => b.samples - a.samples)
    .slice(0, limit);
}

function finishIosProfile() {
  if (!existsSync(IOS_PROFILE_STATE_PATH)) {
    throw new Error('No profile is recording. Arm with --manual --arm --device ios --profile first.');
  }
  const { outDir, pid, tracePath } = JSON.parse(readFileSync(IOS_PROFILE_STATE_PATH, 'utf8'));
  rmSync(IOS_PROFILE_STATE_PATH, { force: true });
  if (typeof pid === 'number' && isProcessAlive(pid)) {
    process.kill(-pid, 'SIGINT');
  }
  for (let waited = 0; typeof pid === 'number' && isProcessAlive(pid) && waited < 90; waited += 1) {
    spawnSync('sleep', ['1']);
  }
  const exportPath = join(outDir, 'time-profile.xml');
  const exported = spawnSync(
    'xcrun',
    [
      'xctrace',
      'export',
      '--input',
      tracePath,
      '--xpath',
      '/trace-toc/run[@number="1"]/data/table[@schema="time-profile"]',
      '--output',
      exportPath,
    ],
    { encoding: 'utf8' }
  );
  if (exported.status !== 0 || !existsSync(exportPath)) {
    return { exportPath: null, top: [], tracePath };
  }
  return { exportPath, top: summarizeTimeProfile(readFileSync(exportPath, 'utf8')), tracePath };
}
```

## Step 3 — Arm starts it, collect stops it

3a. Change `function armManual(device, gesture) {` to `function armManual(device, gesture, profile) {`.
Inside it, replace the line `    markIosLogStart();` with:

```js
    markIosLogStart();
    if (profile) {
      startIosProfile();
    }
```

3b. In `main`, change `armManual(options.device, options.gesture);` to
`armManual(options.device, options.gesture, options.profile);`.

3c. In `collectManual`, replace:

```js
    if (profile) {
      const stamp = timestamp();
      const profileDir = join(ARTIFACTS_ROOT, stamp, 'profile');
      profilePaths = runIosTimeProfiler(udid, profileDir);
    }
```

with:

```js
    if (profile) {
      profilePaths = finishIosProfile();
    }
```

3d. In `parseCli`, replace:

```js
  if (profile && !(manual && collect && device === 'ios')) {
    throw new Error('--profile requires --manual --collect --device ios');
  }
```

with:

```js
  if (profile && !(manual && device === 'ios')) {
    throw new Error('--profile requires --manual --device ios, on both --arm and --collect');
  }
```

3e. In `helpText`, replace the `--profile` line with:
`'  --profile            iOS: record Time Profiler from --arm until --collect (pass it to both).',`

## Step 4 — Print it (`formatSummaryTxt`)

Directly above the final `lines.push('');` of `formatSummaryTxt` (below the footprint block from
03b) add:

```js
  if (summary.profile !== undefined && summary.profile !== null) {
    lines.push('');
    lines.push(`profile  ${summary.profile.tracePath}`);
    if (summary.profile.top.length === 0) {
      lines.push('no main-thread samples read; open the trace in Instruments');
    }
    for (const entry of summary.profile.top) {
      lines.push(`${pad(entry.samples, 6)}  ${entry.name}`);
    }
  }
```

## Step 5 — Test

Add `summarizeTimeProfile` to the test file's import list, and append:

```js
test('summarizeTimeProfile counts main-thread leaf frames through id and ref links', () => {
  const xml = [
    '<trace-query-result><node><schema name="time-profile"/>',
    '<row><thread id="1" fmt="Main Thread 0x1 (PodverseNext)"/><backtrace id="2"><frame id="3" name="resize"/><frame id="4" name="main"/></backtrace></row>',
    '<row><thread ref="1"/><backtrace ref="2"/></row>',
    '<row><thread id="5" fmt="com.facebook.react.JavaScript 0x2"/><backtrace id="6"><frame id="7" name="jsWork"/></backtrace></row>',
    '<row><thread ref="1"/><backtrace id="8"><frame ref="4"/></backtrace></row>',
    '</node></trace-query-result>',
  ].join('');
  assert.deepEqual(summarizeTimeProfile(xml), [
    { name: 'resize', samples: 2 },
    { name: 'main', samples: 1 },
  ]);
  assert.deepEqual(summarizeTimeProfile(''), []);
});
```

## Do not

- Do not debug the export parser against a real trace here. If the summary says "no main-thread
  samples read", report the trace path for the operator to open in Instruments.

## Done when

- [ ] `rg -n "runIosTimeProfiler" scripts/mobile/perf-report.mjs` finds nothing.
- [ ] Steps 1–5 applied; Prettier run on both files.
- [ ] COPY-PASTA 04 ticked; this file moved to `.llm/plans/completed/mobile-home-switch-followups/`.

## Operator checkpoint — PROF1 (optional)

**Mobile** — tests first:

```bash
node --test scripts/mobile/perf-report.test.mjs
```

Then the normal capture routine from [CHECKPOINT.md](./CHECKPOINT.md) with `--profile` on **both**
commands (the first run may ask for a password so `xctrace` can attach):

```bash
npm run mobile:perf -- --manual --arm --device ios --gesture chips --profile
npm run mobile:perf -- --manual --collect --device ios --gesture chips --profile
```

Run the first line, do the chips gesture within 30 seconds, wait 3 seconds, then run the second.
Reply `collected PROF1`. The review writes the top main-thread functions into the report and marks
the ledger row `diagnostic` (no keep or revert).
