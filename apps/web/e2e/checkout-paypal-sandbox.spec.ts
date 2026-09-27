import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const HOUR_MS = 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = Reflect.get(record, key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readEnvFile(filePath: string): Record<string, string> {
  const values: Record<string, string> = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator);
    let value = trimmed.slice(separator + 1);
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function overridesDir(): string {
  const configured = process.env.PODVERSE_HOME_OVERRIDES_DIR;
  if (configured === undefined || configured === '') {
    return path.join(os.homedir(), '.config', 'podverse', 'local-env-overrides');
  }
  if (configured === '~') {
    return os.homedir();
  }
  if (configured.startsWith('~/')) {
    return path.join(os.homedir(), configured.slice(2));
  }
  return configured;
}

function nonEmptyEnv(name: string): string | null {
  const value = process.env[name];
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function buyerCredentials(): { email: string; password: string } | null {
  const email = nonEmptyEnv('E2E_PAYPAL_SANDBOX_BUYER_EMAIL');
  const password = nonEmptyEnv('E2E_PAYPAL_SANDBOX_BUYER_PASSWORD');
  if (email === null || password === null) {
    return null;
  }
  return { email, password };
}

function merchantCredentials(): { clientId: string; clientSecret: string } {
  const filePath = path.join(overridesDir(), 'paypal.env');
  const values = fs.existsSync(filePath) ? readEnvFile(filePath) : {};
  const clientId = values.PAYPAL_CLIENT_ID ?? '';
  const clientSecret = values.PAYPAL_CLIENT_SECRET ?? '';
  if (clientId === '' || clientSecret === '') {
    throw new Error(
      'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in the home paypal.env'
    );
  }
  return { clientId, clientSecret };
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  return isRecord(parsed) ? parsed : null;
}

function subscriptionId(value: unknown): string | null {
  const record = plainRecord(value);
  return record === null ? null : readString(record, 'id');
}

function subscriptionStatus(value: unknown): string | null {
  const record = plainRecord(value);
  return record === null ? null : readString(record, 'status');
}

function approveUrl(value: unknown): string | null {
  const record = plainRecord(value);
  if (record === null) {
    return null;
  }
  const links = Reflect.get(record, 'links');
  if (!Array.isArray(links)) {
    return null;
  }
  for (const link of links) {
    if (!isRecord(link)) {
      continue;
    }
    const rel = readString(link, 'rel');
    const href = readString(link, 'href');
    if (href !== null && (rel === 'approve' || rel === 'payer-action')) {
      return href;
    }
  }
  return null;
}

function nextBillingTime(value: unknown): string | null {
  const record = plainRecord(value);
  if (record === null) {
    return null;
  }
  const billingInfo = Reflect.get(record, 'billing_info') ?? Reflect.get(record, 'billingInfo');
  if (!isRecord(billingInfo)) {
    return null;
  }
  return readString(billingInfo, 'next_billing_time') ?? readString(billingInfo, 'nextBillingTime');
}

test.describe('PayPal sandbox renewal', () => {
  test('Approving the daily plan leaves it active with the next charge one day out.', async ({
    page,
  }) => {
    // Buyer approval on the PayPal sandbox site exceeds the 10s Playwright budget.
    test.setTimeout(120_000);

    const buyer = buyerCredentials();
    test.skip(
      process.env.E2E_PAYPAL_SANDBOX !== '1' || buyer === null,
      'Set E2E_PAYPAL_SANDBOX=1 and both buyer credentials to run the live PayPal sandbox spec'
    );
    if (buyer === null) {
      return;
    }

    const merchant = merchantCredentials();
    const paypal = await import('@podverse/external-services-paypal');
    const service = new paypal.PayPalService({
      clientId: merchant.clientId,
      clientSecret: merchant.clientSecret,
      paypalEnvironment: 'sandbox',
    });

    const { planId } = await service.ensureDailyRenewalPlan();
    const created = await service.createSubscription({
      accountBillingCustomerRef: randomUUID(),
      planId,
      returnUrl: 'https://example.com/billing/paypal/return',
      cancelUrl: 'https://example.com/billing/paypal/cancel',
    });
    const createdId = subscriptionId(created);
    const approval = approveUrl(created);
    expect(createdId).not.toBeNull();
    expect(approval).not.toBeNull();
    if (createdId === null || approval === null) {
      return;
    }

    let active = false;
    try {
      await page.goto(approval);
      await page.locator('#email, #login_email').first().fill(buyer.email);
      const next = page.getByRole('button', { name: /^next$/i });
      if (await next.isVisible()) {
        await next.click();
      }
      await page.locator('#password, #login_password').first().fill(buyer.password);
      await page.getByRole('button', { name: /log in/i }).click();
      const agree = page.getByRole('button', { name: /agree/i });
      if ((await agree.count()) > 0) {
        await agree.first().click();
      } else {
        await page.getByRole('button', { name: /subscribe/i }).click();
      }

      let latest: unknown = null;
      await expect
        .poll(
          async () => {
            latest = await service.getSubscription(createdId);
            const status = subscriptionStatus(latest);
            if (status === 'ACTIVE') {
              active = true;
            }
            return status;
          },
          { timeout: 60_000 }
        )
        .toBe('ACTIVE');

      const billingAt = nextBillingTime(latest);
      expect(billingAt).not.toBeNull();
      if (billingAt === null) {
        return;
      }
      const delta = Date.parse(billingAt) - Date.now();
      expect(Number.isNaN(delta)).toBe(false);
      expect(delta).toBeGreaterThan(20 * HOUR_MS);
      expect(delta).toBeLessThan(28 * HOUR_MS);
    } finally {
      if (active) {
        await service.cancelSubscription(createdId, 'E2E daily renewal smoke');
      }
    }
  });
});
