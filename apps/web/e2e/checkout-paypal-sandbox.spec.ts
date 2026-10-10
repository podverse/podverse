import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

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
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in the home paypal.env');
  }
  return { clientId, clientSecret };
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  return isRecord(parsed) ? parsed : null;
}

function orderId(value: unknown): string | null {
  const record = plainRecord(value);
  return record === null ? null : readString(record, 'id');
}

function orderStatus(value: unknown): string | null {
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

async function approveOrder(
  page: Page,
  approval: string,
  buyer: { email: string; password: string }
): Promise<void> {
  await page.goto(approval);
  await page.locator('#email, #login_email').first().fill(buyer.email);
  const next = page.getByRole('button', { name: /^next$/i });
  if (await next.isVisible()) {
    await next.click();
  }
  await page.locator('#password, #login_password').first().fill(buyer.password);
  await page.getByRole('button', { name: /log in/i }).click();
  const pay = page.getByRole('button', { name: /pay now|agree|continue|complete purchase/i });
  await pay.first().click();
  await page.waitForURL(/example\.com\/billing\/paypal\/return/);
}

test.describe('PayPal sandbox orders', () => {
  test('Approving a PayPal order captures the one-time purchase.', async ({ page }) => {
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

    const created = await service.createOrder({
      accountBillingCustomerRef: randomUUID(),
      cadence: 'monthly',
      amount: '3.00',
      currencyCode: 'USD',
      returnUrl: 'https://example.com/billing/paypal/return',
      cancelUrl: 'https://example.com/billing/paypal/cancel',
    });
    const createdId = orderId(created);
    const approval = approveUrl(created);
    expect(createdId).not.toBeNull();
    expect(approval).not.toBeNull();
    if (createdId === null || approval === null) {
      return;
    }

    await approveOrder(page, approval, buyer);
    const captured = await service.captureOrder({ orderId: createdId });
    expect(orderStatus(captured)).toBe('COMPLETED');
  });
});
