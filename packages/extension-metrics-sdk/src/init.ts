import { metrics } from '@opentelemetry/api';

import type { ExtensionInitConfig, WorkerCommandStatus } from './config.js';
import { createExpressExtensionHttpMiddleware } from './http/expressMiddleware.js';
import { createHttpMetricInstruments } from './http/recordHttpServerRequest.js';
import type { ExtensionHttpMiddleware } from './http/types.js';
import { extensionRuntimeState, resetExtensionRuntimeState } from './internalState.js';
import { createExtensionMeterProvider } from './otel/meterProvider.js';
import {
  createWorkerCommandInstruments,
  recordWorkerCommandMetric,
} from './worker/commandTiming.js';

const METER_NAME = 'podverse.extensions';

const validateEnabledConfig = (config: ExtensionInitConfig): void => {
  if (config.otlpEndpoint === undefined || config.otlpEndpoint.trim() === '') {
    throw new Error(
      'otlpEndpoint is required when metricsExtensionEnabled is true (OTEL_EXPORTER_OTLP_ENDPOINT)'
    );
  }
  if (config.serviceName === undefined || config.serviceName.trim() === '') {
    throw new Error(
      'serviceName is required when metricsExtensionEnabled is true (OTEL_SERVICE_NAME)'
    );
  }
};

let noopMiddleware: ExtensionHttpMiddleware | null = null;

const getNoopMiddleware = (): ExtensionHttpMiddleware => {
  if (noopMiddleware === null) {
    noopMiddleware = (_req, _res, next) => {
      next();
    };
  }
  return noopMiddleware;
};

export const isExtensionsEnabled = (): boolean => extensionRuntimeState.enabled;

export const initExtensions = (config: ExtensionInitConfig): void => {
  if (!config.metricsExtensionEnabled) {
    extensionRuntimeState.enabled = false;
    return;
  }

  if (extensionRuntimeState.enabled && extensionRuntimeState.meterProvider !== null) {
    return;
  }

  validateEnabledConfig(config);

  const otlpEndpoint = config.otlpEndpoint;
  const serviceName = config.serviceName;
  if (otlpEndpoint === undefined || serviceName === undefined) {
    throw new Error('Extension SDK config validation failed');
  }

  const meterProvider = createExtensionMeterProvider({
    otlpEndpoint: otlpEndpoint.trim(),
    serviceName: serviceName.trim(),
    resourceAttributes: config.resourceAttributes,
  });

  metrics.setGlobalMeterProvider(meterProvider);
  const meter = meterProvider.getMeter(METER_NAME);
  const httpInstruments = createHttpMetricInstruments(meter);
  const workerInstruments = createWorkerCommandInstruments(meter);

  extensionRuntimeState.enabled = true;
  extensionRuntimeState.meterProvider = meterProvider;
  extensionRuntimeState.httpInstruments = httpInstruments;
  extensionRuntimeState.workerInstruments = workerInstruments;
};

export const shutdownExtensions = async (): Promise<void> => {
  if (extensionRuntimeState.meterProvider !== null) {
    await extensionRuntimeState.meterProvider.shutdown();
  }
  resetExtensionRuntimeState();
};

export const getExtensionHttpMiddleware = (): ExtensionHttpMiddleware => {
  if (!extensionRuntimeState.enabled) {
    return getNoopMiddleware();
  }
  return createExpressExtensionHttpMiddleware();
};

export const recordWorkerCommand = (
  command: string,
  status: WorkerCommandStatus,
  durationMs: number
): void => {
  if (!extensionRuntimeState.enabled || extensionRuntimeState.workerInstruments === null) {
    return;
  }
  recordWorkerCommandMetric(extensionRuntimeState.workerInstruments, command, status, durationMs);
};
