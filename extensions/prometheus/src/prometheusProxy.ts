export const fetchPrometheusMetricsText = async (internalMetricsUrl: string): Promise<string> => {
  const response = await fetch(internalMetricsUrl, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(
      `Prometheus exporter returned HTTP ${response.status} from ${internalMetricsUrl}`
    );
  }
  return response.text();
};
