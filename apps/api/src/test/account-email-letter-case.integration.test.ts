import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
  };
});

const PASSWORD = 'Letter-case1';

describe('account email letter case', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let authBase: string;
  let accountCounter = 0;

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for email letter-case integration test');
    }
    authBase = `${await getBaseApiUrl()}/auth`;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  function uniqueLocalPart(): string {
    accountCounter += 1;
    return `letter-case-${Date.now()}-${accountCounter}`;
  }

  async function readStoredEmail(accountId: number): Promise<string | null> {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    const rows: unknown = await ormContext.dataSourceReadWrite.query(
      'SELECT email FROM account_credentials WHERE account_id = $1',
      [accountId]
    );
    const row = Array.isArray(rows) ? rows[0] : undefined;
    const email: unknown =
      typeof row === 'object' && row !== null ? Reflect.get(row, 'email') : undefined;
    return typeof email === 'string' ? email : null;
  }

  async function createVerifiedAccount(email: string): Promise<number> {
    const { AccountService } = await import('@podverse/orm');
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: PASSWORD,
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('Failed to load account after create');
    }
    await accountService.verifyEmail(account.id);
    return account.id;
  }

  it('stores a signup address in lowercase and signs in with any letter case', async () => {
    const localPart = uniqueLocalPart();
    const accountId = await createVerifiedAccount(`  ${localPart.toUpperCase()}@Example.COM `);

    expect(await readStoredEmail(accountId)).toBe(`${localPart}@example.com`);

    const web = await request(app)
      .post(`${authBase}/login`)
      .send({ email: `${localPart.toUpperCase()}@EXAMPLE.com`, password: PASSWORD });
    expect(web.status).toBe(200);

    const mobile = await request(app)
      .post(`${authBase}/mobile/token`)
      .send({ email: `${localPart}@example.com`, password: PASSWORD, device_label: 'Test Phone' });
    expect(mobile.status).toBe(200);
  });

  it('refuses a second signup that differs only by letter case', async () => {
    const localPart = uniqueLocalPart();
    await createVerifiedAccount(`${localPart}@example.com`);
    const { AccountService } = await import('@podverse/orm');

    await expect(
      new AccountService().create({
        email: `${localPart.toUpperCase()}@EXAMPLE.COM`,
        password: PASSWORD,
        locale: 'en-US',
        terms_version: '2026-10-15',
      })
    ).rejects.toThrow();
  });

  it('refuses to store an address that is not already lowercase', async () => {
    const localPart = uniqueLocalPart();
    const accountId = await createVerifiedAccount(`${localPart}@example.com`);
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    await expect(
      ormContext.dataSourceReadWrite.query(
        'UPDATE account_credentials SET email = $1 WHERE account_id = $2',
        [`${localPart.toUpperCase()}@Example.com`, accountId]
      )
    ).rejects.toThrow(/chk_account_credentials_email_lowercase/);
  });
});
