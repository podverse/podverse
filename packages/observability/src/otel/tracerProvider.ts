import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

import type { ObservabilityConfig } from '../config.js';
import { NoopSpanExporter } from './noopSpanExporter.js';
import { createObservabilityResource } from './resource.js';

const normalizeOtlpTracesUrl = (endpoint: string): string => {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/v1/traces')) {
    return trimmed;
  }
  return `${trimmed}/v1/traces`;
};

const createSpanExporter = (config: ObservabilityConfig): SpanExporter => {
  if (config.tracesExport === 'otlp') {
    if (config.otlpEndpoint === undefined || config.otlpEndpoint.trim() === '') {
      throw new Error('otlpEndpoint is required when tracesExport is otlp');
    }
    return new OTLPTraceExporter({
      url: normalizeOtlpTracesUrl(config.otlpEndpoint),
    });
  }
  return new NoopSpanExporter();
};

export const createObservabilityTracerProvider = (
  config: ObservabilityConfig
): NodeTracerProvider => {
  const provider = new NodeTracerProvider({
    resource: createObservabilityResource(config.serviceName),
  });

  const exporter = createSpanExporter(config);
  const processor =
    config.tracesExport === 'otlp'
      ? new BatchSpanProcessor(exporter)
      : new SimpleSpanProcessor(exporter);
  provider.addSpanProcessor(processor);

  return provider;
};
