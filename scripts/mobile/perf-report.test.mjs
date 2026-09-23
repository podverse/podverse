import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildSummary,
  CHIP_TAPS_PER_PASS,
  deriveChipSwitchReport,
  formatSummaryTxt,
  helpText,
  MANUAL_GESTURE,
  parseGfxinfoFramestats,
  parseTimelineFromLog,
  percentile,
  PERF_LOG_TAG,
} from './perf-report.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPORT_SOURCE = readFileSync(join(SCRIPT_DIR, 'perf-report.mjs'), 'utf8');
const PERF_SPANS_SOURCE = readFileSync(
  join(SCRIPT_DIR, '../../apps/mobile/src/lib/perf/perfSpans.ts'),
  'utf8'
);

const mark = (name, at, detail, counters = {}) => {
  const recorded = { at, counters, name };
  if (detail !== undefined) {
    recorded.detail = detail;
  }
  return recorded;
};

test('PERF_LOG_TAG is loaded from perfSpans.ts and is not retyped here', () => {
  const match = /^export const PERF_LOG_TAG = '([^']+)';$/m.exec(PERF_SPANS_SOURCE);
  assert.ok(match);
  assert.equal(PERF_LOG_TAG, match[1]);
  assert.equal(REPORT_SOURCE.includes(`'${match[1]}'`), false);
  assert.equal(REPORT_SOURCE.includes(`"${match[1]}"`), false);
});

test('percentile p95 matches nearest-rank on a known set', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(percentile(values, 50), 50);
  assert.equal(percentile(values, 95), 100);
  assert.equal(percentile([7], 50), 7);
  assert.equal(percentile([7], 95), 7);
});

test('deriveChipSwitchReport computes stage durations from an ordered mark list', () => {
  const timeline = {
    counters: { 'home.row.mount': 9, 'prefs.getItem': 4 },
    marks: [
      mark('home.chip.tap', 100, 'episodes'),
      mark('home.prefs.end', 130, 'episodes'),
      mark('home.load.start', 140, 'initial'),
      mark('home.repo.end', 200, 'episodes'),
      mark('home.rows.set', 220, 'episodes'),
      mark('home.paint', 260, 'episodes'),
    ],
  };

  const report = deriveChipSwitchReport(timeline);
  assert.equal(report.passes.length, 1);
  assert.equal(report.passes[0].pass, 1);
  assert.equal(report.passes[0].label, 'cold');
  assert.equal(report.passes[0].taps.length, 1);

  const tap = report.passes[0].taps[0];
  assert.equal(tap.abandoned, false);
  assert.equal(tap.mediaType, 'episodes');
  assert.equal(tap.prefsGate, 30);
  assert.equal(tap.read, 60);
  assert.equal(tap.commit, 20);
  assert.equal(tap.paint, 40);
  assert.equal(tap.total, 160);

  assert.equal(report.passes[0].stages.total.p50, 160);
  assert.equal(report.passes[0].stages.total.p95, 160);
  assert.equal(report.passes[0].stages.total.max, 160);
  assert.equal(report.passes[0].stages.total.n, 1);
  assert.equal(report.counters['prefs.getItem'], 4);
  assert.equal(report.counters['home.row.mount'], 9);
  assert.equal(report.counters['home.load.abandoned'], 0);
});

test('a tap with home.chip.tap and no home.paint is abandoned, not zero', () => {
  const timeline = {
    counters: {},
    marks: [
      mark('home.chip.tap', 10, 'episodes'),
      mark('home.prefs.end', 25, 'episodes'),
      mark('home.chip.tap', 30, 'artists'),
      mark('home.prefs.end', 50, 'artists'),
      mark('home.load.start', 55, 'initial'),
      mark('home.repo.end', 90, 'artists'),
      mark('home.rows.set', 100, 'artists'),
      mark('home.paint', 130, 'artists'),
    ],
  };

  const report = deriveChipSwitchReport(timeline);
  const [abandoned, completed] = report.passes[0].taps;

  assert.equal(abandoned.abandoned, true);
  assert.equal(abandoned.mediaType, 'episodes');
  assert.equal(abandoned.prefsGate, 15);
  assert.equal(Object.hasOwn(abandoned, 'total'), false);
  assert.equal(abandoned.total, undefined);

  assert.equal(completed.abandoned, false);
  assert.equal(completed.total, 100);
  assert.equal(report.passes[0].stages.total.n, 1);
  assert.equal(report.passes[0].stages.total.max, 100);
});

