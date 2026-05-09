import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { manifest as cloudflareWebAnalytics } from '@podverse/extension-cloudflare-web-analytics';
import { resolveExtensionConfig } from '@podverse/extensions-sdk';

vi.mock('../../lib/extensions/resolveActiveExtensions', () => ({
  resolveActiveExtensions: async () => {
    const env = {
      EXTENSIONS_ENABLED: process.env.EXTENSIONS_ENABLED,
      EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED:
        process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED,
      EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN:
        process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
      EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL:
        process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL,
    };

    const resolved = resolveExtensionConfig<Record<string, unknown>>({
      manifest: cloudflareWebAnalytics,
      env,
      dbRow: null,
      masterSwitchEnabled: env.EXTENSIONS_ENABLED === 'true',
    });

    if (!resolved.enabled) {
      return [];
    }

    return [
      {
        manifest: cloudflareWebAnalytics,
        resolved,
      },
    ];
  },
}));

import { ExtensionHeadScripts } from './ExtensionHeadScripts';

const ORIGINAL_ENV = {
  EXTENSIONS_ENABLED: process.env.EXTENSIONS_ENABLED,
  EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED:
    process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED,
  EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN: process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
  EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL:
    process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL,
};

function restoreEnv() {
  process.env.EXTENSIONS_ENABLED = ORIGINAL_ENV.EXTENSIONS_ENABLED;
  process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED =
    ORIGINAL_ENV.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED;
  process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN =
    ORIGINAL_ENV.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL =
    ORIGINAL_ENV.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL;
}

describe('ExtensionHeadScripts', () => {
  beforeEach(() => {
    restoreEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it('renders exactly one Cloudflare beacon script when extension env keys are set', async () => {
    process.env.EXTENSIONS_ENABLED = 'true';
    process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED = 'true';
    process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN = 'token-123';
    process.env.EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL =
      'https://static.cloudflareinsights.com/beacon.min.js';

    const scriptsNode = await ExtensionHeadScripts();
    const html = scriptsNode === null ? '' : renderToStaticMarkup(<>{scriptsNode}</>);

    const cloudflareScriptMatches = html.match(
      /<script[^>]*src="[^"]*cloudflareinsights[^"]*"[^>]*><\/script>/g
    );

    expect(cloudflareScriptMatches).toHaveLength(1);
  });
});
