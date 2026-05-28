export type CloudflareWebAnalyticsConfig = {
  enabled: boolean;
  token?: string;
};

export type IntegrationsWebConfig = {
  cloudflare: {
    webAnalytics: CloudflareWebAnalyticsConfig;
  };
};
