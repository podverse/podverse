import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web billing checkout channels', () => {
  test('a superuser turns a checkout channel off and the row shows it disabled', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);
    let paypalIosEnabled = true;

    await page.route('**/billing/checkout-channels', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 7,
              processor_id: 'paypal',
              platform: 'ios',
              storefront_allowlist: [],
              enabled: paypalIosEnabled,
              min_client_version: null,
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      });
    });

    await page.route('**/billing/checkout-channels/7', async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.continue();
        return;
      }
      const body = route.request().postDataJSON() as { enabled?: boolean };
      if (typeof body.enabled === 'boolean') {
        paypalIosEnabled = body.enabled;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 7,
            processor_id: 'paypal',
            platform: 'ios',
            storefront_allowlist: [],
            enabled: paypalIosEnabled,
            min_client_version: null,
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    await page.locator('a[href="/billing"]').click();
    await page.waitForURL('**/billing');
    await expect(page.getByRole('heading', { name: 'Billing', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payment Processors' })).toBeVisible();
    await expect(page.getByText('PayPal', { exact: true })).toBeVisible();
    await expect(page.getByText('Apple App Store', { exact: true })).toBeVisible();
    await expect(page.getByText('Google Play', { exact: true })).toBeVisible();
    await expect(page.getByText('Off', { exact: true })).toHaveCount(3);

    await page.locator('a[href="/billing/checkout-channels"]').click();
    await page.waitForURL('**/billing/checkout-channels');
    await expect(page.getByRole('heading', { name: 'Checkout Channels', level: 1 })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'paypal' })).toBeVisible();

    const enabled = page.getByRole('checkbox', { name: 'Enabled' });
    await expect(enabled).toBeChecked();
    await enabled.uncheck();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Checkout channel updated.')).toBeVisible();
    await expect(enabled).not.toBeChecked();
    expect(paypalIosEnabled).toBe(false);

    await capturePageLoad(
      page,
      testInfo,
      'The PayPal iOS checkout channel is disabled after the superuser saves.',
      page.getByRole('cell', { name: 'paypal' })
    );
  });
});
