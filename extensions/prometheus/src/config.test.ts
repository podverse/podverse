import { afterEach, describe, expect, it } from 'vitest';

import { loadExtensionPrometheusConfig, parseOtlpHeadersEnv } from './config.js';

const originalEnv = { ...process.env };

describe('loadExtensionPrometheusConfig', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses documented defaults when env vars are unset', () => {
    delete process.env.PROMETHEUS_METRICS_PORT;
    delete process.env.PROMETHEUS_METRICS_PATH;
    delete process.env.OTEL_RECEIVER_OTLP_HTTP_PORT;
    delete process.env.PROMETHEUS_COLLECT_PROCESS_METRICS;
    delete process.env.OTEL_TRACES_EXPORTER_MODE;

    const config = loadExtensionPrometheusConfig();

    expect(config.metricsPort).toBe(9464);
    expect(config.metricsPath).toBe('/extensions/prometheus/metrics');
    expect(config.healthPath).toBe('/extensions/prometheus/health');
    expect(config.otlpHttpPort).toBe(4318);
    expect(config.collectProcessMetrics).toBe(true);
    expect(config.tracesExporterMode).toBe('none');
  });

  it('throws for invalid metrics port', () => {
    process.env.PROMETHEUS_METRICS_PORT = '0';

    expect(() => loadExtensionPrometheusConfig()).toThrow(/PROMETHEUS_METRICS_PORT/);
  });

  it('requires otlp endpoint when traces exporter mode is otlp', () => {
    process.env.OTEL_TRACES_EXPORTER_MODE = 'otlp';
    delete process.env.OTEL_TRACES_EXPORTER_OTLP_ENDPOINT;

    expect(() => loadExtensionPrometheusConfig()).toThrow(/OTEL_TRACES_EXPORTER_OTLP_ENDPOINT/);
  });

  it('loads otlp trace forward settings', () => {
    process.env.OTEL_TRACES_EXPORTER_MODE = 'otlp';
    process.env.OTEL_TRACES_EXPORTER_OTLP_ENDPOINT = 'https://tempo.example.com:4318';
    process.env.OTEL_TRACES_EXPORTER_OTLP_HEADERS = 'Authorization=Bearer abc,X-Org=1';

    const config = loadExtensionPrometheusConfig();

    expect(config.tracesExporterMode).toBe('otlp');
    expect(config.tracesExporterOtlpEndpoint).toBe('https://tempo.example.com:4318');
    expect(config.tracesExporterOtlpHeaders).toEqual({
      Authorization: 'Bearer abc',
      'X-Org': '1',
    });
  });
});

describe('parseOtlpHeadersEnv', () => {
  it('returns empty object for blank input', () => {
    expect(parseOtlpHeadersEnv(undefined)).toEqual({});
    expect(parseOtlpHeadersEnv('')).toEqual({});
  });

  it('throws for malformed header entries', () => {
    expect(() => parseOtlpHeadersEnv('not-a-header')).toThrow(/Key=Value/);
  });
});
