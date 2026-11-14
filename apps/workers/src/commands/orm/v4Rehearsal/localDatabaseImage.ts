import { spawn } from 'node:child_process';
import { access, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { Client } from 'pg';

import { assertLocalDatabase } from '../v4Library/copyAccountLibrary.js';

const DUMP_ERROR = 'Could not dump the local database.';
const RESTORE_ERROR = 'Could not restore the local database.';

export const TERMINATE_OTHER_CLIENTS_SQL = `SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND backend_type = 'client backend'`;

export type DumpRole = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
};

type PgToolArgs = {
  host: string;
  port: string;
  user: string;
  database: string;
  filePath: string;
};

// This file is the local database image from before the first stage writes, and later
// stages restore it.
export function cleanDumpPath(rootDir: string): string {
  return join(rootDir, 'clean.dump');
}

export function dumpRoleFromEnv(env: NodeJS.ProcessEnv): DumpRole {
  const host = trimmed(env, 'DB_HOST');
  const port = trimmed(env, 'DB_PORT');
  const database = trimmed(env, 'DB_APP_NAME');
  const migratorUser = trimmed(env, 'DB_APP_MIGRATOR_USER');
  const migratorPassword = stored(env, 'DB_APP_MIGRATOR_PASSWORD');
  const readWriteUser = trimmed(env, 'DB_APP_READ_WRITE_USER');
  const readWritePassword = stored(env, 'DB_APP_READ_WRITE_PASSWORD');
  const useMigrator = migratorUser !== '' && migratorPassword.trim() !== '';
  const user = useMigrator ? migratorUser : readWriteUser;
  const password = useMigrator ? migratorPassword : readWritePassword;
  if (host === '' || port === '' || database === '' || user === '' || password === '') {
    throw new Error(DUMP_ERROR);
  }
  return { host, port, user, password, database };
}

export function buildDumpArgs(input: PgToolArgs): string[] {
  return [
    '-h',
    input.host,
    '-p',
    input.port,
    '-U',
    input.user,
    '-d',
    input.database,
    '-Fc',
    '--no-owner',
    '-f',
    input.filePath,
  ];
}

export function buildRestoreArgs(input: PgToolArgs): string[] {
  return [
    '-h',
    input.host,
    '-p',
    input.port,
    '-U',
    input.user,
    '-d',
    input.database,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--exit-on-error',
    input.filePath,
  ];
}

export async function cleanDumpExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeCleanDumpIfMissing(filePath: string): Promise<'present' | 'written'> {
  assertLocalDatabase();
  if (await cleanDumpExists(filePath)) {
    return 'present';
  }
  await dumpToFile(filePath);
  return 'written';
}

export async function dumpPhaseFile(filePath: string): Promise<number> {
  assertLocalDatabase();
  await dumpToFile(filePath);
  try {
    const info = await stat(filePath);
    return info.size;
  } catch {
    throw new Error(DUMP_ERROR);
  }
}

export async function restoreCleanDump(filePath: string): Promise<void> {
  assertLocalDatabase();
  const role = roleForRestore();
  requirePort(role.port, RESTORE_ERROR);
  try {
    await spawnPgTool(
      'pg_restore',
      buildRestoreArgs(toolArgs(role, filePath)),
      role.password,
      RESTORE_ERROR
    );
  } catch (error) {
    throw stableError(error, RESTORE_ERROR);
  }
}

export async function disconnectOtherLocalClients(): Promise<void> {
  assertLocalDatabase();
  const role = roleForRestore();
  const port = requirePort(role.port, RESTORE_ERROR);
  const client = openClient(role, port);
  let failed = false;
  try {
    await client.connect();
    await client.query(TERMINATE_OTHER_CLIENTS_SQL);
  } catch {
    failed = true;
  } finally {
    try {
      await client.end();
    } catch {
      failed = true;
    }
  }
  if (failed) {
    throw new Error(RESTORE_ERROR);
  }
}

function stored(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined) {
    return '';
  }
  return value;
}

function trimmed(env: NodeJS.ProcessEnv, key: string): string {
  return stored(env, key).trim();
}

function requirePort(port: string, failureMessage: string): number {
  if (!/^\d+$/.test(port)) {
    throw new Error(failureMessage);
  }
  const parsed = Number(port);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(failureMessage);
  }
  return parsed;
}

function toolArgs(role: DumpRole, filePath: string): PgToolArgs {
  return {
    host: role.host,
    port: role.port,
    user: role.user,
    database: role.database,
    filePath,
  };
}

function roleForRestore(): DumpRole {
  try {
    return dumpRoleFromEnv(process.env);
  } catch {
    throw new Error(RESTORE_ERROR);
  }
}

function stableError(error: unknown, failureMessage: string): Error {
  if (error instanceof Error && error.message === failureMessage && error.cause === undefined) {
    return error;
  }
  return new Error(failureMessage);
}

async function dumpToFile(filePath: string): Promise<void> {
  assertLocalDatabase();
  const role = dumpRoleFromEnv(process.env);
  requirePort(role.port, DUMP_ERROR);
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await spawnPgTool(
      'pg_dump',
      buildDumpArgs(toolArgs(role, filePath)),
      role.password,
      DUMP_ERROR
    );
  } catch (error) {
    throw stableError(error, DUMP_ERROR);
  }
}

function spawnPgTool(
  command: 'pg_dump' | 'pg_restore',
  args: string[],
  password: string,
  failureMessage: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (ok) {
        resolve();
        return;
      }
      reject(new Error(failureMessage));
    };

    try {
      const child = spawn(command, args, {
        shell: false,
        stdio: 'ignore',
        env: { ...process.env, PGPASSWORD: password },
      });
      child.once('error', () => {
        finish(false);
      });
      child.once('close', (code) => {
        finish(code === 0);
      });
    } catch {
      finish(false);
    }
  });
}

function openClient(role: DumpRole, port: number): Client {
  try {
    return new Client({
      host: role.host,
      port,
      user: role.user,
      password: role.password,
      database: role.database,
      ssl: process.env.DB_SSL_CONNECTION === 'true',
    });
  } catch {
    throw new Error(RESTORE_ERROR);
  }
}
