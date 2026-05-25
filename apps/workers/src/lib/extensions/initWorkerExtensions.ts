import { initExtensions, shutdownExtensions } from '@podverse/extension-metrics-sdk';

import { isLongRunningCommand } from './longRunningCommands.js';

export const isWorkerExtensionsEnabled = (): boolean => process.env.PROMETHEUS_ENABLED === 'true';

export const shouldInitWorkerExtensions = (commandName: string): boolean =>
  isWorkerExtensionsEnabled() && isLongRunningCommand(commandName);

export const initWorkerExtensions = (commandName: string): void => {
  if (!shouldInitWorkerExtensions(commandName)) {
    return;
  }

  initExtensions({
    metricsExtensionEnabled: true,
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME,
    resourceAttributes: process.env.OTEL_RESOURCE_ATTRIBUTES,
  });
};

export const registerWorkerExtensionsShutdown = (commandName: string): void => {
  if (!shouldInitWorkerExtensions(commandName)) {
    return;
  }

  const shutdown = async (): Promise<void> => {
    await shutdownExtensions();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown();
  });
  process.on('SIGINT', () => {
    void shutdown();
  });
};
