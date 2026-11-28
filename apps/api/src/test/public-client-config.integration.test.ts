import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ACCOUNT_SIGNUP_MODE_VALUES } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  getBaseApiUrl,
  IntegrationTestNoopCategoryService,
  startTestApp,
  stopTestApp,
} from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  return {
    ...actual,
    CategoryService: IntegrationTestNoopCategoryService,
  };
});

function isAccountSignupMode(value: unknown): boolean {
  return ACCOUNT_SIGNUP_MODE_VALUES.some((mode) => mode === value);
}

describe('GET /config', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let configBase: string;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    const base = await getBaseApiUrl();
    configBase = `${base}/config`;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('returns 200 with no cookie and no API key', async () => {
    const { config } = await import('@api/config/index.js');
    const configRes = await request(app).get(configBase);

    expect(configRes.status).toBe(200);
    expect(configRes.body.data.playlistLimits).toEqual({
      maxPerPlaylist: 5,
      nameMaxLength: 50,
    });

    const instance = configRes.body.data.instance;
    expect(instance.brandName).toBe(config.brandName);
    expect(isAccountSignupMode(instance.signupMode)).toBe(true);
    expect(instance.signupMode).toBe(config.premium.signupMode);
    expect(instance.statsRetentionDays).toEqual(expect.any(Number));
    expect(instance.statsRetentionDays).toBeGreaterThan(0);
    expect(Number.isInteger(instance.statsRetentionDays)).toBe(true);
    expect(typeof instance.legalName).toBe('string');
    expect(typeof instance.contactEmail).toBe('string');
    expect(typeof instance.termsVersion).toBe('string');
    expect(typeof instance.tasteProfileAgreementVersion).toBe('string');
  });
});
