import { initExtensions, shutdownExtensions } from '@podverse/extension-metrics-sdk';
import { shutdownObservability } from '@podverse/observability';

const isPrometheusEnabled = (): boolean => process.env.PROMETHEUS_ENABLED === 'true';

let gracefulShutdownHandlersRegistered = false;

export const bootstrapWebExtensions = (): void => {
  const metricsExtensionEnabled = isPrometheusEnabled();

  initExtensions({
    metricsExtensionEnabled,
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME,
    resourceAttributes: process.env.OTEL_RESOURCE_ATTRIBUTES,
  });
};

export const shutdownWebExtensions = async (): Promise<void> => {
  await shutdownExtensions();
};

/** Flush extension metrics (when enabled) then OTLP traces on pod termination. */
export const runWebGracefulShutdown = async (): Promise<void> => {
  if (isPrometheusEnabled()) {
    await shutdownExtensions();
  }
  await shutdownObservability();
};

/** Register SIGTERM/SIGINT handlers for extension metrics and observability flush. */
export const registerWebGracefulShutdownHandlers = (): void => {
  if (gracefulShutdownHandlersRegistered) {
    return;
  }
  gracefulShutdownHandlersRegistered = true;

  const runShutdown = (): void => {
    void runWebGracefulShutdown();
  };

  process.on('SIGTERM', runShutdown);
  process.on('SIGINT', runShutdown);
};
