/** Scrape payload for the prometheus extension `GET .../extensions/prometheus/metrics` route. */
export type PrometheusScrapeEndpoint = {
  contentType: string;
  getMetrics: () => Promise<string>;
};
