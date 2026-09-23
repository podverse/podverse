#!/usr/bin/env node
/**
 * Run the Home chip-switch and Episodes fling perf flows, or a hand-driven capture, derive
 * stage durations from the app's tagged timeline, and write
 * .artifacts/mobile-perf/<timestamp>/summary.{json,txt}.
 *
 * Usage:
 *   node scripts/mobile/perf-report.mjs --device android
 *   node scripts/mobile/perf-report.mjs --device ios
 *   node scripts/mobile/perf-report.mjs --manual --arm --device android
 *   node scripts/mobile/perf-report.mjs --manual --collect --device android
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..', '..');
const PERF_SPANS_PATH = join(REPO_ROOT, 'apps/mobile/src/lib/perf/perfSpans.ts');
const ARTIFACTS_ROOT = join(REPO_ROOT, '.artifacts', 'mobile-perf');

export const ANDROID_AVD = 'Pixel_6_Pro_API_33_e2e';
export const IOS_SIMULATOR = 'iPhone 17 Pro E2E';
export const MOBILE_APP_ID = 'com.podverse.app.next';
export const CHIP_TAPS_PER_PASS = 4;

export const MANUAL_GESTURE =
  'from Home, tap Podcasts → Episodes → Artists → Episodes → Podcasts as fast as you can, then wait three seconds for the timeline to flush.';

const TAP_MARK = 'home.chip.tap';
const PREFS_END = 'home.prefs.end';
const LOAD_START = 'home.load.start';
const REPO_END = 'home.repo.end';
const ROWS_SET = 'home.rows.set';
const PAINT = 'home.paint';

const HOME_MEDIA_TYPES = new Set(['podcasts', 'episodes', 'artists', 'albums', 'tracks', 'clips']);

export const STAGE_NAMES = ['prefsGate', 'read', 'commit', 'paint', 'total'];
export const COUNTER_NAMES = ['prefs.getItem', 'home.row.mount', 'home.load.abandoned'];

const SPAWN_LOG = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };

export function loadPerfLogTag(sourceText = readFileSync(PERF_SPANS_PATH, 'utf8')) {
  const match = /^export const PERF_LOG_TAG = '([^']+)';$/m.exec(sourceText);
  if (match === null) {
    throw new Error(`PERF_LOG_TAG export missing from ${PERF_SPANS_PATH}`);
  }
  return match[1];
}

export const PERF_LOG_TAG = loadPerfLogTag();

export function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`percentile p${p} needs at least one sample`);
  }
  if (p < 0 || p > 100) {
    throw new Error(`percentile ${p} is out of range`);
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function stageMs(from, to, name) {
  if (from === undefined || to === undefined) {
    return null;
  }
  const delta = to - from;
  if (delta < 0) {
    throw new Error(`${name} has a negative duration`);
  }
  return delta;
}

function findTapForMark(taps, mark) {
  const detail = mark.detail;
  if (typeof detail === 'string' && HOME_MEDIA_TYPES.has(detail)) {
    for (let i = taps.length - 1; i >= 0; i -= 1) {
      if (taps[i].mediaType === detail && taps[i].at[mark.name] === undefined) {
        return taps[i];
      }
    }
    return null;
  }
  if (taps.length === 0) {
    return null;
  }
  return taps[taps.length - 1];
}

function assertTimelineMark(mark) {
  if (typeof mark !== 'object' || mark === null || typeof mark.name !== 'string') {
    throw new Error('timeline mark is missing a name');
  }
  if (typeof mark.at !== 'number' || !Number.isFinite(mark.at)) {
    throw new Error(`timeline mark ${mark.name} is missing a numeric at`);
  }
  if (typeof mark.counters !== 'object' || mark.counters === null || Array.isArray(mark.counters)) {
    throw new Error(`timeline mark ${mark.name} is missing counters`);
  }
}

function counterAt(counters, name) {
  const value = counters[name];
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`timeline counter ${name} is not a finite number`);
  }
  return value;
}

function perTapDelta(startCounters, endCounters, name) {
  const delta = counterAt(endCounters, name) - counterAt(startCounters, name);
  if (delta < 0) {
    throw new Error(`${name} counter decreased between taps`);
  }
  return delta;
}

/**
 * Cost of one tap is the next tap's counter snapshot minus this tap's. The last tap in a
 * pass has no following tap, so it closes on that pass's final home.paint. A pass that
 * never paints still keeps the tap, at a zero delta.
 */
