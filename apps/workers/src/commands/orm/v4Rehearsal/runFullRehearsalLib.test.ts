import { describe, expect, it } from 'vitest';

import { REHEARSAL_PHASES } from './rehearsalLog.js';
import type { ParsedRehearsalArgs } from './runFullRehearsalLib.js';
import { parseRehearsalArgs } from './runFullRehearsalLib.js';

const PILOT: ParsedRehearsalArgs = {
  stage: 'pilot',
  phase: null,
  resume: false,
  retryFailed: false,
  limit: null,
  runId: null,
};

const RUN_ID = '20261113T043700Z';

function errorMessage(run: () => void): string {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    throw error;
  }
  throw new Error('expected a throw');
}

describe('parseRehearsalArgs', () => {
  it('returns stage pilot, phase null, resume false, retryFailed false, limit null, and runId null for --stage pilot.', () => {
    expect(parseRehearsalArgs({ stage: 'pilot' })).toEqual(PILOT);
  });

  it('accepts each value in REHEARSAL_PHASES as --phase.', () => {
    for (const phase of REHEARSAL_PHASES) {
      expect(parseRehearsalArgs({ stage: 'pilot', phase })).toEqual({
        ...PILOT,
        phase,
      });
    }
  });

  it('returns stage sample, phase library, resume true, retryFailed true, limit 0, and run id 20261113T043700Z for those flags.', () => {
    expect(
      parseRehearsalArgs({
        stage: 'sample',
        phase: 'library',
        resume: '',
        'retry-failed': '',
        limit: '0',
        'run-id': RUN_ID,
      })
    ).toEqual({
      stage: 'sample',
      phase: 'library',
      resume: true,
      retryFailed: true,
      limit: 0,
      runId: RUN_ID,
    });
  });

  it('throws Missing --stage. when --stage is missing or blank.', () => {
    expect(errorMessage(() => parseRehearsalArgs({}))).toBe('Missing --stage.');
    expect(errorMessage(() => parseRehearsalArgs({ stage: '' }))).toBe('Missing --stage.');
    expect(errorMessage(() => parseRehearsalArgs({ stage: '   ' }))).toBe('Missing --stage.');
  });

  it('throws invalid_stage for --stage Pilot.', () => {
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'Pilot' }))).toBe('invalid_stage');
  });

  it('throws invalid_phase for --phase no and for a blank --phase.', () => {
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', phase: 'no' }))).toBe(
      'invalid_phase'
    );
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', phase: '' }))).toBe(
      'invalid_phase'
    );
  });

  it('throws Missing --run-id. when --resume is set without --run-id.', () => {
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', resume: '' }))).toBe(
      'Missing --run-id.'
    );
    expect(
      errorMessage(() => parseRehearsalArgs({ stage: 'pilot', resume: '', 'run-id': '' }))
    ).toBe('Missing --run-id.');
    expect(
      errorMessage(() => parseRehearsalArgs({ stage: 'pilot', resume: '', 'run-id': '   ' }))
    ).toBe('Missing --run-id.');
  });

  it('throws invalid_run_id when --run-id is not eight digits, T, six digits, and Z.', () => {
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', 'run-id': 'not-a-run' }))).toBe(
      'invalid_run_id'
    );
    expect(
      errorMessage(() =>
        parseRehearsalArgs({ stage: 'pilot', resume: '', 'run-id': '20261113T04370Z' })
      )
    ).toBe('invalid_run_id');
  });

  it('throws --limit must be a whole number. when --limit has no value, is -1, or is 1.5.', () => {
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', limit: '' }))).toBe(
      '--limit must be a whole number.'
    );
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', limit: '-1' }))).toBe(
      '--limit must be a whole number.'
    );
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', limit: '1.5' }))).toBe(
      '--limit must be a whole number.'
    );
  });

  it('throws Unknown rehearsal flag. for an unknown key foo.', () => {
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', foo: '1' }))).toBe(
      'Unknown rehearsal flag.'
    );
    expect(errorMessage(() => parseRehearsalArgs({ foo: '1' }))).toBe('Unknown rehearsal flag.');
  });

  it('throws Unknown rehearsal flag. for --dry-run.', () => {
    expect(errorMessage(() => parseRehearsalArgs({ stage: 'pilot', 'dry-run': '' }))).toBe(
      'Unknown rehearsal flag.'
    );
  });

  it('ignores the _ key.', () => {
    expect(parseRehearsalArgs({ _: ['v4RunFullRehearsal'], stage: 'pilot' })).toEqual(PILOT);
  });
});
