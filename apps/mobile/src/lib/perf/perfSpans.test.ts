import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ isE2e: true, isPerf: false }));

vi.mock('../../config/e2eEnv', () => ({
  isMobileE2eFromEnv: () => env.isE2e,
}));

vi.mock('../../config/perfEnv', () => ({
  isMobilePerfEnabledFromEnv: () => env.isPerf,
}));

describe('perfSpans', () => {
  beforeEach(() => {
    vi.resetModules();
    env.isE2e = true;
    env.isPerf = false;
  });

  const loadRecorder = async () => import('./perfSpans');

  it('records marks in order with non-decreasing timestamps when the E2E flag is on', async () => {
    const { getPerfTimeline, perfMark } = await loadRecorder();

    perfMark('first');
    perfMark('second', 'extra');

    const { marks } = getPerfTimeline();
    expect(marks.map((mark) => mark.name)).toEqual(['first', 'second']);
    expect(marks[1]?.detail).toBe('extra');
    const firstAt = marks[0]?.at;
    const secondAt = marks[1]?.at;
    expect(firstAt).toEqual(expect.any(Number));
    expect(secondAt).toEqual(expect.any(Number));
    if (firstAt !== undefined && secondAt !== undefined) {
      expect(secondAt).toBeGreaterThanOrEqual(firstAt);
    }
  });

  it('accumulates counters and omits names that were never recorded', async () => {
    const { getPerfTimeline, perfCount } = await loadRecorder();

    perfCount('home.row.mount');
    perfCount('home.row.mount');
    perfCount('prefs.getItem');

    const { counters } = getPerfTimeline();
    expect(counters).toEqual({
      'home.row.mount': 2,
      'prefs.getItem': 1,
    });
    expect(counters['never.recorded']).toBeUndefined();
  });

  it('freezes the counter snapshot on a mark at record time', async () => {
    const { getPerfTimeline, perfCount, perfMark } = await loadRecorder();

    perfCount('prefs.getItem');
    perfMark('first');
    perfCount('prefs.getItem');
    perfCount('home.row.mount');
    perfMark('second');

    const { marks } = getPerfTimeline();
    expect(marks[0]?.counters).toEqual({ 'prefs.getItem': 1 });
    expect(marks[1]?.counters).toEqual({ 'home.row.mount': 1, 'prefs.getItem': 2 });
  });

  describe('recording flag matrix', () => {
    const expectRecorded = async () => {
      const { getPerfTimeline, perfCount, perfMark } = await loadRecorder();

      perfMark('seen');
      perfCount('seen.count');

      const timeline = getPerfTimeline();
      expect(timeline.marks.map((mark) => mark.name)).toEqual(['seen']);
      expect(timeline.counters).toEqual({ 'seen.count': 1 });
    };

    it('records when only the E2E flag is on', async () => {
      env.isE2e = true;
      env.isPerf = false;
      await expectRecorded();
    });

    it('records when only the perf flag is on', async () => {
      env.isE2e = false;
      env.isPerf = true;
      await expectRecorded();
    });

    it('records when both flags are on', async () => {
      env.isE2e = true;
      env.isPerf = true;
      await expectRecorded();
    });

    it('records nothing when both flags are off', async () => {
      env.isE2e = false;
      env.isPerf = false;
      const { getPerfTimeline, perfCount, perfMark } = await loadRecorder();

      perfMark('ignored');
      perfCount('ignored.count');

      expect(getPerfTimeline()).toEqual({ counters: {}, marks: [] });
    });
  });

  it('caps the mark buffer and drops the oldest', async () => {
    const { getPerfTimeline, PERF_MARK_CAP, perfMark } = await loadRecorder();

    for (let index = 0; index <= PERF_MARK_CAP; index += 1) {
      perfMark(`mark-${index}`);
    }

    const { marks } = getPerfTimeline();
    expect(marks).toHaveLength(PERF_MARK_CAP);
    expect(marks[0]?.name).toBe('mark-1');
    expect(marks[PERF_MARK_CAP - 1]?.name).toBe(`mark-${PERF_MARK_CAP}`);
  });

  it('flushes a long timeline as short n/m lines that concatenate', async () => {
    const { flushPerfTimeline, perfMark } = await loadRecorder();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const detail = 'x'.repeat(4000);

    perfMark('home.chip.tap', detail);
    flushPerfTimeline();

    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= 1000)).toBe(true);
    const slices = lines.map((line) => {
      const match = /^PODVERSE_PERF (\d+)\/(\d+) (.*)$/.exec(line);
      expect(match).not.toBeNull();
      return match?.[3] ?? '';
    });
    expect(JSON.parse(slices.join(''))).toEqual(
      expect.objectContaining({
        marks: [expect.objectContaining({ detail, name: 'home.chip.tap' })],
      })
    );
    log.mockRestore();
  });

  it('clears both marks and counters on reset', async () => {
    const { getPerfTimeline, perfCount, perfMark, resetPerfTimeline } = await loadRecorder();

    perfMark('keep-until-reset');
    perfCount('home.row.mount');
    resetPerfTimeline();

    expect(getPerfTimeline()).toEqual({ counters: {}, marks: [] });
  });
});