test('cold and warm passes stay separate at the chip-tap boundary', () => {
  const marks = [];
  for (let i = 0; i < CHIP_TAPS_PER_PASS; i += 1) {
    marks.push(mark('home.chip.tap', i * 10, 'episodes'));
  }
  marks.push(mark('home.prefs.end', 45, 'episodes'));
  marks.push(mark('home.load.start', 50, 'initial'));
  marks.push(mark('home.repo.end', 80, 'episodes'));
  marks.push(mark('home.rows.set', 90, 'episodes'));
  marks.push(mark('home.paint', 120, 'episodes'));

  for (let i = 0; i < CHIP_TAPS_PER_PASS; i += 1) {
    marks.push(mark('home.chip.tap', 1000 + i * 10, 'podcasts'));
  }
  marks.push(mark('home.prefs.end', 1040, 'podcasts'));
  marks.push(mark('home.load.start', 1050, 'initial'));
  marks.push(mark('home.repo.end', 1070, 'podcasts'));
  marks.push(mark('home.rows.set', 1080, 'podcasts'));
  marks.push(mark('home.paint', 1100, 'podcasts'));

  const report = deriveChipSwitchReport({ counters: {}, marks });
  assert.equal(report.passes.length, 2);
  assert.equal(report.passes[0].label, 'cold');
  assert.equal(report.passes[1].label, 'warm');
  assert.equal(report.passes[0].taps.length, CHIP_TAPS_PER_PASS);
  assert.equal(report.passes[1].taps.length, CHIP_TAPS_PER_PASS);
  assert.equal(report.passes[0].stages.total.max, 90);
  assert.equal(report.passes[1].stages.total.max, 70);
});

test('home.load.abandoned marks are counted when the counter is absent', () => {
  const report = deriveChipSwitchReport({
    counters: {},
    marks: [
      mark('home.chip.tap', 1, 'episodes'),
      mark('home.load.abandoned', 4, 'episodes'),
      mark('home.load.abandoned', 5, 'episodes'),
      mark('home.paint', 9, 'episodes'),
    ],
  });
  assert.equal(report.counters['home.load.abandoned'], 2);
});

test('a timeline with no marks produces an error, not an empty success', () => {
  assert.throws(() => deriveChipSwitchReport({ counters: {}, marks: [] }), /no marks/);
  assert.throws(
    () =>
      deriveChipSwitchReport({
        counters: {},
        marks: [{ at: 1, counters: {}, name: 'home.prefs.end' }],
      }),
    /no home.chip.tap/
  );
  assert.throws(() => parseTimelineFromLog(''), /empty/);
  assert.throws(() => parseTimelineFromLog('no tag here'), /has no/);
});

test('parseTimelineFromLog uses the last matching log line', () => {
  const first = `${PERF_LOG_TAG} ${JSON.stringify({ counters: {}, marks: [mark('home.chip.tap', 1, 'episodes')] })}`;
  const last = `${PERF_LOG_TAG} ${JSON.stringify({
    counters: { 'prefs.getItem': 2 },
    marks: [
      mark('home.chip.tap', 10, 'podcasts'),
      mark('home.rows.set', 25, 'podcasts'),
      mark('home.paint', 40, 'podcasts'),
    ],
  })}`;
  const timeline = parseTimelineFromLog(`noise\n${first}\n${last}\n`);
  assert.equal(timeline.marks[0].detail, 'podcasts');
  assert.equal(timeline.counters['prefs.getItem'], 2);

  const report = deriveChipSwitchReport(timeline);
  assert.equal(report.passes[0].taps[0].total, 30);
});

