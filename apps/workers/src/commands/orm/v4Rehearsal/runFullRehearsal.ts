import type { CommandLineArgs } from '@workers/commands/index.js';

import { assertLocalDatabase, hasOption } from '../v4Library/copyAccountLibrary.js';
import { parseRehearsalArgs } from './runFullRehearsalLib.js';
import { runParsedRehearsal } from './runFullRehearsalLoop.js';

export const V4_RUN_FULL_REHEARSAL_HELP = `v4RunFullRehearsal

Copy one stage of v4 accounts into the local v5 database. Phases run in order:
preflight, identity, catalog, library, replay, membership, verify. One account
failure does not stop the run. The run stops when more than 5% of the last 200
accounts failed in the current phase.

Flags:
  --stage name     pilot, sample, or full (required)
  --phase name     Run one phase and then stop
  --resume         Continue a run. Requires --run-id
  --run-id id      The run folder name
  --retry-failed   Include failed accounts
  --limit n        Most accounts to process in a phase
  --help           Show this text

sample and full restore .artifacts/v4-full-rehearsal/clean.dump unless
--resume or --phase is set. pilot writes that file when it is missing and
does not restore it. The first pilot run must start from a local database
that does not already hold rehearsal accounts.

This command reads V4_DATABASE_URL and does not refresh it. Run --stage full
again after that snapshot is replaced, before go-live.

The catalog phase waits until feeds are settled. It does not start the parser.
Apply refuses unless DB_HOST is local.
`;

/** The command refuses a non-local database before any phase runs. */
export const v4RunFullRehearsal = async (args: CommandLineArgs) => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_RUN_FULL_REHEARSAL_HELP);
    return;
  }

  const parsed = parseRehearsalArgs(args);
  assertLocalDatabase();
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  await runParsedRehearsal(parsed, connectionString);
};
