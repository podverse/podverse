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
  return [
    {
      command: `npm run build -w @podverse/helpers-config && npm run build -w @podverse/api && ${buildE2eWebApiEnvPrefix()} npm run start -w @podverse/api`,
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
      command: `${buildE2eWebAppEnvPrefix()} bash scripts/e2e/build-and-start-next-standalone.sh @podverse/web`,
      port: 4032,
      cwd: '../..',
      timeout: 420_000,
      reuseExistingServer: false,
    },
  ];
}
