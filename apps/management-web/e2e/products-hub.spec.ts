import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web products hub', () => {
  test('superuser can open Products from the dashboard and reach Memberships with resolved values visible', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    let freeTrialExpirationSeconds = 86400;
    let patchRequested = false;

    await page.route('**/product/membership', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchRequested = true;
        const postData = route.request().postDataJSON() as { freeTrialExpirationSeconds: number };
        freeTrialExpirationSeconds = postData.freeTrialExpirationSeconds;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              freeTrialExpirationSeconds: freeTrialExpirationSeconds,
              premiumMembershipCostMonthly: 5,
              premiumMembershipCostAnnually: 50,
              trialMaxAddByRSSFeeds: 2,
              trialMaxManualRefreshesPerHour: 3,
              premiumMaxAddByRSSFeeds: 10,
              premiumMaxManualRefreshesPerHour: 20,
            },
          }),
        });
        return;
      }
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            freeTrialExpirationSeconds: freeTrialExpirationSeconds,
            premiumMembershipCostMonthly: 5,
            premiumMembershipCostAnnually: 50,
            trialMaxAddByRSSFeeds: 2,
            trialMaxManualRefreshesPerHour: 3,
            premiumMaxAddByRSSFeeds: 10,
            premiumMaxManualRefreshesPerHour: 20,
          },
        }),
      });
    });

    await page.route('**/product/pricing/active', async (route) => {
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
              id: 1,
              product_code: 'membership_premium',
              currency_code: 'USD',
              billing_cadence: 'monthly',
              amount_cents: 500,
              effective_from: '2026-05-01T00:00:00.000Z',
              effective_to: null,
              source: 'management_api',
            },
            {
              id: 2,
              product_code: 'membership_premium',
              currency_code: 'USD',
              billing_cadence: 'annual',
              amount_cents: 5000,
              effective_from: '2026-05-01T00:00:00.000Z',
              effective_to: null,
              source: 'management_api',
            },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.locator('a[href="/products"]').click();
    await page.waitForURL('**/products');

    await expect(page.getByRole('heading', { name: 'Products', level: 1 })).toBeVisible();
    await page.locator('a[href="/products/memberships"]').click();
    await page.waitForURL('**/products/memberships');

    await expect(page.getByRole('heading', { name: 'Memberships', level: 1 })).toBeVisible();
    await expect(page.getByText('86400')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Active pricing rows', level: 2 })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sort by Cadence' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'monthly', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'annual', exact: true })).toBeVisible();
    await page.locator('#free-trial-expiration-seconds-input').fill('172800');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Trial duration updated successfully.')).toBeVisible();
    await expect(page.getByText('172800')).toBeVisible();
    expect(patchRequested).toBe(true);
  });
});
