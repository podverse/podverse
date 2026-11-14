import { describe, expect, it } from 'vitest';

import type { RehearsalLog, RehearsalPhase } from './rehearsalLog.js';
import { REHEARSAL_PHASES } from './rehearsalLog.js';
import type { ParsedRehearsalArgs } from './runFullRehearsalLib.js';
import type { RehearsalDeps } from './runFullRehearsalLoop.js';
import { runParsedRehearsal } from './runFullRehearsalLoop.js';

const RUN_ID = '20261113T043700Z';
const SECRET = 'postgres://user:pass@localhost/v4';

type Sink = {
  lines: string[];
  events: string[];
  progressNows: Date[];
  finished: RehearsalPhase[];
};

function emptySink(): Sink {
  return { lines: [], events: [], progressNows: [], finished: [] };
}

function args(overrides: Partial<ParsedRehearsalArgs> = {}): ParsedRehearsalArgs {
  return {
    stage: 'pilot',
    phase: null,
    resume: false,
    retryFailed: false,
    limit: null,
    runId: RUN_ID,
    ...overrides,
  };
}

function phaseNames(events: string[]): string[] {
  return events.filter((event) => REHEARSAL_PHASES.some((phase) => phase === event));
}

function zeroCounts(): {
  pending: number;
  done: number;
  failed: number;
  deferred: number;
  needs_operator: number;
} {
  return { pending: 0, done: 0, failed: 0, deferred: 0, needs_operator: 0 };
}

function storedRun(stage: ParsedRehearsalArgs['stage']): {
  stage: ParsedRehearsalArgs['stage'];
  startedAt: string;
  snapshotAt: string;
} {
  return {
    stage,
    startedAt: '2026-11-13T04:37:00.000Z',
    snapshotAt: '2026-11-13T03:00:00.000Z',
  };
}

function fakeLog(sink: Sink): RehearsalLog {
  const unused = async (): Promise<never> => {
    throw new Error('unused log method');
  };
  return {
    dir: '/tmp/rehearsal-run',
    writeRun: async () => undefined,
    writePick: async () => undefined,
    appendError: unused,
    noteProgress: async (input) => {
      sink.progressNows.push(input.now);
      return null;
    },
    finishPhase: async (input) => {
      sink.finished.push(input.phase);
      return [
        'rehearsal',
        `phase=${input.phase}`,
        `done=${input.done}`,
        `failed=${input.failed}`,
        `skipped=${input.skipped}`,
        `total=${input.total}`,
        'rate=0.0000',
        'estimate_left_s=0',
      ].join(' ');
    },
    replacePhaseCounts: async () => undefined,
    appendDeferred: unused,
    appendFix: unused,
    listDeferredClasses: unused,
    readErrorExamples: unused,
    recordDump: async () => undefined,
    recordStop: async (input) => {
      sink.events.push(`recordStop:${input.phase}`);
    },
  };
}

function phaseHandlers(
  record: (name: string) => void,
  overrides: Partial<RehearsalDeps['handlers']> = {}
): RehearsalDeps['handlers'] {
  return {
    preflight: async () => {
      record('preflight');
      return null;
    },
    identity: async () => {
      record('identity');
    },
    catalog: async () => {
      record('catalog');
    },
    library: async () => {
      record('library');
    },
    replay: async () => {
      record('replay');
    },
    membership: async () => {
      record('membership');
    },
    verify: async () => {
      record('verify');
    },
    ...overrides,
  };
}

function baseDeps(sink: Sink): RehearsalDeps {
  const record = (name: string) => {
    sink.events.push(name);
  };
  return {
    silence: {
      pause() {
        record('pause');
      },
      resume() {
        record('resume');
      },
    },
    clock: () => new Date('2026-11-13T04:37:00.000Z'),
    writeLine(line) {
      sink.lines.push(line);
      record(`line:${line}`);
    },
    runDirExists: async () => false,
    readRunFile: async () => {
      throw new Error('unread run');
    },
    readPickFile: async () => {
      throw new Error('unread pick');
    },
    openLog: async () => fakeLog(sink),
    ensureCleanDump: async () => {
      record('ensureCleanDump');
      return 'present';
    },
    cleanDumpExists: async () => {
      record('cleanDumpExists');
      return true;
    },
    disconnectOtherClients: async () => {
      record('disconnectOtherClients');
    },
    restoreClean: async () => {
      record('restoreClean');
    },
    closePools: async () => {
      record('closePools');
    },
    openPools: async () => {
      record('openPools');
    },
    dumpPhase: async () => {
      record('dumpPhase');
      return 4;
    },
    pick: async () => {
      record('pick');
      return [{ v4Id: 'abc1234', rule: 'rehearsal' }];
    },
    countPhase: async () => zeroCounts(),
    listRunnable: async () => [],
    handlers: phaseHandlers(record),
  };
}

