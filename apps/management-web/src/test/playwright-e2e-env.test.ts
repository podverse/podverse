import { describe, expect, it } from 'vitest';

import { validateObservabilityConfigFromEnv } from '@podverse/observability/config';

import { buildManagementWebE2eAppEnv } from '../../playwright.management-api-env';

describe('Playwright E2E management-web app env', () => {
  it('passes observability validation for instrumentation hook', () => {
    expect(() => validateObservabilityConfigFromEnv(buildManagementWebE2eAppEnv())).not.toThrow();
  });
});