test('parseTimelineFromLog joins n/m slices and skips a truncated tail', () => {
  const full = {
    counters: { 'prefs.getItem': 42 },
    marks: [mark('home.chip.tap', 10, 'podcasts'), mark('home.paint', 40, 'podcasts')],
  };
  const json = JSON.stringify(full);
  const mid = Math.floor(json.length / 2);
  const older = `${PERF_LOG_TAG} ${JSON.stringify({
    counters: {},
    marks: [mark('home.chip.tap', 1, 'episodes')],
  })}`;
  const chunks = [
    `${PERF_LOG_TAG} 1/2 ${json.slice(0, mid)}`,
    `${PERF_LOG_TAG} 2/2 ${json.slice(mid)}`,
  ];
  const truncated = `${PERF_LOG_TAG} {"counters":{"prefs.getItem":1},"marks":[{"at":1`;
  const timeline = parseTimelineFromLog(['noise', older, ...chunks, truncated].join('\n'));
  assert.equal(timeline.counters['prefs.getItem'], 42);
  assert.equal(timeline.marks[0].detail, 'podcasts');
  assert.equal(timeline.marks[1].at - timeline.marks[0].at, 30);
});

test('parseTimelineFromLog rejects a log whose only perf line is truncated', () => {
  assert.throws(() => parseTimelineFromLog(`${PERF_LOG_TAG} {"marks":[{"at":1`), /not parseable/);
});

const ANDROID_12_FRAMESTATS_HEADER = [
  'Flags',
  'FrameTimelineVsyncId',
  'IntendedVsync',
  'Vsync',
  'InputEventId',
  'HandleInputStart',
  'AnimationStart',
  'PerformTraversalsStart',
  'DrawStart',
  'FrameDeadline',
  'FrameInterval',
  'FrameStartTime',
  'SyncQueued',
  'SyncStart',
  'IssueDrawCommandsStart',
  'SwapBuffers',
  'FrameCompleted',
  'DequeueBufferDuration',
  'QueueBufferDuration',
  'GpuCompleted',
  'SwapBuffersCompleted',
  'DisplayPresentTime',
  'CommandSubmissionCompleted',
].join(',');

const PRE_ANDROID_12_FRAMESTATS_HEADER = [
  'Flags',
  'IntendedVsync',
  'Vsync',
  'OldestInputEvent',
  'NewestInputEvent',
  'HandleInputStart',
  'AnimationStart',
  'PerformTraversalsStart',
  'DrawStart',
  'SyncQueued',
  'SyncStart',
  'IssueDrawCommandsStart',
  'SwapBuffers',
  'FrameCompleted',
].join(',');

function framestatsDump(header, rows) {
  return [
    'Graphics info for pid 1',
    '---PROFILEDATA---',
    `${header},`,
    ...rows,
    '---PROFILEDATA---',
  ].join('\n');
}

function framestatsRow(header, values) {
  const names = header.split(',');
  return `${names.map((name) => (values[name] !== undefined ? String(values[name]) : '0')).join(',')},`;
}

test('parseGfxinfoFramestats reads the Android 12+ column names', () => {
  const row = (intended, completed) =>
    framestatsRow(ANDROID_12_FRAMESTATS_HEADER, {
      Flags: 0,
      FrameCompleted: completed,
      FrameTimelineVsyncId: 131520,
      IntendedVsync: intended,
      SyncStart: intended + 50_000_000,
    });
  const frames = parseGfxinfoFramestats(
    framestatsDump(ANDROID_12_FRAMESTATS_HEADER, [
      row(1_000_000_000, 1_008_000_000),
      row(2_000_000_000, 2_020_000_000),
      row(3_000_000_000, 3_040_000_000),
    ])
  );
  assert.equal(frames.total, 3);
  assert.equal(frames.over16ms, 2);
  assert.equal(frames.over32ms, 1);
  assert.equal(frames.over32msAfterFirstTwo, 1);
  assert.equal(frames.skipped, 0);
  assert.equal(frames.worstMs, 40);
});

