import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import type { TracerProvider } from '@opentelemetry/sdk-trace';

import type { ObservabilityConfig } from './config.js';
import { validateObservabilityConfig } from './config.js';
import { observabilityRuntimeState, resetObservabilityRuntimeState } from './internalState.js';
import { createObservabilityTracerProvider } from './otel/tracerProvider.js';

let tracerProvider: TracerProvider | null = null;

export const initObservability = (config: ObservabilityConfig): void => {
  if (observabilityRuntimeState.initialized) {
    return;
  }

  validateObservabilityConfig(config);

  propagation.setGlobalPropagator(new W3CTraceContextPropagator());

  tracerProvider = createObservabilityTracerProvider(config);
  trace.setGlobalTracerProvider(tracerProvider);
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());

  observabilityRuntimeState.initialized = true;
  observabilityRuntimeState.config = config;
};

export const shutdownObservability = async (): Promise<void> => {
  if (tracerProvider !== null) {
    await tracerProvider.shutdown();
    tracerProvider = null;
  }
  resetObservabilityRuntimeState();
};

export const isObservabilityInitialized = (): boolean => observabilityRuntimeState.initialized;
