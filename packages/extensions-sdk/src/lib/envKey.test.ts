import { describe, expect, it } from 'vitest';

import { extensionEnabledEnvKey, extensionEnvKey } from './envKey.js';

describe('extensionEnvKey', () => {
  it('should normalize id and configKey to uppercase with underscores', () => {
    const result = extensionEnvKey('cloudflare-web-analytics', 'token');
    expect(result).toBe('EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN');
  });

  it('should handle existing underscores', () => {
    const result = extensionEnvKey('cloudflare_web_analytics', 'token');
    expect(result).toBe('EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN');
  });

  it('should handle mixed case', () => {
    const result = extensionEnvKey('CloudFlare-Web-Analytics', 'Token');
    expect(result).toBe('EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN');
  });

  it('should handle multiple hyphens and underscores', () => {
    const result = extensionEnvKey('my-extension_id', 'config-key_name');
    expect(result).toBe('EXTENSION_MY_EXTENSION_ID_CONFIG_KEY_NAME');
  });
});

describe('extensionEnabledEnvKey', () => {
  it('should generate the enabled key for an extension id', () => {
    const result = extensionEnabledEnvKey('cloudflare-web-analytics');
    expect(result).toBe('EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED');
  });

  it('should handle existing underscores in id', () => {
    const result = extensionEnabledEnvKey('cloudflare_web_analytics');
    expect(result).toBe('EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED');
  });

  it('should handle mixed case in id', () => {
    const result = extensionEnabledEnvKey('CloudFlare-Web-Analytics');
    expect(result).toBe('EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED');
  });
});