test('parseGfxinfoFramestats reads the pre-Android-12 column names', () => {
  const row = (intended, completed) =>
    framestatsRow(PRE_ANDROID_12_FRAMESTATS_HEADER, {
      Flags: 0,
      FrameCompleted: completed,
      IntendedVsync: intended,
    });
  const frames = parseGfxinfoFramestats(
    framestatsDump(PRE_ANDROID_12_FRAMESTATS_HEADER, [
      row(1_000_000_000, 1_008_000_000),
      row(2_000_000_000, 2_020_000_000),
      row(3_000_000_000, 3_040_000_000),
    ])
  );
  assert.equal(frames.total, 3);
  assert.equal(frames.over16ms, 2);
  assert.equal(frames.over32ms, 1);
  assert.equal(frames.worstMs, 40);
});

test('a framestats header missing FrameCompleted names that column', () => {
  const header = 'Flags,FrameTimelineVsyncId,IntendedVsync,Vsync';
  assert.throws(
    () =>
      parseGfxinfoFramestats(
        framestatsDump(header, [framestatsRow(header, { Flags: 0, IntendedVsync: 1_000_000_000 })])
      ),
    /missing FrameCompleted: Flags,FrameTimelineVsyncId,IntendedVsync,Vsync/
  );
});

test('a non-zero Flags row is skipped and not counted', () => {
  const row = (flags, intended, completed) =>
    framestatsRow(ANDROID_12_FRAMESTATS_HEADER, {
      Flags: flags,
      FrameCompleted: completed,
      IntendedVsync: intended,
    });
  const frames = parseGfxinfoFramestats(
    framestatsDump(ANDROID_12_FRAMESTATS_HEADER, [
      row(1, 1_000_000_000, 1_008_000_000),
      row(0, 2_000_000_000, 2_020_000_000),
    ])
  );
  assert.equal(frames.skipped, 1);
  assert.equal(frames.total, 1);
  assert.equal(frames.worstMs, 20);
});

test('over32msAfterFirstTwo ignores the first two frames', () => {
  const row = (intended, completed) =>
    framestatsRow(ANDROID_12_FRAMESTATS_HEADER, {
      Flags: 0,
      FrameCompleted: completed,
      IntendedVsync: intended,
    });
  const frames = parseGfxinfoFramestats(
    framestatsDump(ANDROID_12_FRAMESTATS_HEADER, [
      row(1_000_000_000, 1_040_000_000),
      row(2_000_000_000, 2_050_000_000),
      row(3_000_000_000, 3_008_000_000),
      row(4_000_000_000, 4_040_000_000),
    ])
  );
  assert.equal(frames.over32ms, 3);
  assert.equal(frames.over32msAfterFirstTwo, 1);
  assert.equal(frames.total, 4);
});

test('missing PROFILEDATA is an error, not zeros', () => {
  assert.throws(() => parseGfxinfoFramestats('Total frames rendered: 0'), /PROFILEDATA/);
  assert.throws(
    () => parseGfxinfoFramestats('---PROFILEDATA---\nFlags,IntendedVsync\n---PROFILEDATA---'),
    /no frames/
  );
});

