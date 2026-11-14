import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import type { RehearsalLog, RehearsalPhase, RehearsalStage } from './rehearsalLog.js';
import {
  createRunId,
  defaultRehearsalRoot,
  dumpFilePath,
  openRehearsalLog,
  redactRehearsalText,
} from './rehearsalLog.js';

const RUN_ID = '20261113T043700Z';
const START = new Date('2026-11-13T04:37:00.000Z');
const UPDATED = new Date('2026-11-13T04:53:40.000Z');
const BCRYPT = `$2b$10$${'a'.repeat(53)}`;
const PHASE: RehearsalPhase = 'library';
const STAGE: RehearsalStage = 'pilot';
const ROOTS: string[] = [];

const CLASS_NAMES = [
  'unaccounted',
  'needs_operator',
  'cap_refused',
  'email_case_collision',
  'parse_failed',
  'item_not_found',
  'db_constraint:users_pkey',
  'unexpected:TypeError',
];

afterEach(async () => {
  const pending = ROOTS.splice(0, ROOTS.length);
  await Promise.all(pending.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'v4-rehearsal-'));
  ROOTS.push(root);
  return root;
}

async function tempLog(now: Date): Promise<{ log: RehearsalLog; root: string }> {
  const root = await tempRoot();
  const log = await openRehearsalLog({ runId: RUN_ID, now, rootDir: root });
  return { log, root };
}

async function readJson(filePath: string): Promise<unknown> {
  const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
  return parsed;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected object');
  }
  return value;
}

function parseRecord(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  return record(parsed);
}

function progressText(phase: string, counts: string, rate: string, estimate: string): string {
  return `rehearsal phase=${phase} ${counts} rate=${rate} estimate_left_s=${estimate}`;
}

describe('redactRehearsalText', () => {
  it('replaces secrets and keeps a feed url and a v4 id', () => {
    expect(redactRehearsalText('see person@example.com now')).toBe('see [REDACTED_EMAIL] now');
    expect(redactRehearsalText(`hash ${BCRYPT} end`)).toBe('hash [REDACTED_HASH] end');
    expect(redactRehearsalText('db postgres://user:pass@localhost:5432/app')).toBe(
      'db [REDACTED_URL]'
    );
    expect(redactRehearsalText('get https://user:secret@cdn.example.com/a')).toBe(
      'get [REDACTED_URL]'
    );
    expect(redactRehearsalText('password=hunter2')).toBe('password=[REDACTED]');
    expect(redactRehearsalText('password: hunter2')).toBe('password=[REDACTED]');
    expect(redactRehearsalText('https://feeds.example.com/show.xml')).toBe(
      'https://feeds.example.com/show.xml'
    );
    expect(redactRehearsalText('https://feeds.example.com:443/show.xml')).toBe(
      'https://feeds.example.com:443/show.xml'
    );
    expect(redactRehearsalText('account eFv5NFx ok')).toBe('account eFv5NFx ok');
    expect(redactRehearsalText('{"v4Id":"eFv5NFx"}')).toBe('{"v4Id":"eFv5NFx"}');
    expect(redactRehearsalText('hello\nworld')).toBe('hello world');
    expect(redactRehearsalText('a'.repeat(401))).toBe(`${'a'.repeat(400)}...`);
  });

  it('turns a raw row into a dropped marker', () => {
    const row = JSON.stringify({
      email: 'person@example.com',
      name: 'Pat Example',
      passwordHash: BCRYPT,
    });
    expect(redactRehearsalText(row)).toBe('[dropped]');
    expect(redactRehearsalText(`\n${row}`)).toBe('[dropped]');
    const longRow = JSON.stringify({ email: 'a@b.co', blob: 'x'.repeat(500) });
    expect(redactRehearsalText(longRow)).toBe('[dropped]');
  });
});

