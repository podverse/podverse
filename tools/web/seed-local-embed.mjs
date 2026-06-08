#!/usr/bin/env node
/**
 * Seed deterministic embed + media-player fixtures into the local dev app DB
 * without truncating existing accounts.
 *
 * Run via: make local_seed_embed
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const LOCAL_DB_ENV_PATH = path.join(REPO_ROOT, 'infra/config/local/db.env');

function loadLocalDbEnv() {
  if (!fs.existsSync(LOCAL_DB_ENV_PATH)) {
    throw new Error(
      `Missing ${LOCAL_DB_ENV_PATH}. Run make local_env_setup && make local_db_init first.`
    );
  }

  const env = {};
  const lines = fs.readFileSync(LOCAL_DB_ENV_PATH, 'utf8').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');

    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex);
    let value = trimmed.slice(eqIndex + 1).trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const localDbEnv = loadLocalDbEnv();

const result = spawnSync(
  process.execPath,
  [path.join(REPO_ROOT, 'tools/web/seed-e2e.mjs')],
  {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      SEED_MEDIA_FIXTURES_ONLY: 'true',
      DB_HOST: process.env.DB_HOST ?? 'localhost',
      DB_PORT: process.env.DB_PORT ?? localDbEnv.DB_PORT ?? '5432',
      DB_APP_NAME: process.env.DB_APP_NAME ?? localDbEnv.DB_APP_NAME ?? 'podverse_app',
      SEED_DB_USER: process.env.SEED_DB_USER ?? localDbEnv.DB_APP_READ_WRITE_USER,
      SEED_DB_PASSWORD: process.env.SEED_DB_PASSWORD ?? localDbEnv.DB_APP_READ_WRITE_PASSWORD,
    },
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
