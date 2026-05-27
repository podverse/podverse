import { describe, expect, it } from 'vitest';

import { validateObservabilityConfigFromEnv } from '@podverse/observability/config';

import { buildE2eWebAppEnv } from '../../playwright.e2e-server-env';

describe('Playwright E2E web app env', () => {
  it('passes observability validation for instrumentation hook', () => {
    expect(() => validateObservabilityConfigFromEnv(buildE2eWebAppEnv())).not.toThrow();
  });
});