describe('rehearsal paths', () => {
  it('builds a timestamp run id and the gitignored rehearsal root', async () => {
    expect(createRunId(START)).toBe(RUN_ID);
    expect(createRunId(new Date('2026-11-13T04:37:00.987Z'))).toBe(RUN_ID);
    const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url));
    const rehearsalRoot = defaultRehearsalRoot();
    expect(rehearsalRoot.endsWith(path.join('.artifacts', 'v4-full-rehearsal'))).toBe(true);
    expect(path.resolve(rehearsalRoot)).toBe(
      path.resolve(repoRoot, '.artifacts', 'v4-full-rehearsal')
    );
    const gitignore = await readFile(path.join(repoRoot, '.gitignore'), 'utf8');
    expect(gitignore.split('\n')).toContain('.artifacts/');
    const root = await tempRoot();
    expect(dumpFilePath(root, RUN_ID, PHASE)).toBe(
      path.join(root, RUN_ID, 'dumps', 'library.dump')
    );
  });

  it('rejects a run id that is not a timestamp and writes nothing', async () => {
    const root = await tempRoot();
    const parent = path.dirname(root);
    const before = new Set(await readdir(parent));
    let dumpsExisted = true;
    try {
      await readdir(path.join(parent, 'dumps'));
      dumpsExisted = true;
    } catch {
      dumpsExisted = false;
    }
    await expect(openRehearsalLog({ runId: '../', now: START, rootDir: root })).rejects.toThrow(
      /^invalid_run_id$/
    );
    await expect(
      openRehearsalLog({ runId: 'person@example.com', now: START, rootDir: root })
    ).rejects.toThrow(/^invalid_run_id$/);
    expect(await readdir(root)).toEqual([]);
    const created = (await readdir(parent)).filter((name) => !before.has(name));
    expect(created).toEqual([]);
    if (!dumpsExisted) {
      await expect(readdir(path.join(parent, 'dumps'))).rejects.toThrow();
    }
  });
});

