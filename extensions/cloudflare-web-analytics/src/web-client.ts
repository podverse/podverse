import type { ScriptDescriptor, WebClientHook } from '@podverse/extensions-sdk';

const DEFAULT_BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';

function normalizeToken(token: unknown): string {
  return typeof token === 'string' ? token.trim() : '';
}

function resolveBeaconUrl(beaconUrl: unknown): string {
  const value = typeof beaconUrl === 'string' ? beaconUrl.trim() : '';
  return value === '' ? DEFAULT_BEACON_URL : value;
}

function toConfig(config: unknown): { token?: unknown; beaconUrl?: unknown } {
  if (typeof config === 'object' && config !== null) {
    return config as { token?: unknown; beaconUrl?: unknown };
  }

  return {};
}

export const webClient: WebClientHook = {
  headScripts: ({ config }): ScriptDescriptor[] => {
    const typedConfig = toConfig(config);
    const token = normalizeToken(typedConfig.token);
    if (token === '') {
      return [];
    }

    return [
      {
        src: resolveBeaconUrl(typedConfig.beaconUrl),
        defer: true,
        dataAttrs: {
          'cf-beacon': JSON.stringify({ token }),
        },
      },
    ];
  },
};
