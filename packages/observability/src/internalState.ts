import type { ObservabilityConfig } from './config.js';

export type ObservabilityRuntimeState = {
  initialized: boolean;
  config: ObservabilityConfig | null;
};

export const observabilityRuntimeState: ObservabilityRuntimeState = {
  initialized: false,
  config: null,
};

export const resetObservabilityRuntimeState = (): void => {
  observabilityRuntimeState.initialized = false;
  observabilityRuntimeState.config = null;
};