describe('rehearsal summary', () => {
  it('writes counts without v4 ids and keeps example ids in json', async () => {
    const { log } = await tempLog(START);
    expect(log.dir).toBe(path.join(path.dirname(log.dir), RUN_ID));
    await log.finishPhase({
      phase: PHASE,
      done: 98,
      failed: 2,
      skipped: 0,
      total: 1000,
      now: UPDATED,
      phaseStartedAt: START,
    });
    await log.appendError({
      v4Id: 'eFv5NFx',
      phase: PHASE,
      group: 'clips',
      className: 'unaccounted',
      message: 'row missing',
      now: UPDATED,
    });
    await log.appendError({
      v4Id: 'abc1234',
      phase: PHASE,
      group: 'clips',
      className: 'unaccounted',
      message: 'row missing',
      now: UPDATED,
    });

    const summary = await readJson(path.join(log.dir, 'summary.json'));
    expect(summary).toEqual({
      runId: RUN_ID,
      updatedAt: UPDATED.toISOString(),
      phases: {
        library: {
          done: 98,
          failed: 2,
          skipped: 0,
          total: 1000,
          rate: 0.02,
          estimateLeftSeconds: 9000,
          phaseStartedAt: START.toISOString(),
          databaseBytes: null,
        },
      },
      classes: {
        unaccounted: { count: 2, exampleV4Ids: ['eFv5NFx', 'abc1234'] },
      },
      stop: null,
    });
    const md = await readFile(path.join(log.dir, 'summary.md'), 'utf8');
    expect(md).toBe(
      [
        '# Rehearsal summary',
        '',
        `- Run: ${RUN_ID}`,
        `- Updated: ${UPDATED.toISOString()}`,
        '',
        '## Phases',
        '',
        '| Phase | Done | Failed | Skipped | Total | Rate | Estimate left (s) | Database bytes |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '| library | 98 | 2 | 0 | 1000 | 0.0200 | 9000 |  |',
        '',
        '## Classes',
        '',
        '| Class | Count |',
        '| --- | --- |',
        '| unaccounted | 2 |',
        '',
      ].join('\n')
    );
    expect(md).not.toContain('eFv5NFx');
    expect(md).not.toContain('abc1234');
    expect(md).not.toContain('phaseStartedAt');
    expect(md).not.toContain('04:37:00');

    const errors = await readFile(path.join(log.dir, 'errors.jsonl'), 'utf8');
    const line = JSON.stringify({
      v4Id: 'eFv5NFx',
      phase: 'library',
      group: 'clips',
      class: 'unaccounted',
      message: 'row missing',
      time: UPDATED.toISOString(),
    });
    expect(errors).toBe(`${line}\n${line.replace('eFv5NFx', 'abc1234')}\n`);
  });

  it('caps example ids at three and omits caller secrets from the error log', async () => {
    const { log } = await tempLog(START);
    const row = JSON.stringify({
      email: 'person@example.com',
      name: 'Pat Example',
      passwordHash: BCRYPT,
    });
    const group: string | null = 'clips';
    const withSecrets = {
      v4Id: 'eFv5NFx',
      phase: PHASE,
      group,
      className: 'unaccounted',
      message: row,
      now: START,
      email: 'person@example.com',
      name: 'Pat Example',
      passwordHash: BCRYPT,
    };
    await log.appendError(withSecrets);
    const sentence = [
      'feed https://feeds.example.com/show.xml',
      'db postgres://user:pass@localhost/db',
      'secret https://user:secret@cdn.example.com/a',
      'mail person@example.com',
      `password=hunter2 hash ${BCRYPT}`,
    ].join(' ');
    await log.appendError({
      v4Id: 'abc1234',
      phase: PHASE,
      group,
      className: 'unaccounted',
      message: sentence,
      now: START,
    });
    await log.appendError({
      v4Id: 'def5678',
      phase: PHASE,
      group,
      className: 'unaccounted',
      message: '',
      now: START,
    });
    await log.appendError({
      v4Id: 'ghi9012',
      phase: PHASE,
      group: 'Clips',
      className: 'unaccounted',
      message: 'row missing',
      now: START,
    });

    const afterFour = record(await readJson(path.join(log.dir, 'summary.json')));
    const classes = record(afterFour.classes);
    expect(classes.unaccounted).toEqual({
      count: 4,
      exampleV4Ids: ['eFv5NFx', 'abc1234', 'def5678'],
    });

    await log.appendError({
      v4Id: 'jkl3456',
      phase: PHASE,
      group,
      className: 'unaccounted',
      message: 'row missing',
      now: START,
    });
    const afterFive = record(await readJson(path.join(log.dir, 'summary.json')));
    expect(record(afterFive.classes).unaccounted).toEqual({
      count: 5,
      exampleV4Ids: ['eFv5NFx', 'abc1234', 'def5678'],
    });

    const examples = await log.readErrorExamples('unaccounted');
    expect(examples.map((line) => line.v4Id)).toEqual(['eFv5NFx', 'abc1234', 'def5678']);
    expect(examples[0]?.message).toBe('[dropped]');
    expect(examples[2]?.message).toBe('empty');

    const raw = await readFile(path.join(log.dir, 'errors.jsonl'), 'utf8');
    const lines = raw.split('\n').filter((line) => line !== '');
    expect(lines).toHaveLength(5);
    const redacted =
      'feed https://feeds.example.com/show.xml db [REDACTED_URL] secret [REDACTED_URL] ' +
      'mail [REDACTED_EMAIL] password=[REDACTED] hash [REDACTED_HASH]';
    expect(examples[1]?.message).toBe(redacted);
    for (const line of lines) {
      const parsed = parseRecord(line);
      expect(Object.keys(parsed)).toEqual(['v4Id', 'phase', 'group', 'class', 'message', 'time']);
      expect(line).toBe(JSON.stringify(parsed));
    }
    expect(parseRecord(lines[3] ?? '').group).toBeNull();
    expect(raw).not.toContain('person@example.com');
    expect(raw).not.toContain('Pat Example');
    expect(raw).not.toContain('passwordHash');
    expect(raw).not.toContain(BCRYPT);
    expect(raw).not.toContain('hunter2');
    const md = await readFile(path.join(log.dir, 'summary.md'), 'utf8');
    expect(md).toContain('| unaccounted | 5 |');
    expect(md).not.toContain('eFv5NFx');
    expect(md).not.toContain('abc1234');
    expect(md).not.toContain('def5678');
    expect(md).not.toContain('ghi9012');
    expect(md).not.toContain('jkl3456');
    expect(md).not.toContain('person@example.com');
  });

  it('keeps the allowed class names and drops a rejected class and email id', async () => {
    const { log } = await tempLog(START);
    for (const [index, className] of CLASS_NAMES.entries()) {
      await log.appendError({
        v4Id: `id${index}`,
        phase: PHASE,
        group: 'clips',
        className,
        message: 'row missing',
        now: START,
      });
    }
    const summary = record(await readJson(path.join(log.dir, 'summary.json')));
    expect(Object.keys(record(summary.classes))).toEqual([
      'cap_refused',
      'db_constraint:users_pkey',
      'email_case_collision',
      'item_not_found',
      'needs_operator',
      'parse_failed',
      'unaccounted',
      'unexpected:TypeError',
    ]);
    const raw = await readFile(path.join(log.dir, 'errors.jsonl'), 'utf8');
    const stored = raw
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => parseRecord(line).class);
    expect(stored).toEqual(CLASS_NAMES);

    await log.appendError({
      v4Id: 'person@example.com',
      phase: PHASE,
      group: 'clips',
      className: 'NOT A CLASS',
      message: 'row missing',
      now: START,
    });
    await log.appendError({
      v4Id: 'okId',
      phase: PHASE,
      group: 'clips',
      className: 'a'.repeat(81),
      message: 'row missing',
      now: START,
    });
    await log.appendError({
      v4Id: 'okId2',
      phase: PHASE,
      group: 'clips',
      className: 'a'.repeat(80),
      message: 'row missing',
      now: START,
    });
    const later = await readFile(path.join(log.dir, 'errors.jsonl'), 'utf8');
    expect(later).toContain('"class":"unexpected:invalid_class"');
    expect(later).toContain(`"class":"${'a'.repeat(80)}"`);
    expect(later).not.toContain('NOT A CLASS');
    expect(later).not.toContain('a'.repeat(81));
    expect(later).not.toContain('person@example.com');
    expect(later).toContain('"v4Id":"invalid-id"');
  });
});

