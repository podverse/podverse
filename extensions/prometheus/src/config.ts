export type TracesExporterMode = 'debug' | 'otlp' | 'none';

export type ExtensionPrometheusConfig = {
  metricsPort: number;
  metricsPath: string;
  healthPath: string;
  otlpHttpPort: number;
  collectProcessMetrics: boolean;
  otelcolBinaryPath: string;
  prometheusInternalMetricsUrl: string;
  tracesExporterMode: TracesExporterMode;
  tracesExporterOtlpEndpoint?: string;
  tracesExporterOtlpHeaders: Record<string, string>;
};

const DEFAULT_METRICS_PORT = 9464;
const DEFAULT_METRICS_PATH = '/extensions/prometheus/metrics';
const DEFAULT_HEALTH_PATH = '/extensions/prometheus/health';
const DEFAULT_OTLP_HTTP_PORT = 4318;
const DEFAULT_INTERNAL_METRICS_URL = 'http://127.0.0.1:8889/metrics';
const DEFAULT_OTELCOL_BINARY = '/usr/local/bin/otelcol-contrib';
const DEFAULT_TRACES_EXPORTER_MODE: TracesExporterMode = 'none';

const parsePort = (raw: string | undefined, name: string, fallback: number): number => {
  const value = raw === undefined || raw.trim() === '' ? String(fallback) : raw.trim();
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port (1-65535)`);
  }
  return port;
};

const parsePath = (raw: string | undefined, name: string, fallback: string): string => {
  const value = raw === undefined || raw.trim() === '' ? fallback : raw.trim();
  if (!value.startsWith('/')) {
    throw new Error(`${name} must start with /`);
  }
  return value;
};

const isTracesExporterMode = (value: string): value is TracesExporterMode => {
  return value === 'debug' || value === 'otlp' || value === 'none';
};

const parseTracesExporterMode = (raw: string | undefined): TracesExporterMode => {
  const value = raw === undefined || raw.trim() === '' ? DEFAULT_TRACES_EXPORTER_MODE : raw.trim();
  if (!isTracesExporterMode(value)) {
    throw new Error('OTEL_TRACES_EXPORTER_MODE must be "debug", "otlp", or "none"');
  }
  return value;
};

/** Comma-separated `Key=Value` pairs (Value may contain `=` after the first). */
export const parseOtlpHeadersEnv = (raw: string | undefined): Record<string, string> => {
  if (raw === undefined || raw.trim() === '') {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const segment of raw.split(',')) {
    const trimmed = segment.trim();
    if (trimmed === '') {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      throw new Error(
        'OTEL_TRACES_EXPORTER_OTLP_HEADERS entries must use Key=Value format (comma-separated)'
      );
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key === '') {
      throw new Error('OTEL_TRACES_EXPORTER_OTLP_HEADERS keys must be non-empty');
    }
    headers[key] = value;
  }
  return headers;
};

export const loadExtensionPrometheusConfig = (): ExtensionPrometheusConfig => {
  const metricsPort = parsePort(
    process.env.PROMETHEUS_METRICS_PORT,
    'PROMETHEUS_METRICS_PORT',
    DEFAULT_METRICS_PORT
  );
  const metricsPath = parsePath(
    process.env.PROMETHEUS_METRICS_PATH,
    'PROMETHEUS_METRICS_PATH',
    DEFAULT_METRICS_PATH
  );

  const tracesExporterMode = parseTracesExporterMode(process.env.OTEL_TRACES_EXPORTER_MODE);
  const tracesExporterOtlpEndpointRaw = process.env.OTEL_TRACES_EXPORTER_OTLP_ENDPOINT?.trim();
  const tracesExporterOtlpEndpoint =
    tracesExporterOtlpEndpointRaw === '' ? undefined : tracesExporterOtlpEndpointRaw;
  const tracesExporterOtlpHeaders = parseOtlpHeadersEnv(
    process.env.OTEL_TRACES_EXPORTER_OTLP_HEADERS
  );

  if (tracesExporterMode === 'otlp') {
    if (tracesExporterOtlpEndpoint === undefined) {
      throw new Error(
        'OTEL_TRACES_EXPORTER_OTLP_ENDPOINT is required when OTEL_TRACES_EXPORTER_MODE=otlp'
      );
    }
  }

  return {
    metricsPort,
    metricsPath,
    healthPath: DEFAULT_HEALTH_PATH,
    otlpHttpPort: parsePort(
      process.env.OTEL_RECEIVER_OTLP_HTTP_PORT,
      'OTEL_RECEIVER_OTLP_HTTP_PORT',
      DEFAULT_OTLP_HTTP_PORT
    ),
    collectProcessMetrics: process.env.PROMETHEUS_COLLECT_PROCESS_METRICS !== 'false',
    otelcolBinaryPath:
      process.env.OTELCOL_CONTRIB_BINARY === undefined ||
      process.env.OTELCOL_CONTRIB_BINARY.trim() === ''
        ? DEFAULT_OTELCOL_BINARY
        : process.env.OTELCOL_CONTRIB_BINARY.trim(),
    prometheusInternalMetricsUrl:
      process.env.PROMETHEUS_INTERNAL_METRICS_URL === undefined ||
      process.env.PROMETHEUS_INTERNAL_METRICS_URL.trim() === ''
        ? DEFAULT_INTERNAL_METRICS_URL
        : process.env.PROMETHEUS_INTERNAL_METRICS_URL.trim(),
    tracesExporterMode,
    tracesExporterOtlpEndpoint,
    tracesExporterOtlpHeaders,
  };
};