function deriveCountersPerTap(marks, tapsPerPass = CHIP_TAPS_PER_PASS) {
  const taps = marks.filter((mark) => mark.name === TAP_MARK);
  const samples = {};
  for (const name of COUNTER_NAMES) {
    samples[name] = [];
  }

  for (let passStart = 0; passStart < taps.length; passStart += tapsPerPass) {
    const passTaps = taps.slice(passStart, passStart + tapsPerPass);
    const nextPassTap = taps[passStart + tapsPerPass];
    const windowEnd = nextPassTap === undefined ? Number.POSITIVE_INFINITY : nextPassTap.at;
    const lastTap = passTaps[passTaps.length - 1];
    let closingPaint = null;
    for (const mark of marks) {
      if (mark.name !== PAINT || mark.at < lastTap.at || mark.at >= windowEnd) {
        continue;
      }
      if (closingPaint === null || mark.at >= closingPaint.at) {
        closingPaint = mark;
      }
    }
    for (let i = 0; i < passTaps.length; i += 1) {
      const tap = passTaps[i];
      const endCounters =
        i < passTaps.length - 1 ? passTaps[i + 1].counters : (closingPaint ?? tap).counters;
      for (const name of COUNTER_NAMES) {
        samples[name].push(perTapDelta(tap.counters, endCounters, name));
      }
    }
  }

  const stats = {};
  for (const name of COUNTER_NAMES) {
    const values = samples[name];
    if (values.length === 0) {
      stats[name] = { max: null, n: 0, p50: null, p95: null };
      continue;
    }
    stats[name] = {
      max: Math.max(...values),
      n: values.length,
      p50: percentile(values, 50),
      p95: percentile(values, 95),
    };
  }
  return stats;
}

function pairTaps(marks) {
  const taps = [];
  for (const mark of marks) {
    assertTimelineMark(mark);
    if (mark.name === TAP_MARK) {
      if (typeof mark.detail !== 'string' || mark.detail.length === 0) {
        throw new Error('home.chip.tap is missing a media-type detail');
      }
      taps.push({
        at: { [TAP_MARK]: mark.at },
        earlyPaints: [],
        mediaType: mark.detail,
      });
      continue;
    }
    const target = findTapForMark(taps, mark);
    if (target === null) {
      continue;
    }
    // home.paint runs when the chip changes, while the list still shows the previous
    // media type. That stamp stays off at[PAINT] so the render that has the new rows
    // can still close the tap.
    if (mark.name === PAINT) {
      const rowsAt = target.at[ROWS_SET];
      if (rowsAt === undefined || mark.at < rowsAt) {
        target.earlyPaints.push(mark.at);
        continue;
      }
    }
    if (target.at[mark.name] === undefined) {
      target.at[mark.name] = mark.at;
    }
  }
  return taps;
}

function tapRecord(tap) {
  const abandoned = tap.at[PAINT] === undefined;
  const prefsGate = stageMs(tap.at[TAP_MARK], tap.at[PREFS_END], 'prefsGate');
  const read = stageMs(tap.at[LOAD_START], tap.at[REPO_END], 'read');
  const commit = stageMs(tap.at[REPO_END], tap.at[ROWS_SET], 'commit');
  const paint = stageMs(tap.at[ROWS_SET], tap.at[PAINT], 'paint');
  const staleMs = stageMs(tap.earlyPaints[0], tap.at[PAINT], 'staleMs');
  const record = {
    abandoned,
    earlyPaints: tap.earlyPaints.length,
    mediaType: tap.mediaType,
  };
  if (prefsGate !== null) {
    record.prefsGate = prefsGate;
  }
  if (read !== null) {
    record.read = read;
  }
  if (commit !== null) {
    record.commit = commit;
  }
  if (paint !== null) {
    record.paint = paint;
  }
  if (staleMs !== null) {
    record.staleMs = staleMs;
  }
  if (!abandoned) {
    const total = stageMs(tap.at[TAP_MARK], tap.at[PAINT], 'total');
    if (total === null) {
      throw new Error(`completed ${tap.mediaType} tap is missing home.chip.tap`);
    }
    record.total = total;
  }
  return record;
}

