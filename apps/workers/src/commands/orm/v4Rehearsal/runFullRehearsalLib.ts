import type { CommandLineArgs } from '@workers/commands/index.js';

import { hasOption, optionValue } from '../v4Library/copyAccountLibrary.js';
import type { RehearsalPhase, RehearsalStage } from './rehearsalLog.js';
import { REHEARSAL_PHASES, REHEARSAL_STAGES } from './rehearsalLog.js';

const RUN_ID_PATTERN = /^[0-9]{8}T[0-9]{6}Z$/;

const ALLOWED_KEYS = new Set([
  '_',
  'help',
  'stage',
  'phase',
  'resume',
  'retry-failed',
  'limit',
  'run-id',
]);

export type ParsedRehearsalArgs = {
  stage: RehearsalStage;
  phase: RehearsalPhase | null;
  resume: boolean;
  retryFailed: boolean;
  limit: number | null;
  runId: string | null;
};

function assertKnownKeys(args: CommandLineArgs): void {
  for (const key of Object.keys(args)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error('Unknown rehearsal flag.');
    }
  }
}

function requireStage(args: CommandLineArgs): RehearsalStage {
  const value = optionValue(args, 'stage');
  if (value === null) {
    throw new Error('Missing --stage.');
  }
  for (const stage of REHEARSAL_STAGES) {
    if (stage === value) {
      return stage;
    }
  }
  throw new Error('invalid_stage');
}

function phaseOrNull(args: CommandLineArgs): RehearsalPhase | null {
  if (!hasOption(args, 'phase')) {
    return null;
  }
  const value = optionValue(args, 'phase');
  for (const phase of REHEARSAL_PHASES) {
    if (phase === value) {
      return phase;
    }
  }
  throw new Error('invalid_phase');
}

function runIdOrNull(args: CommandLineArgs, resume: boolean): string | null {
  const value = hasOption(args, 'run-id') ? optionValue(args, 'run-id') : null;
  if (value !== null && !RUN_ID_PATTERN.test(value)) {
    throw new Error('invalid_run_id');
  }
  if (resume && value === null) {
    throw new Error('Missing --run-id.');
  }
  return value;
}

function limitOrNull(args: CommandLineArgs): number | null {
  if (!hasOption(args, 'limit')) {
    return null;
  }
  const value = optionValue(args, 'limit');
  if (value === null) {
    throw new Error('--limit must be a whole number.');
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('--limit must be a whole number.');
  }
  return parsed;
}

export function parseRehearsalArgs(args: CommandLineArgs): ParsedRehearsalArgs {
  assertKnownKeys(args);
  const stage = requireStage(args);
  const phase = phaseOrNull(args);
  const resume = hasOption(args, 'resume');
  const retryFailed = hasOption(args, 'retry-failed');
  return {
    stage,
    phase,
    resume,
    retryFailed,
    limit: limitOrNull(args),
    runId: runIdOrNull(args, resume),
  };
}