test('countersPerTap is the snapshot delta between taps, and the last tap closes on the pass paint', () => {
  const snap = (prefs, rows, abandoned = 0) => ({
    'home.load.abandoned': abandoned,
    'home.row.mount': rows,
    'prefs.getItem': prefs,
  });
  const marks = [
    mark('home.chip.tap', 100, 'episodes', snap(0, 0)),
    mark('home.chip.tap', 200, 'artists', snap(2, 1)),
    mark('home.chip.tap', 300, 'episodes', snap(5, 1)),
    mark('home.chip.tap', 400, 'podcasts', snap(9, 4)),
    mark('home.rows.set', 450, 'podcasts', snap(12, 8)),
    mark('home.paint', 500, 'podcasts', snap(14, 10)),
    mark('home.chip.tap', 600, 'episodes', snap(20, 10)),
    mark('home.paint', 700, 'episodes', snap(22, 11)),
  ];

  const report = deriveChipSwitchReport({ counters: snap(22, 11), marks });
  assert.equal(report.counters['prefs.getItem'], 22);
  assert.equal(report.counters['home.row.mount'], 11);
  assert.equal(report.countersPerTap['prefs.getItem'].n, 5);
  assert.equal(report.countersPerTap['prefs.getItem'].p50, 3);
  assert.equal(report.countersPerTap['prefs.getItem'].p95, 5);
  assert.equal(report.countersPerTap['prefs.getItem'].max, 5);
  assert.equal(report.countersPerTap['home.row.mount'].p50, 1);
  assert.equal(report.countersPerTap['home.row.mount'].p95, 6);
  assert.equal(report.countersPerTap['home.row.mount'].max, 6);
  assert.equal(report.countersPerTap['home.load.abandoned'].max, 0);

  const text = formatSummaryTxt({
    commit: 'abc1234',
    counters: report.counters,
    countersPerTap: report.countersPerTap,
    device: 'android',
    dirty: false,
    frames: null,
    passes: report.passes,
  });
  assert.match(text, /countersPerTap/);
  assert.match(text, /prefs\.getItem\s+3\.0\s+5\.0\s+5\.0\s+5/);
});

test('a mark with no counters snapshot raises instead of deriving a zero delta', () => {
  assert.throws(
    () =>
      deriveChipSwitchReport({
        counters: { 'prefs.getItem': 4 },
        marks: [{ at: 1, detail: 'episodes', name: 'home.chip.tap' }],
      }),
    /missing counters/
  );
});

test('manual mode derives one pass labelled manual, with null frames', () => {
  const types = ['podcasts', 'episodes', 'artists', 'episodes', 'podcasts'];
  const marks = [];
  for (let index = 0; index < types.length; index += 1) {
    const type = types[index];
    const base = index * 1000;
    const counters = { 'prefs.getItem': index + 1 };
    marks.push(mark('home.chip.tap', base, type, counters));
    marks.push(mark('home.prefs.end', base + 10, type, counters));
    marks.push(mark('home.load.start', base + 20, 'initial', counters));
    marks.push(mark('home.repo.end', base + 40, type, counters));
    marks.push(mark('home.rows.set', base + 50, type, counters));
    marks.push(mark('home.paint', base + 80, type, counters));
  }

  const split = deriveChipSwitchReport({ counters: {}, marks });
  assert.equal(split.passes.length, 2);
  assert.equal(split.passes[0].taps.length, CHIP_TAPS_PER_PASS);

  const summary = buildSummary({
    commit: 'abc1234',
    device: 'android',
    dirty: false,
    frames: null,
    mode: 'manual',
    timeline: { counters: { 'prefs.getItem': types.length }, marks },
  });
  assert.equal(summary.mode, 'manual');
  assert.equal(summary.frames, null);
  assert.equal(summary.passes.length, 1);
  assert.equal(summary.passes[0].label, 'manual');
  assert.equal(summary.passes[0].pass, 1);
  assert.equal(summary.passes[0].taps.length, types.length);
  assert.equal(summary.countersPerTap['prefs.getItem'].n, types.length);

  const text = formatSummaryTxt(summary);
  assert.match(text, /pass 1 \(manual\)/);
  assert.match(text, /mode\s+manual/);
  assert.match(text, /null {2}\(manual capture has no scripted fling\)/);
  assert.doesNotMatch(text, /pass 2/);
  assert.doesNotMatch(text, /no automatable iOS frame stats/);

  const help = helpText();
  assert.equal(help.includes('--manual --arm'), true);
  assert.equal(help.includes('--manual --collect'), true);
  assert.equal(help.includes(MANUAL_GESTURE), true);
  assert.equal(
    MANUAL_GESTURE,
    'from Home, tap Podcasts → Episodes → Artists → Episodes → Podcasts as fast as you can, then wait three seconds for the timeline to flush.'
  );
});

