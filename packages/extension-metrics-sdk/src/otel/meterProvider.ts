import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import { buildExtensionResource } from './resource.js';

const EXPORT_INTERVAL_MS = 15_000;

export type CreateExtensionMeterProviderOptions = {
  otlpEndpoint: string;
  serviceName: string;
  resourceAttributes?: string;
};

export const createExtensionMeterProvider = (
  options: CreateExtensionMeterProviderOptions
): MeterProvider => {
  const resource = buildExtensionResource(options.serviceName, options.resourceAttributes);
  const exporter = new OTLPMetricExporter({
    url: options.otlpEndpoint,
  });
  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: EXPORT_INTERVAL_MS,
  });

  return new MeterProvider({
    resource,
    readers: [reader],
  });
};
