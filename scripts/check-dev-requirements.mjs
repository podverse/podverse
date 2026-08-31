#!/usr/bin/env node
/**
 * Check that local dev requirements (Postgres, Valkey, Artemis on dev ports) are met.
 * If not, print instructions (e.g. make local_infra_up) and exit 1.
 * Used before `npm run dev:all`, `dev:all:watch`, and related dev stack scripts.
 */

import net from 'net';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5432', 10);
const VALKEY_HOST = process.env.VALKEY_HOST ?? 'localhost';
const VALKEY_PORT = Number(process.env.VALKEY_PORT ?? '6379', 10);
const MQ_HOST = process.env.MESSAGE_QUEUE_HOST ?? 'localhost';
const MQ_PORT = Number(process.env.MESSAGE_QUEUE_PORT ?? '5684', 10);

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

async function main() {
  const dbOk = await checkPort(DB_HOST, DB_PORT);
  const valkeyOk = await checkPort(VALKEY_HOST, VALKEY_PORT);
  const mqOk = await checkPort(MQ_HOST, MQ_PORT);

  if (dbOk && valkeyOk && mqOk) {
    return;
  }

  const missing = [];
  if (!dbOk) missing.push(`Postgres at ${DB_HOST}:${DB_PORT}`);
  if (!valkeyOk) missing.push(`Valkey at ${VALKEY_HOST}:${VALKEY_PORT}`);
  if (!mqOk) missing.push(`Artemis (AMQP) at ${MQ_HOST}:${MQ_PORT}`);

  console.error('Local dev requirements not met. The following are not reachable:');
  missing.forEach((m) => console.error('  - ' + m));
  console.error('');
  console.error('Run from repo root:');
  console.error('  make local_infra_up');
  console.error('');
  console.error('First-time setup (once per Postgres volume):');
  console.error('  make local_db_init');
  console.error('');
  console.error('If Postgres is running but apps fail with password authentication:');
  console.error('  make local_db_sync_passwords');
  console.error('');
  console.error(
    'npm run dev:all and dev:all:watch start Node apps only; they do not start Docker.'
  );
  console.error('Verify anytime with: npm run check:dev-deps');
  process.exit(1);
}

main();