test('formatSummaryTxt keeps a missing stage as an em dash, not zero', () => {
  const report = deriveChipSwitchReport({
    counters: { 'home.row.mount': 1, 'prefs.getItem': 1 },
    marks: [mark('home.chip.tap', 0, 'episodes')],
  });
  const text = formatSummaryTxt({
    commit: 'abc1234',
    counters: report.counters,
    countersPerTap: report.countersPerTap,
    device: 'ios',
    dirty: true,
    frames: null,
    passes: report.passes,
  });
  assert.match(text, /abandoned taps: 1/);
  assert.match(text, /null {2}\(no automatable iOS frame stats\)/);
  assert.match(text, /dirty=true/);
  assert.doesNotMatch(text, /total\s+0\.0\s+0\.0\s+0\.0/);
});

// Eight chip taps from a Pixel_6_Pro_API_33_e2e flush. Times are ms from the first mark.
const RECORDED_FLUSH = [
  { at: 18114, chip: 'episodes', early: 18577, rows: 18786 },
  { at: 19128, chip: 'artists', early: 19698, rows: 19838 },
  { at: 20696, chip: 'episodes', rows: 20847, paint: 20947 },
  { at: 21546, chip: 'podcasts', early: 21824, rows: 22126, paint: 22507 },
  { at: 24297, chip: 'episodes', early: 24779, rows: 24972 },
  { at: 25281, chip: 'artists', early: 25846, rows: 25978 },
  { at: 26797, chip: 'episodes', rows: 26943, paint: 27046 },
  { at: 28314, chip: 'podcasts', early: 28606, rows: 28898, paint: 29306 },
];

function recordedFlushMarks(rows = RECORDED_FLUSH) {
  const marks = [];
  for (const row of rows) {
    marks.push(mark('home.chip.tap', row.at, row.chip));
    if (row.early !== undefined) {
      marks.push(mark('home.paint', row.early, row.chip));
    }
    marks.push(mark('home.rows.set', row.rows, row.chip));
    if (row.paint !== undefined) {
      marks.push(mark('home.paint', row.paint, row.chip));
    }
  }
  return marks;
}

function deriveRecordedRows(rows) {
  return deriveChipSwitchReport({ counters: {}, marks: recordedFlushMarks(rows) });
}

test('a tap with an early paint and a later paint measures paint from rows.set', () => {
  const tap = deriveRecordedRows([RECORDED_FLUSH[3]]).passes[0].taps[0];
  assert.equal(tap.mediaType, 'podcasts');
  assert.equal(tap.abandoned, false);
  assert.equal(tap.paint, 381);
  assert.equal(tap.earlyPaints, 1);
  assert.equal(tap.staleMs, 683);
  assert.equal(tap.total, 961);
});

test('a tap whose only paint precedes rows.set is abandoned', () => {
  const tap = deriveRecordedRows([RECORDED_FLUSH[0]]).passes[0].taps[0];
  assert.equal(tap.mediaType, 'episodes');
  assert.equal(tap.abandoned, true);
  assert.equal(tap.earlyPaints, 1);
  assert.equal(Object.hasOwn(tap, 'paint'), false);
  assert.equal(Object.hasOwn(tap, 'total'), false);
  assert.equal(Object.hasOwn(tap, 'staleMs'), false);
});

test('a tap with no early paint still measures paint from rows.set', () => {
  const tap = deriveRecordedRows([RECORDED_FLUSH[2]]).passes[0].taps[0];
  assert.equal(tap.mediaType, 'episodes');
  assert.equal(tap.abandoned, false);
  assert.equal(tap.paint, 100);
  assert.equal(tap.earlyPaints, 0);
  assert.equal(Object.hasOwn(tap, 'staleMs'), false);
});

