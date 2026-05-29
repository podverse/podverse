/**
 * Build webServers array for Podverse web E2E Playwright config.
 * Ports: API 4030, sidecar 4031, web 4032.
 * Depends on test stack running (make test_deps) on DB port 5732, Valkey port 6679.
 */

import {
  buildE2eWebApiEnvPrefix,
  buildE2eWebAppEnvPrefix,
  buildE2eWebSidecarEnvPrefix,
} from './playwright.e2e-server-env';
import type { E2eWebSidecarEnvOptions } from './playwright.e2e-server-env';

export function buildE2eWebServers(options?: E2eWebSidecarEnvOptions) {
  const sidecarEnvPrefix = buildE2eWebSidecarEnvPrefix(options);
  const apiEnvPrefix = buildE2eWebApiEnvPrefix(options);
  const appEnvPrefix = buildE2eWebAppEnvPrefix(options);
  return [
    {
      command: `npm run build -w @podverse/helpers-config && npm run build -w @podverse/api && ${apiEnvPrefix} npm run start -w @podverse/api`,
      port: 4030,
      cwd: '../..',
      timeout: 420_000,
      reuseExistingServer: false,
    },
    {
      command: `npm run build -w @podverse/web-sidecar && ${sidecarEnvPrefix} node apps/web/sidecar/dist/server.js`,
      port: 4031,
      cwd: '../..',
      timeout: 420_000,
      reuseExistingServer: false,
    },
    {
      command: `${appEnvPrefix} bash scripts/e2e/build-and-start-next-standalone.sh @podverse/web`,
      port: 4032,
      cwd: '../..',
      timeout: 420_000,
      reuseExistingServer: false,
    },
    // Local test-asset server (port 2111) serves the deterministic E2E media
    // fixtures under tools/test-assets/assets/e2e/. The seed inserts these
    // URLs as item_enclosure.url so the browser's <audio> element resolves
    // them locally instead of reaching out to any third party. See
    // .llm/plans/active/media-player-e2e-seed-expansion/01b-test-audio-fixtures-and-asset-server.md.
    {
      command: 'npm run start -w podverse-test-assets',
      port: 2111,
      cwd: '../..',
      timeout: 30_000,
      reuseExistingServer: true,
    },
  ];
}
