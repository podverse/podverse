/**
 * Starts the assets HTTP server on http://localhost:2111.
 * Run with: npm run start (from tools/test-assets) or npm run start -w podverse-test-assets (from repo root).
 */

import { AssetServer } from './asset-server.js';

const server = new AssetServer();

async function main() {
  await server.start();
  console.log(`Assets server ready at http://localhost:${server.getPort()}/`);
  console.log('Press Ctrl+C to stop.\n');
}

function shutdown(signal: string) {
  console.log(`\n${signal} received, stopping server...`);
  server.stop().then(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
