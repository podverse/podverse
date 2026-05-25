import type { CloudflareWebAnalyticsConfig } from '../../../config/types.js';

export function parseCloudflareWebAnalyticsEnv(
  env: NodeJS.ProcessEnv
): CloudflareWebAnalyticsConfig {
  const enabled = env.CLOUDFLARE_WEB_ANALYTICS_ENABLED === 'true';
  const tokenRaw = env.CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  const token = tokenRaw !== undefined && tokenRaw.trim() !== '' ? tokenRaw.trim() : undefined;

  return { enabled, token };
}
