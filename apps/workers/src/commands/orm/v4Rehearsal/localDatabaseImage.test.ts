import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildDumpArgs,
  buildRestoreArgs,
  cleanDumpPath,
  dumpRoleFromEnv,
  TERMINATE_OTHER_CLIENTS_SQL,
} from './localDatabaseImage.js';

const DUMP_ERROR = 'Could not dump the local database.';

const toolTarget = {
  host: '127.0.0.1',
  port: '5432',
  user: 'app_user',
  database: 'app_db',
  filePath: '/tmp/root/clean.dump',
};

function thrownDumpError(env: NodeJS.ProcessEnv): Error {
  try {
    dumpRoleFromEnv(env);
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
  }
  throw new Error('expected an Error');
}

describe('cleanDumpPath', () => {
  it("returns path.join('/tmp/root', 'clean.dump') for cleanDumpPath('/tmp/root')", () => {
    expect(cleanDumpPath('/tmp/root')).toBe(path.join('/tmp/root', 'clean.dump'));
  });
});

describe('pg tool arguments', () => {
  it('buildDumpArgs and buildRestoreArgs contain the host, user, and database, and neither array contains the password, @, or ://', () => {
    const password = 'p@ss://word';
    const dumpArgs = buildDumpArgs(toolTarget);
    const restoreArgs = buildRestoreArgs(toolTarget);

    expect(dumpArgs).toEqual([
      '-h',
      toolTarget.host,
      '-p',
      toolTarget.port,
      '-U',
      toolTarget.user,
      '-d',
      toolTarget.database,
      '-Fc',
      '--no-owner',
      '-f',
      toolTarget.filePath,
    ]);
    expect(restoreArgs).toEqual([
      '-h',
      toolTarget.host,
      '-p',
      toolTarget.port,
      '-U',
      toolTarget.user,
      '-d',
      toolTarget.database,
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--exit-on-error',
      toolTarget.filePath,
    ]);

    for (const args of [dumpArgs, restoreArgs]) {
      expect(args).not.toContain(password);
      expect(args).not.toContain('@');
      expect(args).not.toContain('://');
      for (const arg of args) {
        expect(arg).not.toContain(password);
        expect(arg).not.toContain('@');
        expect(arg).not.toContain('://');
      }
    }
  });

  it('dump args include -Fc, --no-owner, and -f, and restore args include --clean, --if-exists, --no-owner, --no-privileges, and --exit-on-error, end with the file path, and omit -f and -Fc', () => {
    const dumpArgs = buildDumpArgs(toolTarget);
    const restoreArgs = buildRestoreArgs(toolTarget);

    expect(dumpArgs).toContain('-Fc');
    expect(dumpArgs).toContain('--no-owner');
    expect(dumpArgs).toContain('-f');
    expect(restoreArgs).toContain('--clean');
    expect(restoreArgs).toContain('--if-exists');
    expect(restoreArgs).toContain('--no-owner');
    expect(restoreArgs).toContain('--no-privileges');
    expect(restoreArgs).toContain('--exit-on-error');
    expect(restoreArgs.at(-1)).toBe(toolTarget.filePath);
    expect(restoreArgs).not.toContain('-f');
    expect(restoreArgs).not.toContain('-Fc');
  });
});

describe('dumpRoleFromEnv', () => {
  it('uses the migrator user and password when both are non-empty, and the read-write pair when the migrator user is blank', () => {
    const readWrite = {
      DB_HOST: ' localhost ',
      DB_PORT: ' 5432 ',
      DB_APP_NAME: ' podverse ',
      DB_APP_READ_WRITE_USER: ' rw ',
      DB_APP_READ_WRITE_PASSWORD: ' rw-secret ',
    };

    expect(
      dumpRoleFromEnv({
        ...readWrite,
        DB_APP_MIGRATOR_USER: ' mig ',
        DB_APP_MIGRATOR_PASSWORD: ' mig-secret ',
      })
    ).toEqual({
      host: 'localhost',
      port: '5432',
      user: 'mig',
      password: ' mig-secret ',
      database: 'podverse',
    });

    expect(
      dumpRoleFromEnv({
        ...readWrite,
        DB_APP_MIGRATOR_USER: '   ',
        DB_APP_MIGRATOR_PASSWORD: ' mig-secret ',
      })
    ).toEqual({
      host: 'localhost',
      port: '5432',
      user: 'rw',
      password: ' rw-secret ',
      database: 'podverse',
    });

    expect(
      dumpRoleFromEnv({
        ...readWrite,
        DB_APP_MIGRATOR_USER: 'mig',
        DB_APP_MIGRATOR_PASSWORD: '   ',
      })
    ).toEqual({
      host: 'localhost',
      port: '5432',
      user: 'rw',
      password: ' rw-secret ',
      database: 'podverse',
    });
  });

  it('throws an error whose message is exactly "Could not dump the local database." when the host, port, database, user, or password is blank, and the message does not contain the env values', () => {
    const fields: Array<{ key: string; blank: string; token: string }> = [
      { key: 'DB_HOST', blank: '   ', token: 'db-host-sentinel' },
      { key: 'DB_PORT', blank: '   ', token: '65432' },
      { key: 'DB_APP_NAME', blank: '   ', token: 'db-name-sentinel' },
      { key: 'DB_APP_READ_WRITE_USER', blank: '   ', token: 'db-user-sentinel' },
      { key: 'DB_APP_READ_WRITE_PASSWORD', blank: '', token: 'db-password-sentinel' },
    ];

    for (const field of fields) {
      const env: NodeJS.ProcessEnv = {
        DB_APP_MIGRATOR_USER: '',
        DB_APP_MIGRATOR_PASSWORD: '',
      };
      for (const entry of fields) {
        env[entry.key] = entry.key === field.key ? field.blank : entry.token;
      }
      if (field.key === 'DB_APP_READ_WRITE_USER') {
        env.DB_APP_MIGRATOR_USER = '   ';
      }

      const error = thrownDumpError(env);
      expect(error.message).toBe(DUMP_ERROR);
      expect(error.cause).toBeUndefined();
      for (const entry of fields) {
        if (entry.key === field.key) {
          continue;
        }
        expect(error.message).not.toContain(entry.token);
      }
    }
  });
});

describe('TERMINATE_OTHER_CLIENTS_SQL', () => {
  it("selects pg_terminate_backend(pid) from pg_stat_activity and keeps pid <> pg_backend_pid() and backend_type = 'client backend'", () => {
    expect(TERMINATE_OTHER_CLIENTS_SQL).toBe(`SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND backend_type = 'client backend'`);
    expect(TERMINATE_OTHER_CLIENTS_SQL).toContain('pg_terminate_backend(pid)');
    expect(TERMINATE_OTHER_CLIENTS_SQL).toContain('pg_stat_activity');
    expect(TERMINATE_OTHER_CLIENTS_SQL).toContain('pid <> pg_backend_pid()');
    expect(TERMINATE_OTHER_CLIENTS_SQL).toContain("backend_type = 'client backend'");
  });
});
