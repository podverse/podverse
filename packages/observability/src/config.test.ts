import { describe, expect, it } from 'vitest';

import {
  buildObservabilityConfigFromEnv,
  buildObservabilityValidationResults,
  validateObservabilityConfigFromEnv,
} from './config.js';

describe('buildObservabilityConfigFromEnv', () => {
  it('maps default none export with service name', () => {
    expect(
      buildObservabilityConfigFromEnv({
        OTEL_SERVICE_NAME: 'podverse-api',
        OTEL_TRACES_EXPORT: 'none',
      })
    ).toEqual({
      serviceName: 'podverse-api',
      tracesExport: 'none',
      otlpEndpoint: undefined,
      sampler: undefined,
      samplerArg: undefined,
    });
  });

  it('maps otlp export with endpoint', () => {
    expect(
      buildObservabilityConfigFromEnv({
        OTEL_SERVICE_NAME: 'podverse-web',
        OTEL_TRACES_EXPORT: 'otlp',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://127.0.0.1:4318',
      })
    ).toEqual({
      serviceName: 'podverse-web',
      tracesExport: 'otlp',
      otlpEndpoint: 'http://127.0.0.1:4318',
      sampler: undefined,
      samplerArg: undefined,
    });
  });
});

describe('validateObservabilityConfigFromEnv', () => {
  it('passes for none export without endpoint', () => {
    expect(() =>
      validateObservabilityConfigFromEnv({
        OTEL_SERVICE_NAME: 'podverse-api',
        OTEL_TRACES_EXPORT: 'none',
      })
    ).not.toThrow();
  });

  it('throws when otlp export is missing endpoint', () => {
    expect(() =>
      validateObservabilityConfigFromEnv({
        OTEL_SERVICE_NAME: 'podverse-api',
        OTEL_TRACES_EXPORT: 'otlp',
      })
    ).toThrow('OTEL_EXPORTER_OTLP_ENDPOINT is required when OTEL_TRACES_EXPORT=otlp');
  });
});

describe('buildObservabilityValidationResults', () => {
  it('marks missing service name as invalid', () => {
    const results = buildObservabilityValidationResults({
      OTEL_TRACES_EXPORT: 'none',
    });
    const serviceName = results.find((result) => result.name === 'OTEL_SERVICE_NAME');
    expect(serviceName?.isValid).toBe(false);
  });
});
