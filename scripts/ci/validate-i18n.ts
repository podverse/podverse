#!/usr/bin/env npx ts-node

/**
 * Thin entrypoint for historical CI invocations.
 * Authoritative validation lives in packages/i18n-catalog.
 */

import { spawnSync } from 'child_process';

const result = spawnSync('npm', ['run', 'i18n:validate', '-w', '@podverse/i18n-catalog'], {
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
