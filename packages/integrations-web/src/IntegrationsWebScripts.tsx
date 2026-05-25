import type { IntegrationsWebConfig } from './config/types';
import { CloudflareWebAnalyticsScript } from './integrations/cloudflare/webAnalytics/CloudflareWebAnalyticsScript';

type IntegrationsWebScriptsProps = {
  integrations: IntegrationsWebConfig;
};

export function IntegrationsWebScripts({ integrations }: IntegrationsWebScriptsProps) {
  return <CloudflareWebAnalyticsScript webAnalytics={integrations.cloudflare.webAnalytics} />;
}
