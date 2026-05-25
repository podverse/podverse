import { describe, expect, it } from 'vitest';

import type { ExtensionPrometheusConfig } from './config.js';
import { buildOtelcolConfigYaml } from './otelcolConfig.js';

const baseConfig: ExtensionPrometheusConfig = {
  metricsPort: 9464,
  metricsPath: '/extensions/prometheus/metrics',
  healthPath: '/extensions/prometheus/health',
  otlpHttpPort: 4318,
  collectProcessMetrics: true,
  otelcolBinaryPath: '/usr/local/bin/otelcol-contrib',
  prometheusInternalMetricsUrl: 'http://127.0.0.1:8889/metrics',
  tracesExporterMode: 'none',
  tracesExporterOtlpHeaders: {},
};

describe('buildOtelcolConfigYaml', () => {
  it('includes OTLP HTTP receiver and prometheus exporter', () => {
    const yaml = buildOtelcolConfigYaml(baseConfig);

    expect(yaml).toContain('endpoint: 127.0.0.1:4318');
    expect(yaml).toContain('namespace: podverse_extension_prometheus');
    expect(yaml).toContain('endpoint: 127.0.0.1:8889');
    expect(yaml).toContain('- otlp');
    expect(yaml).toContain('exporters:');
    expect(yaml).toContain('prometheus:');
  });

  it('omits hostmetrics when process metrics collection is disabled', () => {
    const yaml = buildOtelcolConfigYaml({
      ...baseConfig,
      collectProcessMetrics: false,
    });

    expect(yaml).not.toContain('hostmetrics:');
    expect(yaml).not.toContain('- hostmetrics');
  });

  it('includes hostmetrics when process metrics collection is enabled', () => {
    const yaml = buildOtelcolConfigYaml(baseConfig);

    expect(yaml).toContain('hostmetrics:');
    expect(yaml).toContain('- hostmetrics');
  });

  it('omits traces pipeline when traces exporter mode is none', () => {
    const yaml = buildOtelcolConfigYaml(baseConfig);

    expect(yaml).not.toMatch(/\n {4}traces:\n/);
    expect(yaml).not.toContain('debug/traces:');
  });

  it('includes debug traces pipeline when traces exporter mode is debug', () => {
    const yaml = buildOtelcolConfigYaml({
      ...baseConfig,
      tracesExporterMode: 'debug',
    });

    expect(yaml).toContain('debug/traces:');
    expect(yaml).toContain('    traces:');
    expect(yaml).toContain('- debug/traces');
  });

  it('includes otlp traces pipeline when traces exporter mode is otlp', () => {
    const yaml = buildOtelcolConfigYaml({
      ...baseConfig,
      tracesExporterMode: 'otlp',
      tracesExporterOtlpEndpoint: 'https://tempo.example.com:4318',
      tracesExporterOtlpHeaders: { Authorization: 'Bearer test-token' },
    });

    expect(yaml).toContain('otlp/traces:');
    expect(yaml).toContain('endpoint: https://tempo.example.com:4318');
    expect(yaml).toContain('Authorization: Bearer test-token');
    expect(yaml).toContain('- otlp/traces');
  });
});
