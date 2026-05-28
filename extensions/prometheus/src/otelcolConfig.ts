import type { ExtensionPrometheusConfig } from './config.js';

const PROMETHEUS_NAMESPACE = 'podverse_extension_prometheus';

const formatYamlHeaders = (headers: Record<string, string>): string => {
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return '';
  }
  const lines = entries.map(([key, value]) => `        ${key}: ${value}`);
  return `\n    headers:\n${lines.join('\n')}`;
};

const buildTraceExportersBlock = (config: ExtensionPrometheusConfig): string => {
  if (config.tracesExporterMode === 'none') {
    return '';
  }

  if (config.tracesExporterMode === 'debug') {
    return `
  debug/traces:
    verbosity: basic`;
  }

  const headersBlock = formatYamlHeaders(config.tracesExporterOtlpHeaders);
  return `
  otlp/traces:
    endpoint: ${config.tracesExporterOtlpEndpoint}${headersBlock}`;
};

const buildTraceExporterRef = (config: ExtensionPrometheusConfig): string => {
  if (config.tracesExporterMode === 'debug') {
    return 'debug/traces';
  }
  if (config.tracesExporterMode === 'otlp') {
    return 'otlp/traces';
  }
  return '';
};

const buildTracesPipelineBlock = (config: ExtensionPrometheusConfig): string => {
  const exporterRef = buildTraceExporterRef(config);
  if (exporterRef === '') {
    return '';
  }

  return `
    traces:
      receivers:
        - otlp
      processors:
        - batch
      exporters:
        - ${exporterRef}`;
};

export const buildOtelcolConfigYaml = (config: ExtensionPrometheusConfig): string => {
  const hostMetricsBlock = config.collectProcessMetrics
    ? `
  hostmetrics:
    collection_interval: 15s
    scrapers:
      process:
        mute_process_name_error: true
      memory:
      cpu:
`
    : '';

  const hostMetricsPipeline = config.collectProcessMetrics
    ? `
        - hostmetrics`
    : '';

  const traceExportersBlock = buildTraceExportersBlock(config);
  const tracesPipelineBlock = buildTracesPipelineBlock(config);

  return `receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:${config.otlpHttpPort}
${hostMetricsBlock}
processors:
  batch:

exporters:
  prometheus:
    endpoint: 127.0.0.1:8889
    namespace: ${PROMETHEUS_NAMESPACE}
    send_timestamps: true
    metric_expiration: 5m
    enable_open_metrics: true${traceExportersBlock}

service:
  telemetry:
    logs:
      level: warn
  pipelines:
    metrics:
      receivers:
        - otlp${hostMetricsPipeline}
      processors:
        - batch
      exporters:
        - prometheus${tracesPipelineBlock}
`;
};
