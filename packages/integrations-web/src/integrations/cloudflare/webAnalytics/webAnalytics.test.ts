import { describe, expect, it } from 'vitest';

import {
  buildIntegrationsWebConfigFromEnv,
  validateIntegrationsWebConfigFromEnv,
} from '../../../config/buildIntegrationsWebConfigFromEnv';
import { parseCloudflareWebAnalyticsEnv } from './parseCloudflareWebAnalyticsEnv';

describe('parseCloudflareWebAnalyticsEnv', () => {
  it('returns disabled when env vars are unset', () => {
    expect(parseCloudflareWebAnalyticsEnv({})).toEqual({
      enabled: false,
      token: undefined,
    });
  });

  it('returns enabled with token when both are set', () => {
    expect(
      parseCloudflareWebAnalyticsEnv({
        CLOUDFLARE_WEB_ANALYTICS_ENABLED: 'true',
        CLOUDFLARE_WEB_ANALYTICS_TOKEN: 'site-token',
      })
    ).toEqual({
      enabled: true,
      token: 'site-token',
    });
  });

  it('treats blank token as missing', () => {
    expect(
      parseCloudflareWebAnalyticsEnv({
        CLOUDFLARE_WEB_ANALYTICS_ENABLED: 'true',
        CLOUDFLARE_WEB_ANALYTICS_TOKEN: '   ',
      })
    ).toEqual({
      enabled: true,
      token: undefined,
    });
  });
});

describe('buildIntegrationsWebConfigFromEnv', () => {
  it('returns the default nested integrations shape when env is empty', () => {
    expect(buildIntegrationsWebConfigFromEnv({})).toEqual({
      cloudflare: {
        webAnalytics: {
          enabled: false,
          token: undefined,
        },
      },
    });
  });

  it('maps enabled Cloudflare settings into nested config', () => {
    expect(
      buildIntegrationsWebConfigFromEnv({
        CLOUDFLARE_WEB_ANALYTICS_ENABLED: 'true',
        CLOUDFLARE_WEB_ANALYTICS_TOKEN: 'abc123',
      })
    ).toEqual({
      cloudflare: {
        webAnalytics: {
          enabled: true,
          token: 'abc123',
        },
      },
    });
  });
});

describe('validateIntegrationsWebConfigFromEnv', () => {
  it('passes when integration is disabled without a token', () => {
    expect(() => validateIntegrationsWebConfigFromEnv({})).not.toThrow();
  });

  it('passes when enabled with a token', () => {
    expect(() =>
      validateIntegrationsWebConfigFromEnv({
        CLOUDFLARE_WEB_ANALYTICS_ENABLED: 'true',
        CLOUDFLARE_WEB_ANALYTICS_TOKEN: 'site-token',
      })
    ).not.toThrow();
  });

  it('throws when enabled without a token', () => {
    expect(() =>
      validateIntegrationsWebConfigFromEnv({
        CLOUDFLARE_WEB_ANALYTICS_ENABLED: 'true',
      })
    ).toThrow(
      'CLOUDFLARE_WEB_ANALYTICS_TOKEN is required when CLOUDFLARE_WEB_ANALYTICS_ENABLED=true'
    );
  });
});