describe('rehearsal progress', () => {
  it('emits a start line, every hundred accounts, a minute, and the phase finish', async () => {
    const { log } = await tempLog(START);
    await log.appendError({
      v4Id: 'eFv5NFx',
      phase: PHASE,
      group: 'clips',
      className: 'unaccounted',
      message: 'row missing',
      now: START,
    });
    const startLine = await log.noteProgress({
      phase: PHASE,
      done: 0,
      failed: 0,
      skipped: 0,
      total: 1000,
      now: START,
      phaseStartedAt: START,
    });
    expect(startLine).toBe(
      progressText('library', 'done=0 failed=0 skipped=0 total=1000', '0.0000', 'unknown')
    );
    expect(startLine).not.toContain('eFv5NFx');
    const summaryPath = path.join(log.dir, 'summary.json');
    expect(await readJson(summaryPath)).toMatchObject({ phases: { library: { done: 0 } } });

    for (let done = 1; done <= 99; done += 1) {
      const line = await log.noteProgress({
        phase: PHASE,
        done,
        failed: 0,
        skipped: 0,
        total: 1000,
        now: START,
        phaseStartedAt: START,
      });
      expect(line).toBeNull();
    }
    expect(await readJson(summaryPath)).toMatchObject({ phases: { library: { done: 0 } } });

    const atHundred = await log.noteProgress({
      phase: PHASE,
      done: 100,
      failed: 0,
      skipped: 0,
      total: 1000,
      now: START,
      phaseStartedAt: START,
    });
    expect(atHundred).toBe(
      progressText('library', 'done=100 failed=0 skipped=0 total=1000', '0.0000', 'unknown')
    );
    expect(atHundred).not.toContain('eFv5NFx');

    const minute = new Date(START.getTime() + 60_000);
    const onMinute = await log.noteProgress({
      phase: PHASE,
      done: 100,
      failed: 0,
      skipped: 0,
      total: 1000,
      now: minute,
      phaseStartedAt: START,
      databaseBytes: 2048,
    });
    expect(onMinute).toBe(
      progressText('library', 'done=100 failed=0 skipped=0 total=1000', '0.0000', '540')
    );
    expect(onMinute).not.toContain('2048');
    expect(await readJson(summaryPath)).toMatchObject({
      phases: { library: { done: 100, databaseBytes: 2048 } },
    });

    const finished = await log.finishPhase({
      phase: PHASE,
      done: 98,
      failed: 2,
      skipped: 0,
      total: 1000,
      now: UPDATED,
      phaseStartedAt: START,
    });
    expect(finished).toBe(
      progressText('library', 'done=98 failed=2 skipped=0 total=1000', '0.0200', '9000')
    );
    expect(finished).not.toContain('eFv5NFx');
    expect(await readJson(summaryPath)).toMatchObject({
      phases: { library: { done: 98, failed: 2, databaseBytes: 2048 } },
    });

    const catalog = await log.noteProgress({
      phase: 'catalog',
      done: 0,
      failed: 0,
      skipped: 0,
      total: 10,
      now: UPDATED,
      phaseStartedAt: UPDATED,
    });
    expect(catalog).toBe(
      progressText('catalog', 'done=0 failed=0 skipped=0 total=10', '0.0000', 'unknown')
    );
    const phases = record(record(await readJson(summaryPath)).phases);
    expect(Object.keys(phases)).toEqual(['catalog', 'library']);
  });

  it('does not emit again just because the process opened the same run', async () => {
    const { log, root } = await tempLog(START);
    await log.appendError({
      v4Id: 'eFv5NFx',
      phase: PHASE,
      group: 'clips',
      className: 'unaccounted',
      message: 'row missing',
      now: START,
    });
    await log.replacePhaseCounts({
      phase: PHASE,
      done: 40,
      failed: 0,
      skipped: 0,
      total: 100,
      now: START,
      phaseStartedAt: START,
      databaseBytes: 100,
    });
    const quiet = await log.noteProgress({
      phase: PHASE,
      done: 41,
      failed: 0,
      skipped: 0,
      total: 100,
      now: new Date(START.getTime() + 1000),
      phaseStartedAt: UPDATED,
    });
    expect(quiet).toBeNull();
    expect(await readJson(path.join(log.dir, 'summary.json'))).toMatchObject({
      phases: {
        library: { done: 40, phaseStartedAt: START.toISOString(), databaseBytes: 100 },
      },
      classes: { unaccounted: { count: 1, exampleV4Ids: ['eFv5NFx'] } },
    });

    const timed = await log.noteProgress({
      phase: PHASE,
      done: 41,
      failed: 0,
      skipped: 0,
      total: 100,
      now: new Date(START.getTime() + 60_000),
      phaseStartedAt: UPDATED,
    });
    expect(timed).toBe(
      progressText('library', 'done=41 failed=0 skipped=0 total=100', '0.0000', '86')
    );
    expect(timed).not.toContain('eFv5NFx');
    expect(await readJson(path.join(log.dir, 'summary.json'))).toMatchObject({
      phases: { library: { done: 41, phaseStartedAt: START.toISOString(), databaseBytes: 100 } },
    });

    await log.replacePhaseCounts({
      phase: PHASE,
      done: 41,
      failed: 0,
      skipped: 0,
      total: 100,
      now: UPDATED,
      phaseStartedAt: UPDATED,
      databaseBytes: null,
    });
    expect(await readJson(path.join(log.dir, 'summary.json'))).toMatchObject({
      phases: { library: { databaseBytes: null, phaseStartedAt: START.toISOString() } },
      classes: { unaccounted: { count: 1 } },
    });

    const again = await openRehearsalLog({ runId: RUN_ID, now: UPDATED, rootDir: root });
    await again.appendError({
      v4Id: 'abc1234',
      phase: PHASE,
      group: 'clips',
      className: 'unaccounted',
      message: 'row missing',
      now: UPDATED,
    });
    expect(await readJson(path.join(log.dir, 'summary.json'))).toMatchObject({
      phases: { library: { phaseStartedAt: START.toISOString() } },
      classes: { unaccounted: { count: 2, exampleV4Ids: ['eFv5NFx', 'abc1234'] } },
    });
  });

  it('rejects counts that do not fit the total before writing', async () => {
    const { log } = await tempLog(START);
    expect(() =>
      log.noteProgress({
        phase: PHASE,
        done: 5,
        failed: 0,
        skipped: 0,
        total: 4,
        now: START,
        phaseStartedAt: START,
      })
    ).toThrow(/^invalid_counts$/);
    await expect(readFile(path.join(log.dir, 'summary.json'), 'utf8')).rejects.toThrow();
  });

  it('keeps an existing error log when the summary cannot be loaded', async () => {
    const { log, root } = await tempLog(START);
    await writeFile(path.join(log.dir, 'summary.json'), '{', 'utf8');
    await writeFile(path.join(log.dir, 'errors.jsonl'), '{"kept":true}\n', 'utf8');
    const again = await openRehearsalLog({ runId: RUN_ID, now: START, rootDir: root });
    await again.appendError({
      v4Id: 'eFv5NFx',
      phase: PHASE,
      group: 'clips',
      className: 'unaccounted',
      message: 'row missing',
      now: START,
    });
    const errors = await readFile(path.join(log.dir, 'errors.jsonl'), 'utf8');
    expect(errors.startsWith('{"kept":true}\n')).toBe(true);
    expect(await readJson(path.join(log.dir, 'summary.json'))).toMatchObject({
      classes: { unaccounted: { count: 1 } },
    });

    const other = await tempLog(START);
    await writeFile(
      path.join(other.log.dir, 'summary.json'),
      `${JSON.stringify({
        runId: '20260101T000000Z',
        updatedAt: START.toISOString(),
        phases: {},
        classes: { unaccounted: { count: 9, exampleV4Ids: ['eFv5NFx'] } },
        stop: null,
      })}\n`,
      'utf8'
    );
    const reopened = await openRehearsalLog({ runId: RUN_ID, now: START, rootDir: other.root });
    await reopened.appendError({
      v4Id: 'abc1234',
      phase: PHASE,
      group: null,
      className: 'unaccounted',
      message: 'row missing',
      now: START,
    });
    expect(await readJson(path.join(other.log.dir, 'summary.json'))).toMatchObject({
      runId: RUN_ID,
      classes: { unaccounted: { count: 1, exampleV4Ids: ['abc1234'] } },
    });
  });
});

