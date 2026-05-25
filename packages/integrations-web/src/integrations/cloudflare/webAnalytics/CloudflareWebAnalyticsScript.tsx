import Script from 'next/script';

import type { CloudflareWebAnalyticsConfig } from '../../../config/types';

type CloudflareWebAnalyticsScriptProps = {
  webAnalytics: CloudflareWebAnalyticsConfig;
};

export function CloudflareWebAnalyticsScript({ webAnalytics }: CloudflareWebAnalyticsScriptProps) {
  if (!webAnalytics.enabled || !webAnalytics.token) {
    return null;
  }

  return (
    <Script
      id="cloudflare-web-analytics"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token: webAnalytics.token })}
    />
  );
}
