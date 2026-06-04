#!/usr/bin/env node
/**
 * Preflight for custom-themes Playwright configs (runs before webServer startup).
 * Fails fast with setup commands when Postgres/Valkey test ports are unreachable.
 */

import net from 'net';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5732', 10);
const VALKEY_HOST = process.env.VALKEY_HOST ?? 'localhost';
const VALKEY_PORT = Number(process.env.VALKEY_PORT ?? '6679', 10);

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000;
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export default async function globalSetup() {
  const dbOk = await checkPort(DB_HOST, DB_PORT);
  const valkeyOk = await checkPort(VALKEY_HOST, VALKEY_PORT);

  if (dbOk && valkeyOk) {
    return;
  }

  const missing = [];
  if (!dbOk) {
    missing.push(`Postgres at ${DB_HOST}:${DB_PORT}`);
  }
  if (!valkeyOk) {
    missing.push(`Valkey at ${VALKEY_HOST}:${VALKEY_PORT}`);
  }

  const lines = [
    'Custom themes E2E cannot run. Missing test infrastructure:',
    ...missing.map((item) => `  - ${item}`),
    '',
    'From the monorepo root, run:',
    '  make test_deps',
    '  make e2e_seed',
    '',
    'Remote/combo lanes also start podverse-test-assets on port 2111 via Playwright webServer (no separate command).',
    'See: make help_test',
  ];

  throw new Error(lines.join('\n'));
}