describe('rehearsal run files', () => {
  it('rewrites run, pick, and dump metadata and records a stop', async () => {
    const { log } = await tempLog(START);
    const later = new Date(START.getTime() + 5000);
    await log.writeRun({
      stage: STAGE,
      phase: 'identity',
      snapshotAt: START.toISOString(),
      now: START,
      flags: { resume: false, retryFailed: false, limit: 0 },
    });
    expect(await readJson(path.join(log.dir, 'run.json'))).toMatchObject({
      phase: 'identity',
      snapshotAt: START.toISOString(),
      startedAt: START.toISOString(),
      flags: { resume: false, retryFailed: false, limit: 0 },
    });
    await log.writeRun({
      stage: STAGE,
      phase: 'catalog',
      snapshotAt: 'postgres://user:pass@localhost/db',
      now: later,
      flags: { resume: true, retryFailed: false, limit: -3 },
    });
    expect(await readJson(path.join(log.dir, 'run.json'))).toEqual({
      runId: RUN_ID,
      stage: 'pilot',
      phase: 'catalog',
      snapshotAt: null,
      startedAt: START.toISOString(),
      flags: { resume: true, retryFailed: false, limit: null },
    });

    await log.writePick({
      stage: STAGE,
      now: START,
      accounts: [
        { v4Id: 'eFv5NFx', rule: 'rehearsal account' },
        { v4Id: 'bad id', rule: '***' },
      ],
    });
    const pick = record(await readJson(path.join(log.dir, 'pick.json')));
    expect(pick).toEqual({
      stage: 'pilot',
      pickedAt: START.toISOString(),
      accounts: [
        { v4Id: 'eFv5NFx', rule: 'rehearsal account' },
        { v4Id: 'invalid-id', rule: 'unknown' },
      ],
    });
    const accounts = pick.accounts;
    if (!Array.isArray(accounts) || accounts[0] === undefined) {
      throw new Error('expected accounts');
    }
    expect(Object.keys(record(accounts[0]))).toEqual(['v4Id', 'rule']);

    await log.recordDump({ phase: 'preflight', bytes: 1234, now: START });
    await log.recordDump({ phase: 'preflight', bytes: 50, now: later });
    await log.recordDump({ phase: 'identity', bytes: -1, now: later });
    expect(await readJson(path.join(log.dir, 'dumps', 'manifest.json'))).toEqual({
      dumps: [
        { phase: 'preflight', file: 'preflight.dump', bytes: 50, time: later.toISOString() },
        { phase: 'identity', file: 'identity.dump', bytes: null, time: later.toISOString() },
      ],
    });

    await log.finishPhase({
      phase: PHASE,
      done: 9,
      failed: 1,
      skipped: 0,
      total: 10,
      now: later,
      phaseStartedAt: START,
    });
    await log.recordStop({ phase: PHASE, now: later });
    await log.recordStop({ phase: PHASE, now: UPDATED });
    const summary = record(await readJson(path.join(log.dir, 'summary.json')));
    expect(summary.stop).toEqual({
      phase: 'library',
      reason: 'error_rate',
      at: UPDATED.toISOString(),
    });
    const md = await readFile(path.join(log.dir, 'summary.md'), 'utf8');
    const runAt = md.indexOf(`- Run: ${RUN_ID}`);
    const stopAt = md.indexOf('- Stop: library error_rate');
    const updatedAt = md.indexOf(`- Updated: ${UPDATED.toISOString()}`);
    expect(runAt).toBeGreaterThanOrEqual(0);
    expect(stopAt).toBeGreaterThan(runAt);
    expect(updatedAt).toBeGreaterThan(stopAt);
  });

  it('writes two error lines without interleaving them', async () => {
    const { log } = await tempLog(START);
    const group: string | null = null;
    const first = log.appendError({
      v4Id: 'aaaa111',
      phase: PHASE,
      group,
      className: 'unaccounted',
      message: 'one',
      now: START,
    });
    const second = log.appendError({
      v4Id: 'bbbb222',
      phase: PHASE,
      group,
      className: 'item_not_found',
      message: 'two',
      now: START,
    });
    await Promise.all([first, second]);
    const lines = (await readFile(path.join(log.dir, 'errors.jsonl'), 'utf8'))
      .split('\n')
      .filter((line) => line !== '');
    expect(lines).toHaveLength(2);
    expect(parseRecord(lines[0] ?? '').message).toBe('one');
    expect(parseRecord(lines[1] ?? '').message).toBe('two');
  });
});

