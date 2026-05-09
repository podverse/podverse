import Joi from 'joi';

import type { ExtensionManifest } from '@podverse/extensions-sdk';

import { mgmt } from './mgmt.js';
import { webClient } from './web-client.js';

export type CloudflareWebAnalyticsConfig = {
  token: string;
  beaconUrl?: string;
};

export const manifest: ExtensionManifest = {
  id: 'cloudflare-web-analytics',
  name: 'Cloudflare Web Analytics',
  description:
    'Optional, opt-in Cloudflare Web Analytics. Collects rough page-view data ' +
    'for operators who run a Cloudflare Web Analytics site. Token is intentionally ' +
    'public; no operator credentials are stored.',
  kind: 'analytics',
  defaultEnabled: false,
  configSchema: {
    joi: Joi.object({
      token: Joi.string().trim().min(1).required(),
      beaconUrl: Joi.string().uri().optional(),
    }),
    fields: {
      token: {
        secret: false,
        userEditable: true,
        labelKey: 'extensions.cloudflare.token.label',
        helpKey: 'extensions.cloudflare.token.help',
      },
      beaconUrl: {
        secret: false,
        userEditable: true,
        labelKey: 'extensions.cloudflare.beaconUrl.label',
        helpKey: 'extensions.cloudflare.beaconUrl.help',
      },
    },
  },
  requires: {
    web: webClient,
    mgmt,
  },
  cspSources: ['https://static.cloudflareinsights.com'],
};
