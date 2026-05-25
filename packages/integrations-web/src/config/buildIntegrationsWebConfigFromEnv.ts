import { parseCloudflareWebAnalyticsEnv } from '../integrations/cloudflare/webAnalytics/parseCloudflareWebAnalyticsEnv.js';
import type { IntegrationsWebConfig } from './types.js';

export function buildIntegrationsWebConfigFromEnv(env: NodeJS.ProcessEnv): IntegrationsWebConfig {
  return {
    cloudflare: {
      webAnalytics: parseCloudflareWebAnalyticsEnv(env),
    },
  };
}

export function validateIntegrationsWebConfigFromEnv(env: NodeJS.ProcessEnv): void {
  const config = buildIntegrationsWebConfigFromEnv(env);

  if (config.cloudflare.webAnalytics.enabled && !config.cloudflare.webAnalytics.token) {
    throw new Error(
      'CLOUDFLARE_WEB_ANALYTICS_TOKEN is required when CLOUDFLARE_WEB_ANALYTICS_ENABLED=true'
    );
  }
}