function resumeDeps(sink: Sink, stage: ParsedRehearsalArgs['stage']): RehearsalDeps {
  const deps = baseDeps(sink);
  deps.runDirExists = async () => true;
  deps.readRunFile = async () => storedRun(stage);
  deps.readPickFile = async () => ({
    accounts: [{ v4Id: 'abc1234', rule: 'paid', email: 'person@example.com' }],
  });
  return deps;
}

describe('runParsedRehearsal', () => {
  it('calls ensureCleanDump for pilot, does not call restoreClean, runs handlers in REHEARSAL_PHASES order, and prints rehearsal clean_dump=written.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    deps.ensureCleanDump = async () => {
      sink.events.push('ensureCleanDump');
      return 'written';
    };
    await runParsedRehearsal(args({ stage: 'pilot' }), SECRET, deps);
    expect(sink.events).toContain('ensureCleanDump');
    expect(sink.events).not.toContain('restoreClean');
    expect(phaseNames(sink.events)).toEqual([...REHEARSAL_PHASES]);
    expect(sink.lines).toContain('rehearsal clean_dump=written');
    expect(sink.lines.join('\n')).not.toContain(SECRET);
    expect(sink.events).toContain('pause');
    expect(sink.events).toContain('resume');
  });

  it('prints rehearsal restore=starting stage=sample, restores, prints rehearsal restore=finished stage=sample, and only then calls preflight.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    await runParsedRehearsal(args({ stage: 'sample' }), SECRET, deps);
    const start = sink.events.indexOf('line:rehearsal restore=starting stage=sample');
    expect(sink.events.slice(start, start + 6)).toEqual([
      'line:rehearsal restore=starting stage=sample',
      'closePools',
      'disconnectOtherClients',
      'restoreClean',
      'openPools',
      'line:rehearsal restore=finished stage=sample',
    ]);
    const finished = sink.events.indexOf('line:rehearsal restore=finished stage=sample');
    const preflight = sink.events.indexOf('preflight');
    expect(finished).toBeGreaterThanOrEqual(0);
    expect(preflight).toBeGreaterThan(finished);
    expect(sink.events).not.toContain('ensureCleanDump');
  });

  it('does not restore when sample resume is true.', async () => {
    const sink = emptySink();
    await runParsedRehearsal(
      args({ stage: 'sample', resume: true }),
      SECRET,
      resumeDeps(sink, 'sample')
    );
    expect(sink.events).not.toContain('restoreClean');
    expect(sink.events).not.toContain('closePools');
    expect(sink.events).not.toContain('ensureCleanDump');
    expect(sink.lines.some((line) => line.startsWith('rehearsal restore='))).toBe(false);
  });

  it('dumps once, calls the library handler only, and does not restore when phase is library.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    let dumps = 0;
    deps.dumpPhase = async () => {
      dumps += 1;
      return 8;
    };
    await runParsedRehearsal(args({ stage: 'sample', phase: 'library' }), SECRET, deps);
    expect(dumps).toBe(1);
    expect(phaseNames(sink.events)).toEqual(['library']);
    expect(sink.events).not.toContain('restoreClean');
    expect(sink.events).not.toContain('closePools');
  });

  it('skips the handler when the phase dump is rejected.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    deps.dumpPhase = async () => {
      throw new Error('dump_failed');
    };
    await expect(runParsedRehearsal(args({ stage: 'pilot' }), SECRET, deps)).rejects.toThrow(
      'dump_failed'
    );
    expect(phaseNames(sink.events)).toEqual([]);
    expect(sink.finished).toEqual([]);
    expect(sink.events).toContain('resume');
  });

  it('prints the stop line on the library handler 200th failed note and does not call the next phase.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    deps.handlers = phaseHandlers((name) => sink.events.push(name), {
      library: async (context) => {
        sink.events.push('library');
        for (let index = 0; index < 200; index += 1) {
          await context.noteAccount({ failed: true });
        }
      },
    });
    await expect(runParsedRehearsal(args({ stage: 'pilot' }), SECRET, deps)).rejects.toThrow(
      'rehearsal_stopped'
    );
    expect(sink.lines).toContain('rehearsal stop=error_rate phase=library');
    expect(sink.events).toContain('recordStop:library');
    expect(phaseNames(sink.events)).toEqual(['preflight', 'identity', 'catalog', 'library']);
    expect(sink.finished).not.toContain('library');
    expect(sink.events).toContain('resume');
  });

  it('still calls the next phase after 199 true noteAccount outcomes.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    deps.handlers = phaseHandlers((name) => sink.events.push(name), {
      library: async (context) => {
        sink.events.push('library');
        for (let index = 0; index < 199; index += 1) {
          await context.noteAccount({ failed: true });
        }
      },
    });
    await runParsedRehearsal(args({ stage: 'pilot' }), SECRET, deps);
    expect(phaseNames(sink.events)).toEqual([...REHEARSAL_PHASES]);
    expect(sink.lines).not.toContain('rehearsal stop=error_rate phase=library');
  });

  it('still calls the next phase after 190 false outcomes and 10 true outcomes.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    deps.handlers = phaseHandlers((name) => sink.events.push(name), {
      library: async (context) => {
        sink.events.push('library');
        for (let index = 0; index < 190; index += 1) {
          await context.noteAccount({ failed: false });
        }
        for (let index = 0; index < 10; index += 1) {
          await context.noteAccount({ failed: true });
        }
      },
    });
    await runParsedRehearsal(args({ stage: 'pilot' }), SECRET, deps);
    expect(phaseNames(sink.events)).toEqual([...REHEARSAL_PHASES]);
    expect(sink.lines).not.toContain('rehearsal stop=error_rate phase=library');
  });

  it('returns the first two runnable ids when limit is 2, and passes includeFailed true when retryFailed is true.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    let includeFailed: boolean | null = null;
    let ids: string[] = [];
    deps.listRunnable = async (_phase, failed) => {
      includeFailed = failed;
      return ['id-3', 'id-1', 'id-2'];
    };
    deps.handlers = phaseHandlers((name) => sink.events.push(name), {
      library: async (context) => {
        sink.events.push('library');
        ids = await context.runnableIds('library');
      },
    });
    await runParsedRehearsal(args({ stage: 'pilot', limit: 2, retryFailed: true }), SECRET, deps);
    expect(ids).toEqual(['id-3', 'id-1']);
    expect(includeFailed).toBe(true);
  });

  it('returns an empty runnable id list when limit is 0.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    let ids: string[] = ['unused'];
    deps.listRunnable = async () => ['id-3', 'id-1'];
    deps.handlers = phaseHandlers((name) => sink.events.push(name), {
      library: async (context) => {
        sink.events.push('library');
        ids = await context.runnableIds('library');
      },
    });
    await runParsedRehearsal(args({ stage: 'pilot', limit: 0 }), SECRET, deps);
    expect(ids).toEqual([]);
  });

  it('does not call pick when resume is true.', async () => {
    const sink = emptySink();
    await runParsedRehearsal(
      args({ stage: 'pilot', resume: true }),
      SECRET,
      resumeDeps(sink, 'pilot')
    );
    expect(sink.events).not.toContain('pick');
    expect(sink.lines.join('\n')).not.toContain('@');
  });

  it('throws Missing rehearsal run. when the run directory is missing.', async () => {
    const sink = emptySink();
    await expect(
      runParsedRehearsal(args({ resume: true }), SECRET, baseDeps(sink))
    ).rejects.toThrow('Missing rehearsal run.');
    expect(sink.events).not.toContain('pause');
  });

  it('throws Rehearsal run already exists. when a new run directory already exists.', async () => {
    const sink = emptySink();
    const deps = baseDeps(sink);
    deps.runDirExists = async () => true;
    await expect(runParsedRehearsal(args({ resume: false }), SECRET, deps)).rejects.toThrow(
      'Rehearsal run already exists.'
    );
    expect(sink.events).not.toContain('pause');
  });

  it('passes runNow to pick, and a progress call uses the injected clock so moving it by 60 seconds is visible on the next progress call.', async () => {
    const sink = emptySink();
    const start = Date.parse('2026-11-13T04:37:00.000Z');
    let current = start;
    const deps = baseDeps(sink);
    deps.clock = () => new Date(current);
    const seen: { pickNow: Date | null; contextNow: Date | null } = {
      pickNow: null,
      contextNow: null,
    };
    deps.pick = async (input) => {
      sink.events.push('pick');
      seen.pickNow = input.now;
      expect(input.connectionString).toBe(SECRET);
      expect(input.stage).toBe('pilot');
      expect(input.seed).toBe(RUN_ID);
      return [{ v4Id: 'abc1234', rule: 'rehearsal' }];
    };
    deps.handlers = phaseHandlers((name) => sink.events.push(name), {
      preflight: async (context) => {
        sink.events.push('preflight');
        seen.contextNow = context.runNow;
        await context.emitProgress();
        current += 60_000;
        await context.emitProgress();
        return null;
      },
    });
    await runParsedRehearsal(args({ stage: 'pilot', runId: RUN_ID }), SECRET, deps);
    expect(seen.pickNow).toBe(seen.contextNow);
    expect(sink.progressNows).toHaveLength(2);
    const first = sink.progressNows[0];
    const second = sink.progressNows[1];
    if (first === undefined || second === undefined) {
      throw new Error('expected two progress times');
    }
    expect(second.getTime() - first.getTime()).toBe(60_000);
    expect(seen.pickNow?.getTime()).toBe(start);
    expect(sink.lines.join('\n')).not.toContain(SECRET);
  });
});
