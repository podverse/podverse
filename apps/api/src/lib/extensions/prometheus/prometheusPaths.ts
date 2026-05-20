/** Metrics resource path under the prometheus extension (after versioned API base). */
export const PROMETHEUS_METRICS_PATH = '/extensions/prometheus/metrics';

export const prometheusMetricsRoutePath = (apiVersionBasePath: string): string =>
  `${apiVersionBasePath}${PROMETHEUS_METRICS_PATH}`;