function stageStats(taps, stage) {
  const samples = [];
  for (const tap of taps) {
    if (tap.abandoned && stage === 'total') {
      continue;
    }
    const value = tap[stage];
    if (typeof value === 'number') {
      samples.push(value);
    }
  }
  if (samples.length === 0) {
    return { max: null, n: 0, p50: null, p95: null };
  }
  return {
    max: Math.max(...samples),
    n: samples.length,
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
  };
}

function passReport(taps, pass, label) {
  const stages = {};
  for (const name of STAGE_NAMES) {
    stages[name] = stageStats(taps, name);
  }
  let earlyPaintTaps = 0;
  for (const tap of taps) {
    if (tap.earlyPaints > 0) {
      earlyPaintTaps += 1;
    }
  }
  return {
    earlyPaint: {
      of: taps.length,
      stale: stageStats(taps, 'staleMs'),
      taps: earlyPaintTaps,
    },
    label,
    pass,
    stages,
    taps,
  };
}

function countAbandonedLoads(timeline) {
  const fromCounter = timeline.counters['home.load.abandoned'];
  if (typeof fromCounter === 'number') {
    return fromCounter;
  }
  let count = 0;
  for (const mark of timeline.marks) {
    if (mark.name === 'home.load.abandoned') {
      count += 1;
    }
  }
  return count;
}

export function deriveChipSwitchReport(timeline, options = {}) {
  if (timeline === null || typeof timeline !== 'object') {
    throw new Error('timeline is missing');
  }
  if (!Array.isArray(timeline.marks) || timeline.marks.length === 0) {
    throw new Error('timeline has no marks');
  }
  const manual = options.manual === true;
  const countersIn =
    timeline.counters !== null && typeof timeline.counters === 'object' ? timeline.counters : {};
  const paired = pairTaps(timeline.marks);
  if (paired.length === 0) {
    throw new Error('timeline has no home.chip.tap marks');
  }
  const records = paired.map(tapRecord);
  let passes;
  if (manual) {
    passes = [passReport(records, 1, 'manual')];
  } else {
    const passBuckets = [[], []];
    for (let i = 0; i < records.length; i += 1) {
      const passIndex = i < CHIP_TAPS_PER_PASS ? 0 : 1;
      passBuckets[passIndex].push(records[i]);
    }
    passes = passBuckets
      .map((taps, index) => {
        if (taps.length === 0) {
          return null;
        }
        return passReport(taps, index + 1, index === 0 ? 'cold' : 'warm');
      })
      .filter((pass) => pass !== null);
  }

  return {
    counters: {
      'home.load.abandoned': countAbandonedLoads({ counters: countersIn, marks: timeline.marks }),
      'home.row.mount':
        typeof countersIn['home.row.mount'] === 'number' ? countersIn['home.row.mount'] : 0,
      'prefs.getItem':
        typeof countersIn['prefs.getItem'] === 'number' ? countersIn['prefs.getItem'] : 0,
    },
    countersPerTap: deriveCountersPerTap(
      timeline.marks,
      manual ? Number.POSITIVE_INFINITY : CHIP_TAPS_PER_PASS
    ),
    passes,
  };
}

const CHUNK_LINE = /^(\d+)\/(\d+) (.*)$/;

function payloadAfterTag(line) {
  const tagAt = line.lastIndexOf(PERF_LOG_TAG);
  if (tagAt === -1) {
    return null;
  }
  return line.slice(tagAt + PERF_LOG_TAG.length).replace(/^\s+/, '');
}

function timelineFromJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }
  return parsed;
}