test('the recorded eight-tap flush derives without a negative paint duration', () => {
  const report = deriveRecordedRows();
  const taps = report.passes.flatMap((pass) => pass.taps);
  assert.equal(taps.length, 8);
  assert.equal(taps.filter((tap) => tap.earlyPaints > 0).length, 6);
  assert.equal(taps.filter((tap) => tap.abandoned).length, 4);
  assert.deepEqual(
    taps.filter((tap) => tap.earlyPaints === 0).map((tap) => tap.paint),
    [100, 103]
  );
  assert.deepEqual(
    taps.filter((tap) => tap.staleMs !== undefined).map((tap) => tap.staleMs),
    [683, 700]
  );
  for (const tap of taps) {
    assert.equal(tap.paint === undefined || tap.paint >= 0, true);
  }

  const summary = buildSummary({
    commit: 'abc1234',
    device: 'android',
    dirty: false,
    frames: null,
    mode: 'manual',
    timeline: { counters: {}, marks: recordedFlushMarks() },
  });
  assert.equal(summary.passes.length, 1);
  assert.equal(summary.passes[0].earlyPaint.taps, 6);
  assert.equal(summary.passes[0].earlyPaint.of, 8);
  assert.equal(summary.passes[0].earlyPaint.stale.n, 2);
  assert.equal(summary.passes[0].earlyPaint.stale.p50, 683);
  assert.equal(summary.passes[0].earlyPaint.stale.p95, 700);
  assert.equal(summary.passes[0].earlyPaint.stale.max, 700);
});

test('formatSummaryTxt prints the early-paint line with stale samples and with none', () => {
  const withStale = buildSummary({
    commit: 'abc1234',
    device: 'android',
    dirty: false,
    frames: null,
    mode: 'manual',
    timeline: { counters: {}, marks: recordedFlushMarks() },
  });
  const staleText = formatSummaryTxt(withStale);
  assert.match(
    staleText,
    /early paints: 6 of 8 {2}stale p50 683\.0 {2}p95 700\.0 {2}max 700\.0 {2}n 2/
  );
  assert.equal(staleText.includes('staleMs'), false);
  assert.equal(
    REPORT_SOURCE.includes("STAGE_NAMES = ['prefsGate', 'read', 'commit', 'paint', 'total']"),
    true
  );
  assert.equal(
    REPORT_SOURCE.includes(
      "COUNTER_NAMES = ['prefs.getItem', 'home.row.mount', 'home.load.abandoned']"
    ),
    true
  );

  const withNone = deriveChipSwitchReport({
    counters: { 'home.row.mount': 1, 'prefs.getItem': 1 },
    marks: [
      mark('home.chip.tap', 0, 'episodes'),
      mark('home.rows.set', 20, 'episodes'),
      mark('home.paint', 50, 'episodes'),
    ],
  });
  const noneText = formatSummaryTxt({
    commit: 'abc1234',
    counters: withNone.counters,
    countersPerTap: withNone.countersPerTap,
    device: 'android',
    dirty: false,
    frames: null,
    passes: withNone.passes,
  });
  assert.match(noneText, /early paints: 0 of 1 {2}stale p50 — {2}p95 — {2}max — {2}n 0/);
  assert.equal(withNone.passes[0].taps[0].paint, 30);
  assert.equal(withNone.passes[0].taps[0].earlyPaints, 0);
});

test('stageMs still throws when a stage ends before it starts', () => {
  assert.throws(
    () =>
      deriveChipSwitchReport({
        counters: {},
        marks: [mark('home.chip.tap', 100, 'episodes'), mark('home.prefs.end', 40, 'episodes')],
      }),
    /prefsGate has a negative duration/
  );
  assert.equal(REPORT_SOURCE.includes('has a negative duration'), true);
});
