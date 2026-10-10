import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

import { capturePageLoad } from './helpers/stepScreenshots';

const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';

async function setMembershipExpiry(email: string, expiresAt: Date): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5732'),
    user: process.env.SEED_DB_USER ?? 'podverse_app_read_write',
    password: process.env.SEED_DB_PASSWORD ?? 'test',
    database: process.env.DB_APP_NAME ?? 'podverse_app_test',
  });
  await client.connect();
  try {
    const account = await client.query<{ id: number }>(
      `SELECT a.id
       FROM account a
       JOIN account_credentials c ON c.account_id = a.id
       WHERE c.email = $1`,
      [email]
    );
    const accountId = account.rows[0]?.id;
    if (accountId === undefined) {
      throw new Error(`No seeded account for ${email}`);
    }
    const startsAt = new Date(expiresAt.getTime() - 30 * 24 * 60 * 60 * 1000);
    await client.query(
      `UPDATE account_membership_status
       SET membership_expires_at = $2
       WHERE account_id = $1`,
      [accountId, expiresAt]
    );
    await client.query(`DELETE FROM billing_membership_grant WHERE account_id = $1`, [accountId]);
    await client.query(
      `INSERT INTO billing_membership_grant (account_id, source, starts_at, ends_at)
       VALUES ($1, 'admin', $2, $3)`,
      [accountId, startsAt, expiresAt]
    );
  } finally {
    await client.end();
  }
}

async function login(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

test.describe('Membership expiry dismissal', () => {
  test('Dismissing the expiring-soon toast keeps it hidden after reload.', async ({
    page,
  }, testInfo) => {
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 3);
    await setMembershipExpiry(LOGIN_EMAIL, expiresAt);
    await login(page);

    await page.goto('/');
    const warning = page.getByText(/expires on .+ Renew now to continue enjoying Premium features/);
    await expect(warning).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(warning).toHaveCount(0);

    await page.reload();
    await expect(warning).toHaveCount(0);
    await expect(page.getByTestId('membership-expired-banner')).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The expiring-soon toast stays hidden after reload.',
      page.locator('body')
    );
  });

  test('Dismissing the expired notice hides it until the next full load.', async ({
    page,
  }, testInfo) => {
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() - 1);
    await setMembershipExpiry(LOGIN_EMAIL, expiresAt);
    await login(page);

    await page.goto('/');
    const expiredToast = page.getByText(
      /has expired\. Renew now to continue enjoying Premium features/
    );
    const banner = page.getByTestId('membership-expired-banner');
    await expect(expiredToast).toBeVisible();
    await expect(banner).toBeVisible();

    // The expiry toast is a top-right overlay and covers the banner's trailing Dismiss.
    await page.locator('[data-rht-toaster]').getByRole('button', { name: 'Dismiss' }).click();
    await expect(expiredToast).toHaveCount(0);
    await banner.getByRole('button', { name: 'Dismiss' }).click();
    await expect(banner).toHaveCount(0);

    await page.reload();
    await expect(expiredToast).toBeVisible();
    await expect(banner).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The expired notice is back after a full reload.',
      banner
    );
  });
});