export function parseTimelineFromLog(logText) {
  if (typeof logText !== 'string' || logText.length === 0) {
    throw new Error(`device log is empty; no ${PERF_LOG_TAG} line`);
  }
  let sawTag = false;
  let lastParsed = null;
  let pending = null;

  const accept = (parsed) => {
    if (parsed !== null) {
      lastParsed = parsed;
    }
  };

  for (const line of logText.split(/\r?\n/)) {
    if (!line.includes(PERF_LOG_TAG)) {
      continue;
    }
    sawTag = true;
    const payload = payloadAfterTag(line);
    if (payload === null) {
      continue;
    }
    const chunk = CHUNK_LINE.exec(payload);
    if (chunk !== null) {
      const index = Number(chunk[1]);
      const total = Number(chunk[2]);
      const slice = chunk[3];
      if (index === 1 && total >= 1) {
        pending = { next: 2, parts: [slice], total };
        if (total === 1) {
          accept(timelineFromJson(slice));
          pending = null;
        }
      } else if (
        pending !== null &&
        index === pending.next &&
        total === pending.total &&
        index <= total
      ) {
        pending.parts.push(slice);
        pending.next += 1;
        if (index === total) {
          accept(timelineFromJson(pending.parts.join('')));
          pending = null;
        }
      } else {
        pending = null;
      }
      continue;
    }
    pending = null;
    const jsonAt = payload.indexOf('{');
    if (jsonAt === -1) {
      continue;
    }
    accept(timelineFromJson(payload.slice(jsonAt)));
  }

  if (!sawTag) {
    throw new Error(`device log has no ${PERF_LOG_TAG} line`);
  }
  if (lastParsed === null) {
    throw new Error(`${PERF_LOG_TAG} line JSON is not parseable`);
  }
  if (!Array.isArray(lastParsed.marks)) {
    throw new Error(`${PERF_LOG_TAG} payload is missing a marks array`);
  }
  if (lastParsed.marks.length === 0) {
    throw new Error(`${PERF_LOG_TAG} timeline has no marks`);
  }
  return lastParsed;
}

function framestatsColumnIndex(headerNames, headerLine, name) {
  const index = headerNames.indexOf(name);
  if (index === -1) {
    throw new Error(`gfxinfo framestats header is missing ${name}: ${headerLine}`);
  }
  return index;
}

export function parseGfxinfoFramestats(text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('gfxinfo framestats output is empty');
  }
  const start = text.indexOf('---PROFILEDATA---');
  if (start === -1) {
    throw new Error('gfxinfo framestats is missing PROFILEDATA');
  }
  const after = text.slice(start + '---PROFILEDATA---'.length);
  const end = after.indexOf('---PROFILEDATA---');
  const body = end === -1 ? after : after.slice(0, end);
  let headerLine = null;
  let headerNames = null;
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '') {
      continue;
    }
    if (headerNames === null) {
      if (/^-?\d/.test(trimmed)) {
        continue;
      }
      headerLine = trimmed.replace(/,\s*$/, '');
      headerNames = headerLine
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name !== '');
      continue;
    }
    if (/^-?\d/.test(trimmed)) {
      rows.push(trimmed);
    }
  }
  if (headerNames === null || headerLine === null) {
    throw new Error('gfxinfo framestats is missing a column header');
  }
  if (rows.length === 0) {
    throw new Error('gfxinfo framestats recorded no frames');
  }
  const intendedIndex = framestatsColumnIndex(headerNames, headerLine, 'IntendedVsync');
  const completedIndex = framestatsColumnIndex(headerNames, headerLine, 'FrameCompleted');
  const flagsIndex = headerNames.indexOf('Flags');
  const durations = [];
  let skipped = 0;
  for (const trimmed of rows) {
    const cols = trimmed.split(',');
    if (flagsIndex !== -1) {
      const flags = Number(cols[flagsIndex]);
      if (Number.isFinite(flags) && flags !== 0) {
        skipped += 1;
        continue;
      }
    }
    const intended = Number(cols[intendedIndex]);
    const completed = Number(cols[completedIndex]);
    if (!Number.isFinite(intended) || !Number.isFinite(completed) || intended === 0) {
      continue;
    }
    const ms = (completed - intended) / 1e6;
    if (ms < 0) {
      throw new Error('gfxinfo framestats has a frame that completed before IntendedVsync');
    }
    durations.push(ms);
  }
  if (durations.length === 0) {
    throw new Error('gfxinfo framestats recorded no frames');
  }
  const afterFirstTwo = durations.slice(2);
  return {
    over16ms: durations.filter((ms) => ms > 16).length,
    over32ms: durations.filter((ms) => ms > 32).length,
    over32msAfterFirstTwo: afterFirstTwo.filter((ms) => ms > 32).length,
    skipped,
    total: durations.length,
    worstMs: Math.max(...durations),
  };
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : ' '.repeat(width - text.length) + text;
}

function formatMs(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return value.toFixed(1);
}

