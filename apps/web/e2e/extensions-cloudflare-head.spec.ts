import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const TEST_TOKEN = '00000000000000000000000000000000';
const REPO_ROOT = existsSync(path.join(process.cwd(), 'apps/web/package.json'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..', '..');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForHttpReady(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for server readiness: ${url}`);
}

function startProcess(command: string, env: NodeJS.ProcessEnv) {
  return spawn(command, {
    cwd: REPO_ROOT,
    env,
    shell: true,
    stdio: 'ignore',
  });
}

function stopProcess(processHandle: ReturnType<typeof startProcess>): void {
  if (processHandle.killed) {
    return;
  }

  processHandle.kill('SIGTERM');
}

test.describe('Cloudflare extension head script', () => {
  test('off: default E2E web stack does not emit cloudflare script when extensions master switch is off', async ({
    page,
  }) => {
    await page.goto('/');

    const cloudflareScript = page.locator('head script[src*="cloudflareinsights"]');
    await expect(cloudflareScript).toHaveCount(0);
  });

  test('on: extension-enabled stack emits exactly one cloudflare script with token payload', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const sidecarEnv = {
      ...process.env,
      PORT: '5031',
      API_URL: 'http://localhost:4030',
      EXTENSIONS_ENABLED: 'true',
      EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED: 'true',
      EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN: TEST_TOKEN,
      NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
      NEXT_PUBLIC_SSR_API_HOST: 'localhost',
      NEXT_PUBLIC_SSR_API_PORT: '4030',
      NEXT_PUBLIC_API_PROTOCOL: 'http',
      NEXT_PUBLIC_API_HOST: 'localhost',
      NEXT_PUBLIC_API_PORT: '4030',
      NEXT_PUBLIC_API_PREFIX: '/api',
      NEXT_PUBLIC_API_VERSION: '/v2',
      NEXT_PUBLIC_WEB_PROTOCOL: 'http',
      NEXT_PUBLIC_WEB_DOMAIN: 'localhost:5032',
      NEXT_PUBLIC_BRAND_NAME: 'PodverseE2E',
      NEXT_PUBLIC_CONTACT_EMAIL: 'contact-e2e@example.com',
      NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
      NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
      NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
      NEXT_PUBLIC_DEFAULT_THEME: 'dark',
      NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE: 'admin_only_email',
      NEXT_PUBLIC_SERVER_ENV: 'local',
      NEXT_PUBLIC_IMAGE_PROXY_ENABLED: 'false',
      NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED: 'false',
      NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS: '86400',
    };

    const webEnv = {
      ...process.env,
      PORT: '5032',
      RUNTIME_CONFIG_URL: 'http://localhost:5031',
      NODE_OPTIONS: '--disable-warning=DEP0060',
      EXTENSIONS_ENABLED: 'true',
      EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED: 'true',
      EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN: TEST_TOKEN,
      NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
      NEXT_PUBLIC_SSR_API_HOST: 'localhost',
      NEXT_PUBLIC_SSR_API_PORT: '4030',
      NEXT_PUBLIC_API_PROTOCOL: 'http',
      NEXT_PUBLIC_API_HOST: 'localhost',
      NEXT_PUBLIC_API_PORT: '4030',
      NEXT_PUBLIC_API_PREFIX: '/api',
      NEXT_PUBLIC_API_VERSION: '/v2',
      NEXT_PUBLIC_WEB_PROTOCOL: 'http',
      NEXT_PUBLIC_WEB_DOMAIN: 'localhost:5032',
      NEXT_PUBLIC_BRAND_NAME: 'PodverseE2E',
      NEXT_PUBLIC_CONTACT_EMAIL: 'contact-e2e@example.com',
      NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
      NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
      NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
      NEXT_PUBLIC_DEFAULT_THEME: 'dark',
      NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE: 'admin_only_email',
      NEXT_PUBLIC_SERVER_ENV: 'local',
      NEXT_PUBLIC_IMAGE_PROXY_ENABLED: 'false',
      NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED: 'false',
      NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS: '86400',
    };

    const sidecarProcess = startProcess('node apps/web/sidecar/dist/server.js', sidecarEnv);

    const webProcess = startProcess('npm run start -w @podverse/web -- -p 5032', webEnv);

    try {
      await waitForHttpReady('http://localhost:5031/runtime-config', 60_000);
      await waitForHttpReady('http://localhost:5032', 60_000);

      await page.goto('http://localhost:5032/');

      const cloudflareScript = page.locator('head script[src*="cloudflareinsights"]');
      await expect(cloudflareScript).toHaveCount(1);

      const dataAttr = await cloudflareScript.first().getAttribute('data-cf-beacon');
      expect(dataAttr).not.toBeNull();
      expect(JSON.parse(dataAttr ?? '{}')).toEqual({ token: TEST_TOKEN });
    } finally {
      stopProcess(webProcess);
      stopProcess(sidecarProcess);
    }
  });
});
