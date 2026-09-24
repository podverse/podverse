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

/** @deprecated Prefer MANUAL_GESTURES.chips — kept for existing tests. */
export const MANUAL_GESTURE = MANUAL_GESTURES.chips;

export const CHIP_SURFACES = {
  browse: {
    abandonedCounter: null,
    chipFrame: 'browse.chip.frame',
    initial: 'browse.chip.initial',
    loadStart: 'browse.load.start',
    paint: 'browse.paint',
    pending: 'browse.chip.pending',
    prefsEnd: 'browse.prefs.end',
    repoEnd: 'browse.repo.end',
    revisit: 'browse.visit.revisit',
    rowMountCounter: null,
    rowsSet: 'browse.rows.set',
    tap: 'browse.chip.tap',
  },
  home: {
    abandonedCounter: 'home.load.abandoned',
    chipFrame: 'home.chip.frame',
    initial: 'home.chip.initial',
    loadStart: 'home.load.start',
    paint: 'home.paint',
    pending: 'home.chip.pending',
    prefsEnd: 'home.prefs.end',
    repoEnd: 'home.repo.end',
    revisit: 'home.visit.revisit',
    rowMountCounter: 'home.row.mount',
    rowsSet: 'home.rows.set',
    spinner: 'home.spinner',
    tap: 'home.chip.tap',
  },
};

const HOME_MEDIA_TYPES = new Set(['podcasts', 'episodes', 'artists', 'albums', 'tracks', 'clips']);

export const STAGE_NAMES = [
  'pending',
  'chipFrame',
  'spinner',
  'prefsGate',
  'read',
  'commit',
  'paint',
  'total',
];
export const COUNTER_NAMES = [
  'prefs.getItem',
  'home.row.mount',
  'home.load.abandoned',
  'download.action.read',
  'playback.row.read',
  'image.load',
  'home.row.render',
  'image.thumb.load',
  'image.thumb.fallback',
];

export const GESTURE_NAMES = ['chips', 'browse-chips', 'play', 'refresh', 'scroll'];

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
 * pass has no following tap, so it closes on that pass's final paint. A pass that
 * never paints still keeps the tap, at a zero delta.
 */
