import type { ExtensionConfigSchema } from './configSchema.js';
import type { ApiServerHook, ManagementHook, WebClientHook } from './hooks.js';

export type ExtensionKind = 'analytics' | 'observability' | 'integration' | 'webhook' | 'other';

export type ExtensionManifest = {
  id: string;
  name: string;
  description: string;
  kind: ExtensionKind;
  defaultEnabled: false;
  configSchema: ExtensionConfigSchema;
  requires: {
    web?: WebClientHook;
    api?: ApiServerHook;
    mgmt?: ManagementHook;
  };
  cspSources?: string[];
};