export function formatSummaryTxt(summary) {
  const lines = [
    `device   ${summary.device}`,
    `commit   ${summary.commit}  dirty=${summary.dirty}`,
  ];
  if (summary.mode === 'manual') {
    lines.push('mode     manual');
  }
  lines.push('');
  for (const pass of summary.passes) {
    lines.push(`pass ${pass.pass} (${pass.label})`);
    lines.push(
      `${pad('stage', 10)}  ${pad('p50', 8)}  ${pad('p95', 8)}  ${pad('max', 8)}  ${pad('n', 4)}`
    );
    for (const name of STAGE_NAMES) {
      const stats = pass.stages[name];
      lines.push(
        `${pad(name, 10)}  ${pad(formatMs(stats.p50), 8)}  ${pad(formatMs(stats.p95), 8)}  ${pad(formatMs(stats.max), 8)}  ${pad(stats.n, 4)}`
      );
    }
    const abandoned = pass.taps.filter((tap) => tap.abandoned);
    const abandonedTypes = abandoned.map((tap) => tap.mediaType).join(', ');
    lines.push(
      `abandoned taps: ${abandoned.length}${abandonedTypes.length > 0 ? `  (${abandonedTypes})` : ''}`
    );
    const early = pass.earlyPaint;
    const stale = early.stale;
    lines.push(
      `early paints: ${early.taps} of ${early.of}  stale p50 ${formatMs(stale.p50)}  p95 ${formatMs(stale.p95)}  max ${formatMs(stale.max)}  n ${stale.n}`
    );
    lines.push('');
  }
  lines.push('counters');
  for (const name of COUNTER_NAMES) {
    lines.push(`${pad(name, 22)}  ${summary.counters[name]}`);
  }
  lines.push('');
  lines.push('countersPerTap');
  lines.push(
    `${pad('counter', 22)}  ${pad('p50', 8)}  ${pad('p95', 8)}  ${pad('max', 8)}  ${pad('n', 4)}`
  );
  for (const name of COUNTER_NAMES) {
    const stats = summary.countersPerTap[name];
    lines.push(
      `${pad(name, 22)}  ${pad(formatMs(stats.p50), 8)}  ${pad(formatMs(stats.p95), 8)}  ${pad(formatMs(stats.max), 8)}  ${pad(stats.n, 4)}`
    );
  }
  lines.push('');
  lines.push('frames');
  if (summary.frames === null) {
    lines.push(
      summary.mode === 'manual'
        ? 'null  (manual capture has no scripted fling)'
        : 'null  (no automatable iOS frame stats)'
    );
  } else {
    lines.push(`${pad('total', 22)}  ${summary.frames.total}`);
    lines.push(`${pad('over16ms', 22)}  ${summary.frames.over16ms}`);
    lines.push(`${pad('over32ms', 22)}  ${summary.frames.over32ms}`);
    lines.push(`${pad('over32msAfterFirstTwo', 22)}  ${summary.frames.over32msAfterFirstTwo}`);
    lines.push(`${pad('skipped', 22)}  ${summary.frames.skipped}`);
    lines.push(`${pad('worstMs', 22)}  ${formatMs(summary.frames.worstMs)}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function buildSummary({ commit, device, dirty, frames, mode, timeline }) {
  const manual = mode === 'manual';
  const derived = deriveChipSwitchReport(timeline, { manual });
  return {
    commit,
    counters: derived.counters,
    countersPerTap: derived.countersPerTap,
    device,
    dirty,
    frames,
    ...(manual ? { mode: 'manual' } : {}),
    passes: derived.passes,
  };
}

export function helpText() {
  return [
    'Usage: node scripts/mobile/perf-report.mjs --device android|ios',
    '       node scripts/mobile/perf-report.mjs --manual --arm --device android|ios',
    '       node scripts/mobile/perf-report.mjs --manual --collect --device android|ios',
    '',
    'Maestro mode runs the Home chip-switch and Episodes fling perf flows on the named',
    'E2E device, derives stage durations from the tagged timeline, and writes',
    '.artifacts/mobile-perf/<timestamp>/summary.{json,txt} with a latest symlink.',
    '',
    `  --device android   ${ANDROID_AVD} (includes gfxinfo frame stats)`,
    `  --device ios       "${IOS_SIMULATOR}" (frames: null — no automatable equivalent)`,
    '',
    'Manual mode measures a dev build started with npm run mobile:dev:perf. It uses',
    'whatever single device is attached or booted, and does not require the E2E device.',
    'The whole timeline is one pass labelled manual, and frames is null.',
    '',
    '  --manual --arm       Start a fresh log window and print the gesture to perform.',
    '  --manual --collect   Read the log, derive, and write summary.{json,txt}.',
    '                       A missing timeline exits non-zero.',
    '',
    `Gesture: ${MANUAL_GESTURE}`,
    '',
    'Missing timeline, missing marks, or missing device exits non-zero.',
    'Numbers are never invented.',
  ].join('\n');
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function runChecked(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    ...options,
  });
  if (result.error) {
    throw new Error(`${command} ${args.join(' ')} failed to start: ${result.error.message}`);
  }
  return result;
}

function resolveAdb() {
  const sdk =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    join(process.env.HOME ?? '', 'Library/Android/sdk');
  const candidate = join(sdk, 'platform-tools', 'adb');
  if (existsSync(candidate)) {
    return candidate;
  }
  return 'adb';
}

function listReadyAndroidSerials(adb) {
  const listed = runChecked(adb, ['devices']);
  if (listed.status !== 0) {
    throw new Error(`adb devices failed: ${(listed.stderr || listed.stdout).trim()}`);
  }
  const serials = [];
  for (const line of listed.stdout.split(/\r?\n/)) {
    const match = /^(\S+)\tdevice$/.exec(line);
    if (match !== null) {
      serials.push(match[1]);
    }
  }
  return serials;
}

function resolveAndroidSerial() {
  const adb = resolveAdb();
  const serials = listReadyAndroidSerials(adb);
  for (const serial of serials) {
    const nameResult = runChecked(adb, ['-s', serial, 'emu', 'avd', 'name']);
    const name = (nameResult.stdout || '').split(/\r?\n/)[0]?.trim();
    if (name === ANDROID_AVD) {
      return { adb, serial };
    }
  }
  throw new Error(
    `Missing E2E Android device ${ANDROID_AVD}. Start it from the Mobile E2E Android tab (npm run mobile:e2e:android).`
  );
}

function resolveManualAndroidSerial() {
  const adb = resolveAdb();
  const serials = listReadyAndroidSerials(adb);
  if (serials.length === 0) {
    throw new Error(
      'No attached Android device. Attach or boot exactly one before manual capture.'
    );
  }
  if (serials.length > 1) {
    throw new Error(
      `Expected exactly one attached Android device, found ${serials.length}: ${serials.join(', ')}`
    );
  }
  return { adb, serial: serials[0] };
}

function resolveIosUdid() {
  const listed = runChecked('xcrun', ['simctl', 'list', 'devices', 'booted']);
  if (listed.status !== 0) {
    throw new Error(
      `xcrun simctl list devices booted failed: ${(listed.stderr || listed.stdout).trim()}`
    );
  }
  for (const line of listed.stdout.split(/\r?\n/)) {
    if (!line.includes(IOS_SIMULATOR)) {
      continue;
    }
    const match = /\(([0-9A-Fa-f-]{36})\)/.exec(line);
    if (match !== null) {
      return match[1];
    }
  }
  throw new Error(
    `Missing booted E2E iOS simulator "${IOS_SIMULATOR}". Start it from the Mobile E2E iOS tab (npm run mobile:e2e:ios).`
  );
}

function listBootedIosSimulators() {
  const listed = runChecked('xcrun', ['simctl', 'list', 'devices', 'booted']);
  if (listed.status !== 0) {
    throw new Error(
      `xcrun simctl list devices booted failed: ${(listed.stderr || listed.stdout).trim()}`
    );
  }
  const devices = [];
  for (const line of listed.stdout.split(/\r?\n/)) {
    const match = /^\s+(.+?)\s+\(([0-9A-Fa-f-]{36})\)\s+\(Booted\)/.exec(line);
    if (match !== null) {
      devices.push({ name: match[1], udid: match[2] });
    }
  }
  return devices;
}

function resolveManualIosUdid() {
  const devices = listBootedIosSimulators();
  if (devices.length === 0) {
    throw new Error('No booted iOS simulator. Boot exactly one before manual capture.');
  }
  if (devices.length > 1) {
    const names = devices.map((device) => `${device.name} (${device.udid})`).join(', ');
    throw new Error(`Expected exactly one booted iOS simulator, found ${devices.length}: ${names}`);
  }
  return devices[0].udid;
}

function gitIdentity() {
  const rev = runChecked('git', ['rev-parse', '--short', 'HEAD']);
  if (rev.status !== 0) {
    throw new Error(`git rev-parse --short HEAD failed: ${(rev.stderr || rev.stdout).trim()}`);
  }
  const status = runChecked('git', ['status', '--porcelain']);
  if (status.status !== 0) {
    throw new Error(`git status --porcelain failed: ${(status.stderr || status.stdout).trim()}`);
  }
  return {
    commit: rev.stdout.trim(),
    dirty: status.stdout.trim().length > 0,
  };
}

function timestamp() {
  const d = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

function linkLatest(stamp) {
  mkdirSync(ARTIFACTS_ROOT, { recursive: true });
  const latestLink = join(ARTIFACTS_ROOT, 'latest');
  rmSync(latestLink, { force: true });
  symlinkSync(stamp, latestLink);
}

function runPerfFlow(device, area) {
  const remoteImages = process.env.PODVERSE_E2E_PERF_REMOTE_IMAGES === '1';
  const flowArgs = ['run', 'mobile:e2e:test', '--', '--platform', device];
  if (remoteImages) {
    // App data includes the image disk cache. Clearing it makes this capture fetch the
    // third-party URLs instead of serving art already on disk.
    flowArgs.push('--reset-data');
    console.log('Perf remote images: clearing app data before the flow so artwork is not cached.');
  }
  flowArgs.push(area);
  const result = runChecked('npm', flowArgs, {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(
      `npm run mobile:e2e:test -- --platform ${device} ${area} exited ${result.status ?? 'null'}`
    );
  }
}

function clearAndroidLog(adb, serial) {
  const cleared = runChecked(adb, ['-s', serial, 'logcat', '-c']);
  if (cleared.status !== 0) {
    throw new Error(`adb logcat -c failed: ${(cleared.stderr || cleared.stdout).trim()}`);
  }
}

const IOS_LOG_START_PATH = join(ARTIFACTS_ROOT, 'ios-log-start.txt');

function formatLogShowStart(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function markIosLogStart() {
  mkdirSync(ARTIFACTS_ROOT, { recursive: true });
  const start = formatLogShowStart(new Date(Date.now() - 2000));
  writeFileSync(IOS_LOG_START_PATH, `${start}\n`);
  return start;
}

function readIosLogStart() {
  if (!existsSync(IOS_LOG_START_PATH)) {
    throw new Error('iOS log window was not marked. Run --manual --arm before --collect.');
  }
  const start = readFileSync(IOS_LOG_START_PATH, 'utf8').trim();
  if (start.length === 0) {
    throw new Error('iOS log window start is empty. Run --manual --arm before --collect.');
  }
  return start;
}

function collectAndroidLog(adb, serial) {
  const dumped = runChecked(adb, ['-s', serial, 'logcat', '-d'], SPAWN_LOG);
  if (dumped.status !== 0) {
    throw new Error(`adb logcat -d failed: ${(dumped.stderr || dumped.stdout).trim()}`);
  }
  return dumped.stdout;
}

function collectIosLog(udid, start) {
  const dumped = runChecked(
    'xcrun',
    [
      'simctl',
      'spawn',
      udid,
      'log',
      'show',
      '--start',
      start,
      '--info',
      '--style',
      'compact',
      '--predicate',
      `process == "PodverseNext" AND subsystem == "com.facebook.react.log" AND eventMessage CONTAINS "${PERF_LOG_TAG}"`,
    ],
    SPAWN_LOG
  );
  if (dumped.status !== 0) {
    throw new Error(`xcrun simctl log show failed: ${(dumped.stderr || dumped.stdout).trim()}`);
  }
  return dumped.stdout;
}

function resetAndroidFrames(adb, serial) {
  const result = runChecked(adb, [
    '-s',
    serial,
    'shell',
    'dumpsys',
    'gfxinfo',
    MOBILE_APP_ID,
    'reset',
  ]);
  if (result.status !== 0) {
    throw new Error(`adb dumpsys gfxinfo reset failed: ${(result.stderr || result.stdout).trim()}`);
  }
}

function collectAndroidFrames(adb, serial) {
  const result = runChecked(
    adb,
    ['-s', serial, 'shell', 'dumpsys', 'gfxinfo', MOBILE_APP_ID, 'framestats'],
    SPAWN_LOG
  );
  if (result.status !== 0) {
    throw new Error(
      `adb dumpsys gfxinfo framestats failed: ${(result.stderr || result.stdout).trim()}`
    );
  }
  if (result.stdout.trim().length === 0) {
    throw new Error('adb dumpsys gfxinfo framestats returned no output');
  }
  return parseGfxinfoFramestats(result.stdout);
}

function parseCli(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { help: true };
  }
  const manual = argv.includes('--manual');
  const arm = argv.includes('--arm');
  const collect = argv.includes('--collect');
  const flagAt = argv.indexOf('--device');
  if (flagAt === -1 || argv[flagAt + 1] === undefined) {
    throw new Error('Missing --device android|ios');
  }
  const device = argv[flagAt + 1];
  if (device !== 'android' && device !== 'ios') {
    throw new Error(`Unknown --device ${device}. Expected android or ios.`);
  }
  if (arm && !manual) {
    throw new Error('--arm requires --manual');
  }
  if (collect && !manual) {
    throw new Error('--collect requires --manual');
  }
  if (manual && arm === collect) {
    throw new Error('--manual requires exactly one of --arm or --collect');
  }
  if (!manual) {
    return { device, help: false, manual: false };
  }
  return { action: arm ? 'arm' : 'collect', device, help: false, manual: true };
}

function writeReport(summary) {
  const stamp = timestamp();
  const reportDir = join(ARTIFACTS_ROOT, stamp);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const text = formatSummaryTxt(summary);
  writeFileSync(join(reportDir, 'summary.txt'), text.endsWith('\n') ? text : `${text}\n`);
  linkLatest(stamp);
  process.stdout.write(text);
  process.stdout.write(`\nWrote ${reportDir}\nLatest symlink: ${join(ARTIFACTS_ROOT, 'latest')}\n`);
}

function armManual(device) {
  if (device === 'android') {
    const android = resolveManualAndroidSerial();
    clearAndroidLog(android.adb, android.serial);
  } else {
    markIosLogStart();
  }
  console.log(MANUAL_GESTURE);
}

function collectManual(device) {
  const { commit, dirty } = gitIdentity();
  let logText;
  if (device === 'android') {
    const android = resolveManualAndroidSerial();
    logText = collectAndroidLog(android.adb, android.serial);
  } else {
    logText = collectIosLog(resolveManualIosUdid(), readIosLogStart());
  }
  const timeline = parseTimelineFromLog(logText);
  writeReport(
    buildSummary({
      commit,
      device,
      dirty,
      frames: null,
      mode: 'manual',
      timeline,
    })
  );
}

function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseCli(argv);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(helpText());
    return;
  }
  if (options.help) {
    console.log(helpText());
    return;
  }

  try {
    if (options.manual && options.action === 'arm') {
      armManual(options.device);
      return;
    }
    if (options.manual && options.action === 'collect') {
      collectManual(options.device);
      return;
    }

    const { commit, dirty } = gitIdentity();
    let android = null;
    let iosUdid = null;
    let iosLogStart = null;
    if (options.device === 'android') {
      android = resolveAndroidSerial();
      clearAndroidLog(android.adb, android.serial);
    } else {
      iosUdid = resolveIosUdid();
      iosLogStart = markIosLogStart();
    }

    runPerfFlow(options.device, 'perf-chip-switch');
    if (iosLogStart !== null) {
      // The timeline flushes 1500ms after the last mark, so collection waits that out.
      spawnSync('sleep', ['2']);
    }
    const logText = android
      ? collectAndroidLog(android.adb, android.serial)
      : collectIosLog(iosUdid, iosLogStart);
    const timeline = parseTimelineFromLog(logText);

    let frames = null;
    if (android !== null) {
      resetAndroidFrames(android.adb, android.serial);
      runPerfFlow(options.device, 'perf-scroll');
      frames = collectAndroidFrames(android.adb, android.serial);
    } else {
      runPerfFlow(options.device, 'perf-scroll');
    }

    writeReport(
      buildSummary({
        commit,
        device: options.device,
        dirty,
        frames,
        timeline,
      })
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main();
}