function deriveCountersPerTap(
  marks,
  tapsPerPass = CHIP_TAPS_PER_PASS,
  surface = CHIP_SURFACES.home
) {
  const taps = marks.filter((mark) => mark.name === surface.tap);
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
      if (mark.name !== surface.paint || mark.at < lastTap.at || mark.at >= windowEnd) {
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

function pairTaps(marks, surface = CHIP_SURFACES.home) {
  const taps = [];
  for (const mark of marks) {
    assertTimelineMark(mark);
    if (mark.name === surface.tap) {
      if (typeof mark.detail !== 'string' || mark.detail.length === 0) {
        throw new Error(`${surface.tap} is missing a media-type detail`);
      }
      taps.push({
        at: { [surface.tap]: mark.at },
        earlyPaints: [],
        mediaType: mark.detail,
      });
      continue;
    }
    const target = findTapForMark(taps, mark);
    if (target === null) {
      continue;
    }
    // paint can fire while the list still shows the previous media type. That stamp stays off
    // at[paint] so the render that has the new rows can still close the tap.
    if (mark.name === surface.paint) {
      const rowsAt = target.at[surface.rowsSet];
      // A kept list is revealed without a read, so its paint closes the tap on its own.
      const isKeptReveal =
        surface.revisit !== undefined && target.at[surface.revisit] !== undefined;
      if (!isKeptReveal && (rowsAt === undefined || mark.at < rowsAt)) {
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

function tapRecord(tap, surface = CHIP_SURFACES.home) {
  const abandoned = tap.at[surface.paint] === undefined;
  const pending = stageMs(tap.at[surface.tap], tap.at[surface.pending], 'pending');
  const chipFrame = stageMs(tap.at[surface.tap], tap.at[surface.chipFrame], 'chipFrame');
  const spinner = stageMs(tap.at[surface.tap], tap.at[surface.spinner], 'spinner');
  const prefsGate = stageMs(tap.at[surface.tap], tap.at[surface.prefsEnd], 'prefsGate');
  const read = stageMs(tap.at[surface.loadStart], tap.at[surface.repoEnd], 'read');
  const commit = stageMs(tap.at[surface.repoEnd], tap.at[surface.rowsSet], 'commit');
  const paint = stageMs(tap.at[surface.rowsSet], tap.at[surface.paint], 'paint');
  const staleMs = stageMs(tap.earlyPaints[0], tap.at[surface.paint], 'staleMs');
  const record = {
    abandoned,
    earlyPaints: tap.earlyPaints.length,
    mediaType: tap.mediaType,
  };
  if (pending !== null) {
    record.pending = pending;
  }
  if (chipFrame !== null) {
    record.chipFrame = chipFrame;
  }
  if (spinner !== null) {
    record.spinner = spinner;
  }
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
    const total = stageMs(tap.at[surface.tap], tap.at[surface.paint], 'total');
    if (total === null) {
      throw new Error(`completed ${tap.mediaType} tap is missing ${surface.tap}`);
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

export function parseFrameGapDetail(detail) {
  if (typeof detail !== 'string' || detail.length === 0) {
    return null;
  }
  const count = /(?:^|,)count=(\d+)(?:$|,)/.exec(detail);
  const over17 = /(?:^|,)over17=(\d+)(?:$|,)/.exec(detail);
  const over33 = /(?:^|,)over33=(\d+)(?:$|,)/.exec(detail);
  const maxMs = /(?:^|,)maxMs=([0-9.]+)(?:$|,)/.exec(detail);
  if (count === null || over17 === null || over33 === null || maxMs === null) {
    return null;
  }
  const frameCount = Number(count[1]);
  const over17Ms = Number(over17[1]);
  const over33Ms = Number(over33[1]);
  const maxGapMs = Number(maxMs[1]);
  if (
    !Number.isFinite(frameCount) ||
    !Number.isFinite(over17Ms) ||
    !Number.isFinite(over33Ms) ||
    !Number.isFinite(maxGapMs)
  ) {
    return null;
  }
  return { frameCount, maxGapMs, over17Ms, over33Ms };
}

function deriveNamedFrameReport(timeline, prefix) {
  if (timeline === null || typeof timeline !== 'object' || !Array.isArray(timeline.marks)) {
    return { js: [], ui: [] };
  }
  const js = [];
  const ui = [];
  for (const mark of timeline.marks) {
    if (mark.name === `${prefix}.jsframes`) {
      const parsed = parseFrameGapDetail(mark.detail);
      if (parsed !== null) {
        js.push(parsed);
      }
    }
    if (mark.name === `${prefix}.uiframes`) {
      const parsed = parseFrameGapDetail(mark.detail);
      if (parsed !== null) {
        ui.push(parsed);
      }
    }
  }
  return { js, ui };
}

export function deriveScrollFrameReport(timeline) {
  if (timeline === null || typeof timeline !== 'object' || !Array.isArray(timeline.marks)) {
    throw new Error('timeline is missing marks');
  }
  return deriveNamedFrameReport(timeline, 'scroll');
}

export function deriveChipFrameReport(timeline) {
  return deriveNamedFrameReport(timeline, 'chip');
}

export function deriveImageLoadReport(timeline) {
  if (timeline === null || typeof timeline !== 'object') {
    return { count: 0, maxEdge: null, maxEdgeSamples: [] };
  }
  const counters =
    timeline.counters !== null && typeof timeline.counters === 'object' ? timeline.counters : {};
  const count = typeof counters['image.load'] === 'number' ? counters['image.load'] : 0;
  const maxEdgeSamples = [];
  for (const mark of timeline.marks ?? []) {
    if (mark.name !== 'image.load' || typeof mark.detail !== 'string') {
      continue;
    }
    const match = /^maxEdge=(\d+(?:\.\d+)?)$/.exec(mark.detail);
    if (match !== null) {
      maxEdgeSamples.push(Number(match[1]));
    }
  }
  return {
    count,
    maxEdge: maxEdgeSamples.length === 0 ? null : Math.max(...maxEdgeSamples),
    maxEdgeSamples,
  };
}

export function derivePressinLatency(timeline, surface = CHIP_SURFACES.home) {
  if (timeline === null || typeof timeline !== 'object' || !Array.isArray(timeline.marks)) {
    return [];
  }
  const latencies = [];
  let lastPressin = null;
  for (const mark of timeline.marks) {
    if (mark.name === 'chip.pressin') {
      lastPressin = mark.at;
      continue;
    }
    if (mark.name === surface.tap && lastPressin !== null) {
      const delta = mark.at - lastPressin;
      if (delta >= 0) {
        latencies.push(delta);
      }
      lastPressin = null;
    }
  }
  return latencies;
}

export function deriveChipSwitchReport(timeline, options = {}) {
  if (timeline === null || typeof timeline !== 'object') {
    throw new Error('timeline is missing');
  }
  if (!Array.isArray(timeline.marks) || timeline.marks.length === 0) {
    throw new Error('timeline has no marks');
  }
  const manual = options.manual === true;
  const surface = options.surface === 'browse' ? CHIP_SURFACES.browse : CHIP_SURFACES.home;
  const countersIn =
    timeline.counters !== null && typeof timeline.counters === 'object' ? timeline.counters : {};
  const paired = pairTaps(timeline.marks, surface);
  if (paired.length === 0) {
    throw new Error(`timeline has no ${surface.tap} marks`);
  }
  const records = paired.map((tap) => tapRecord(tap, surface));
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

  const counters = {};
  for (const name of COUNTER_NAMES) {
    counters[name] = typeof countersIn[name] === 'number' ? countersIn[name] : 0;
  }
  counters['home.load.abandoned'] = countAbandonedLoads({
    counters: countersIn,
    marks: timeline.marks,
  });

  return {
    counters,
    countersPerTap: deriveCountersPerTap(
      timeline.marks,
      manual ? Number.POSITIVE_INFINITY : CHIP_TAPS_PER_PASS,
      surface
    ),
    image: deriveImageLoadReport(timeline),
    passes,
    chipFrames: deriveChipFrameReport(timeline),
    pressinLatencyMs: derivePressinLatency(timeline, surface),
    scroll: deriveScrollFrameReport(timeline),
    surface: surface === CHIP_SURFACES.browse ? 'browse' : 'home',
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

function tapUiLine(label, block) {
  const cells = TAP_UI_METRICS.map((name) =>
    pad(`${formatMs(block[name].p50)}/${formatMs(block[name].p95)}`, 15)
  );
  return `${pad(label, 24)}  ${pad(block.taps, 4)}  ${pad(block.keptReveals, 4)}  ${cells.join('  ')}  ${pad(block.uiOver100Taps, 6)}`;
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
  for (const pass of summary.passes ?? []) {
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
    const value = summary.counters?.[name];
    lines.push(`${pad(name, 22)}  ${value === undefined ? '—' : value}`);
  }
  lines.push('');
  lines.push('countersPerTap');
  lines.push(
    `${pad('counter', 22)}  ${pad('p50', 8)}  ${pad('p95', 8)}  ${pad('max', 8)}  ${pad('n', 4)}`
  );
  for (const name of COUNTER_NAMES) {
    const stats = summary.countersPerTap?.[name];
    if (stats === undefined) {
      lines.push(`${pad(name, 22)}  ${pad('—', 8)}  ${pad('—', 8)}  ${pad('—', 8)}  ${pad(0, 4)}`);
      continue;
    }
    lines.push(
      `${pad(name, 22)}  ${pad(formatMs(stats.p50), 8)}  ${pad(formatMs(stats.p95), 8)}  ${pad(formatMs(stats.max), 8)}  ${pad(stats.n, 4)}`
    );
  }
  lines.push('');
  lines.push('frames');
  if (summary.frames === null) {
    lines.push(
      summary.mode === 'manual'
        ? 'null  (no gfxinfo / use scroll.uiframes from the timeline)'
        : 'null  (no gfxinfo on this device; see scrollFrames)'
    );
  } else {
    lines.push(`${pad('total', 22)}  ${summary.frames.total}`);
    lines.push(`${pad('over16ms', 22)}  ${summary.frames.over16ms}`);
    lines.push(`${pad('over32ms', 22)}  ${summary.frames.over32ms}`);
    lines.push(`${pad('over32msAfterFirstTwo', 22)}  ${summary.frames.over32msAfterFirstTwo}`);
    lines.push(`${pad('skipped', 22)}  ${summary.frames.skipped}`);
    lines.push(`${pad('worstMs', 22)}  ${formatMs(summary.frames.worstMs)}`);
  }
  if (summary.chipFrames !== undefined && summary.chipFrames !== null) {
    lines.push('');
    lines.push('chipFrames');
    for (const [kind, samples] of Object.entries(summary.chipFrames)) {
      if (!Array.isArray(samples) || samples.length === 0) {
        lines.push(
          `${pad(kind, 22)}  —${kind === 'ui' ? '  (native probe not in this build)' : ''}`
        );
        continue;
      }
      const last = samples[samples.length - 1];
      lines.push(
        `${pad(kind, 22)}  n=${samples.length}  last count=${last.frameCount} over17=${last.over17Ms} over33=${last.over33Ms} maxMs=${formatMs(last.maxGapMs)}`
      );
    }
  }
  if (summary.scrollFrames !== undefined && summary.scrollFrames !== null) {
    lines.push('');
    lines.push('scrollFrames');
    for (const [kind, samples] of Object.entries(summary.scrollFrames)) {
      if (!Array.isArray(samples) || samples.length === 0) {
        lines.push(`${pad(kind, 22)}  —`);
        continue;
      }
      const last = samples[samples.length - 1];
      lines.push(
        `${pad(kind, 22)}  n=${samples.length}  last count=${last.frameCount} over17=${last.over17Ms} over33=${last.over33Ms} maxMs=${formatMs(last.maxGapMs)}`
      );
    }
  }
  if (summary.image !== undefined && summary.image !== null) {
    lines.push('');
    lines.push('images');
    lines.push(`${pad('image.load', 22)}  ${summary.image.count}`);
    lines.push(`${pad('maxEdge', 22)}  ${summary.image.maxEdge ?? '—'}`);
  }
  if (Array.isArray(summary.pressinLatencyMs) && summary.pressinLatencyMs.length > 0) {
    lines.push('');
    lines.push('pressinLatencyMs');
    lines.push(
      `p50 ${formatMs(percentile(summary.pressinLatencyMs, 50))}  p95 ${formatMs(percentile(summary.pressinLatencyMs, 95))}  n ${summary.pressinLatencyMs.length}`
    );
  }
  if (summary.tapUi !== undefined) {
    lines.push('');
    lines.push('tapUi  (finger lift → displayed frame, ms, p50/p95)');
    const header = TAP_UI_METRICS.map((name) => pad(name.replace(/Ms$/, ''), 15)).join('  ');
    lines.push(
      `${pad('group', 24)}  ${pad('taps', 4)}  ${pad('kept', 4)}  ${header}  ${pad('≥100ms', 6)}`
    );
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
    lines.push(
      `footprint  phys ${summary.footprint.physMb} MB  peak ${summary.footprint.peakMb ?? '—'} MB`
    );
  }
  lines.push('');
  return lines.join('\n');
}

export const UI_LONG_OVER_MS = 100;
const TAP_WINDOW_TAIL_MS = 3000;
const TOUCH_TO_TAP_MAX_MS = 100;
const TAP_UI_METRICS = [
  'touchLagMs',
  'chipVisibleMs',
  'spinnerVisibleMs',
  'listVisibleMs',
  'uiMaxGapMs',
];
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
    block[name] = metricStats(
      taps.map((tap) => tap[name]).filter((value) => typeof value === 'number')
    );
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
      const tap = taps.findLast(
        (entry) => entry.touchMs !== undefined && entry.touchMs === values.touchMs
      );
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

export function buildSummary({ commit, device, dirty, frames, gesture, mode, timeline }) {
  const manual = mode === 'manual';
  const surface = gesture === 'browse-chips' ? 'browse' : 'home';
  const skipChip =
    gesture === 'scroll' ||
    gesture === 'play' ||
    gesture === 'refresh' ||
    (manual &&
      Array.isArray(timeline?.marks) &&
      !timeline.marks.some(
        (mark) => mark.name === CHIP_SURFACES.home.tap || mark.name === CHIP_SURFACES.browse.tap
      ));
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
  if (skipChip) {
    return {
      commit,
      counters: timeline?.counters ?? {},
      countersPerTap: {},
      device,
      dirty,
      frames,
      gesture: gesture ?? 'scroll',
      image: deriveImageLoadReport(timeline),
      ...(manual ? { mode: 'manual' } : {}),
      passes: [],
      chipFrames: deriveChipFrameReport(timeline),
      pressinLatencyMs: [],
      scrollFrames: deriveScrollFrameReport(timeline),
      surface: null,
      rowRenders,
      uiLong,
    };
  }
  const derived = deriveChipSwitchReport(timeline, { manual, surface });
  return {
    commit,
    counters: derived.counters,
    countersPerTap: derived.countersPerTap,
    device,
    dirty,
    frames,
    gesture: gesture ?? (surface === 'browse' ? 'browse-chips' : 'chips'),
    image: derived.image,
    ...(manual ? { mode: 'manual' } : {}),
    chipFrames: derived.chipFrames,
    passes: derived.passes,
    pressinLatencyMs: derived.pressinLatencyMs,
    scrollFrames: derived.scroll,
    surface: derived.surface,
    rowRenders,
    tapUi: deriveTapUiReport(timeline, surface),
    uiLong,
  };
}

export function helpText() {
  return [
    'Usage: node scripts/mobile/perf-report.mjs --device android|ios',
    '       node scripts/mobile/perf-report.mjs --manual --arm|--collect --device android|ios [--gesture chips|browse-chips|play|refresh|scroll] [--profile]',
    '',
    'Maestro mode runs the Home chip-switch and Episodes fling perf flows on the named',
    'E2E device, derives stage durations from the tagged timeline, and writes',
    '.artifacts/mobile-perf/<timestamp>/summary.{json,txt} with a latest symlink.',
    '',
    `  --device android   ${ANDROID_AVD} (includes gfxinfo frame stats)`,
    `  --device ios       "${IOS_SIMULATOR}" (scroll.uiframes from the native probe when linked)`,
    '',
    'Manual mode measures a dev build started with npm run mobile:dev:perf (or',
    'mobile:dev:perf:noimages). It uses whatever single device is attached or booted.',
    '',
    '  --manual --arm       Start a fresh log window and print the gesture to perform.',
    '  --manual --collect   Read the log, derive, and write summary.{json,txt}.',
    '  --gesture            chips (default) | browse-chips | play | refresh | scroll',
    '  --profile            On iOS collect, also run xctrace Time Profiler against PodverseNext.',
    '',
    `chips:        ${MANUAL_GESTURES.chips}`,
    `browse-chips: ${MANUAL_GESTURES['browse-chips']}`,
    `play:         ${MANUAL_GESTURES.play}`,
    `refresh:      ${MANUAL_GESTURES.refresh}`,
    `scroll:       ${MANUAL_GESTURES.scroll}`,
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
      `process == "PodverseNext" AND eventMessage CONTAINS "${PERF_LOG_TAG}" AND (subsystem == "com.facebook.react.log" OR subsystem == "com.podverse.perf")`,
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

function parseGesture(argv) {
  const flagAt = argv.indexOf('--gesture');
  if (flagAt === -1) {
    return 'chips';
  }
  const value = argv[flagAt + 1];
  if (value === undefined || !GESTURE_NAMES.includes(value)) {
    throw new Error(`Unknown --gesture ${value ?? ''}. Expected ${GESTURE_NAMES.join('|')}.`);
  }
  return value;
}

function parseCli(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { help: true };
  }
  const manual = argv.includes('--manual');
  const arm = argv.includes('--arm');
  const collect = argv.includes('--collect');
  const profile = argv.includes('--profile');
  const gesture = parseGesture(argv);
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
  if (profile && !(manual && collect && device === 'ios')) {
    throw new Error('--profile requires --manual --collect --device ios');
  }
  if (!manual) {
    return { device, gesture, help: false, manual: false, profile: false };
  }
  return {
    action: arm ? 'arm' : 'collect',
    device,
    gesture,
    help: false,
    manual: true,
    profile,
  };
}

function writeReport(summary, timeline = null) {
  const stamp = timestamp();
  const reportDir = join(ARTIFACTS_ROOT, stamp);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  if (timeline !== null) {
    writeFileSync(join(reportDir, 'timeline.json'), `${JSON.stringify(timeline)}\n`);
  }
  const text = formatSummaryTxt(summary);
  writeFileSync(join(reportDir, 'summary.txt'), text.endsWith('\n') ? text : `${text}\n`);
  linkLatest(stamp);
  process.stdout.write(text);
  process.stdout.write(`\nWrote ${reportDir}\nLatest symlink: ${join(ARTIFACTS_ROOT, 'latest')}\n`);
}

function armManual(device, gesture) {
  if (device === 'android') {
    const android = resolveManualAndroidSerial();
    clearAndroidLog(android.adb, android.serial);
  } else {
    markIosLogStart();
  }
  console.log(MANUAL_GESTURES[gesture] ?? MANUAL_GESTURES.chips);
}

function runIosTimeProfiler(udid, outDir) {
  mkdirSync(outDir, { recursive: true });
  const tracePath = join(outDir, 'podverse-time-profiler.trace');
  const record = spawnSync(
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
      '15s',
      '--output',
      tracePath,
    ],
    { encoding: 'utf8', stdio: 'inherit' }
  );
  if (record.status !== 0) {
    throw new Error(`xctrace record failed with status ${record.status ?? 'null'}`);
  }
  const exportPath = join(outDir, 'time-profiler-export.txt');
  const exported = spawnSync('xcrun', ['xctrace', 'export', '--input', tracePath, '--toc'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  writeFileSync(exportPath, `${exported.stdout || ''}\n${exported.stderr || ''}\n`.trimStart());
  return { exportPath, tracePath };
}

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

function collectManual(device, gesture, profile) {
  const { commit, dirty } = gitIdentity();
  let logText;
  let profilePaths = null;
  let footprint = null;
  if (device === 'android') {
    const android = resolveManualAndroidSerial();
    logText = collectAndroidLog(android.adb, android.serial);
  } else {
    const udid = resolveManualIosUdid();
    if (profile) {
      const stamp = timestamp();
      const profileDir = join(ARTIFACTS_ROOT, stamp, 'profile');
      profilePaths = runIosTimeProfiler(udid, profileDir);
    }
    logText = collectIosLog(udid, readIosLogStart());
    footprint = readIosFootprint();
  }
  const timeline = parseTimelineFromLog(logText);
  const summary = buildSummary({
    commit,
    device,
    dirty,
    frames: null,
    gesture,
    mode: 'manual',
    timeline,
  });
  summary.footprint = footprint;
  if (profilePaths !== null) {
    summary.profile = profilePaths;
  }
  writeReport(summary, timeline);
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
      armManual(options.device, options.gesture);
      return;
    }
    if (options.manual && options.action === 'collect') {
      collectManual(options.device, options.gesture, options.profile);
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
    let scrollTimeline = timeline;
    if (android !== null) {
      resetAndroidFrames(android.adb, android.serial);
      clearAndroidLog(android.adb, android.serial);
      runPerfFlow(options.device, 'perf-scroll');
      frames = collectAndroidFrames(android.adb, android.serial);
      scrollTimeline = parseTimelineFromLog(collectAndroidLog(android.adb, android.serial));
    } else {
      const scrollStart = markIosLogStart();
      runPerfFlow(options.device, 'perf-scroll');
      spawnSync('sleep', ['2']);
      scrollTimeline = parseTimelineFromLog(collectIosLog(iosUdid, scrollStart));
    }

    const chipSummary = buildSummary({
      commit,
      device: options.device,
      dirty,
      frames,
      gesture: 'chips',
      timeline,
    });
    const scrollSummary = buildSummary({
      commit,
      device: options.device,
      dirty,
      frames,
      gesture: 'scroll',
      timeline: scrollTimeline,
    });
    writeReport(
      {
        ...chipSummary,
        scrollFrames: scrollSummary.scrollFrames,
      },
      timeline
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
