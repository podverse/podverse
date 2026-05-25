import type { Express } from 'express';

import {
  getExtensionHttpMiddleware,
  initExtensions,
  shutdownExtensions,
} from '@podverse/extension-metrics-sdk';

import { config } from '../../config/index.js';

export const bootstrapApiExtensions = (app: Express): void => {
  initExtensions({
    metricsExtensionEnabled: config.extensions.prometheus.enabled,
    otlpEndpoint: config.extensions.otel.otlpEndpoint,
    serviceName: config.extensions.otel.serviceName,
    resourceAttributes: config.extensions.otel.resourceAttributes,
  });

  if (config.extensions.prometheus.enabled) {
    app.use(getExtensionHttpMiddleware());
  }
};

export const shutdownApiExtensions = async (): Promise<void> => {
  await shutdownExtensions();
};
