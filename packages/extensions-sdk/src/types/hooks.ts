import type { ReactNode } from 'react';

export type ScriptDescriptor = {
  src: string;
  defer?: boolean;
  async?: boolean;
  dataAttrs?: Record<string, string>;
};

export type WebClientContext<TConfig = unknown> = {
  config: TConfig;
};

export type WebClientHook<TConfig = unknown> = {
  headScripts?: (ctx: WebClientContext<TConfig>) => ScriptDescriptor[];
  bodyProviders?: (ctx: WebClientContext<TConfig>) => ReactNode[];
};

export type ApiServerHook<TConfig = unknown> = {
  registerMiddleware?: (app: unknown) => void;
  registerEventHandlers?: (bus: unknown) => void;
  contextFactory?: () => TConfig;
};

export type ManagementNavSectionMeta = {
  label: string;
  href: string;
  icon?: string;
};

export type ManagementHook = {
  navSection?: ManagementNavSectionMeta;
  SettingsForm?: unknown;
};