describe('deferred and fixes', () => {
  it('appends one deferred entry per class and reads three error examples', async () => {
    const { log } = await tempLog(START);
    const refused = await log.appendDeferred({
      className: 'unaccounted',
      count: -1,
      saw: 'x',
      why: 'y',
      exampleV4Ids: [],
    });
    expect(refused).toEqual({ appended: false });
    await expect(readFile(path.join(log.dir, 'deferred.md'), 'utf8')).rejects.toThrow();

    const first = await log.appendDeferred({
      className: 'unaccounted',
      count: 12,
      saw: 'saw person@example.com',
      why: 'why postgres://user:pass@localhost/db',
      exampleV4Ids: ['eFv5NFx', 'abc1234', 'def5678', 'ghi9012'],
    });
    expect(first).toEqual({ appended: true });
    const deferredPath = path.join(log.dir, 'deferred.md');
    const deferred = await readFile(deferredPath, 'utf8');
    expect(deferred).toBe(
      [
        '# Deferred',
        '',
        '## unaccounted',
        '',
        '- Count: 12',
        '- Saw: saw [REDACTED_EMAIL]',
        '- Why: why [REDACTED_URL]',
        '- Examples: eFv5NFx, abc1234, def5678',
        '',
        '',
      ].join('\n')
    );
    expect(deferred).not.toContain('person@example.com');
    const second = await log.appendDeferred({
      className: 'unaccounted',
      count: 99,
      saw: 'again',
      why: 'again',
      exampleV4Ids: ['zzzzzzz'],
    });
    expect(second).toEqual({ appended: false });
    expect(await readFile(deferredPath, 'utf8')).toBe(deferred);

    const other = await log.appendDeferred({
      className: 'item_not_found',
      count: 1,
      saw: 'missing',
      why: 'gone',
      exampleV4Ids: ['abc1234'],
    });
    expect(other).toEqual({ appended: true });
    expect(await log.listDeferredClasses()).toEqual(['unaccounted', 'item_not_found']);

    for (let index = 0; index < 5; index += 1) {
      await log.appendError({
        v4Id: `id${index}`,
        phase: PHASE,
        group: null,
        className: 'unaccounted',
        message: 'row missing',
        now: START,
      });
    }
    const examples = await log.readErrorExamples('unaccounted');
    expect(examples).toHaveLength(3);
    expect(examples.map((line) => line.v4Id)).toEqual(['id0', 'id1', 'id2']);
  });

  it('appends one fix entry per class and drops unsafe paths', async () => {
    const { log } = await tempLog(START);
    const file = 'apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts';
    const first = await log.appendFix({
      className: 'unaccounted',
      files: [file, '../secret.env', 'not a path'],
      retried: 12,
    });
    expect(first).toEqual({ appended: true });
    const fixesPath = path.join(log.dir, 'fixes.md');
    const fixes = await readFile(fixesPath, 'utf8');
    expect(fixes).toBe(
      [
        '# Fixes',
        '',
        '## unaccounted',
        '',
        `- Files: \`${file}\``,
        '- Retried: 12',
        '',
        '',
      ].join('\n')
    );
    expect(fixes).not.toContain('..');
    const second = await log.appendFix({
      className: 'unaccounted',
      files: [file],
      retried: 1,
    });
    expect(second).toEqual({ appended: false });
    expect(await readFile(fixesPath, 'utf8')).toBe(fixes);
    const none = await log.appendFix({
      className: 'parse_failed',
      files: ['../only'],
      retried: -1,
    });
    expect(none).toEqual({ appended: true });
    const both = await readFile(fixesPath, 'utf8');
    expect(both).toContain('- Files: none');
    expect(both).toContain('- Retried: 0');
  });
});
