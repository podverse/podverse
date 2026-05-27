import { describe, expect, it } from 'vitest';

import { validateObservabilityConfigFromEnv } from '@podverse/observability/config';

import { buildManagementWebE2eAppEnv } from '../../playwright.management-api-env';

const toProcessEnv = (env: Record<string, string>): NodeJS.ProcessEnv => ({
  ...env,
  NODE_ENV: 'production',
});

describe('Playwright E2E management-web app env', () => {
  it('passes observability validation for instrumentation hook', () => {
    expect(() =>
      validateObservabilityConfigFromEnv(toProcessEnv(buildManagementWebE2eAppEnv()))
    ).not.toThrow();
  });
});
