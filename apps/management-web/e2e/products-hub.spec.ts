import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web products hub', () => {
  test('superuser can open Products from the dashboard and reach Memberships with resolved values visible', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);
    let freeTrialExpirationSeconds = 86400;
    let trialMaxAddByRSSFeeds = 2;
    let premiumMembershipCostMonthly = 5;
    let patchRequested = false;
    let scheduleRequested = false;

    await page.route('**/products/membership', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchRequested = true;
        const postData = route.request().postDataJSON() as Record<string, unknown>;
        if (typeof postData.freeTrialExpirationSeconds === 'number') {
          freeTrialExpirationSeconds = postData.freeTrialExpirationSeconds;
        }
        if (typeof postData.trialMaxAddByRSSFeeds === 'number') {
          trialMaxAddByRSSFeeds = postData.trialMaxAddByRSSFeeds;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              freeTrialExpirationSeconds: freeTrialExpirationSeconds,
              premiumMembershipCostMonthly: premiumMembershipCostMonthly,
              premiumMembershipCostAnnually: 50,
              trialAllowDirectoryAddByRSS: false,
              trialMaxAddByRSSFeeds: trialMaxAddByRSSFeeds,
              trialMaxManualRefreshesPerHour: 3,
              trialTrackStats: false,
              trialAllowNotifications: false,
              premiumAllowDirectoryAddByRSS: true,
              premiumMaxAddByRSSFeeds: 10,
              premiumMaxManualRefreshesPerHour: 20,
              premiumTrackStats: true,
              premiumAllowNotifications: true,
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
            premiumMembershipCostMonthly: premiumMembershipCostMonthly,
            premiumMembershipCostAnnually: 50,
            trialAllowDirectoryAddByRSS: false,
            trialMaxAddByRSSFeeds: trialMaxAddByRSSFeeds,
            trialMaxManualRefreshesPerHour: 3,
            trialTrackStats: false,
            trialAllowNotifications: false,
            premiumAllowDirectoryAddByRSS: true,
            premiumMaxAddByRSSFeeds: 10,
            premiumMaxManualRefreshesPerHour: 20,
            premiumTrackStats: true,
            premiumAllowNotifications: true,
          },
        }),
      });
    });

    await page.route('**/products/pricing/active', async (route) => {
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
              amount_cents: Math.round(premiumMembershipCostMonthly * 100),
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

    await page.route('**/products/pricing/schedule', async (route) => {
      if (route.request().method() === 'POST') {
        scheduleRequested = true;
        const postData = route.request().postDataJSON() as { amountCents?: number };
        if (typeof postData.amountCents === 'number') {
          premiumMembershipCostMonthly = postData.amountCents / 100;
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 99 } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(ROUTES.HOME);
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

    await capturePageLoad(
      page,
      testInfo,
      'The memberships page shows resolved product values and active pricing rows.',
      page.getByRole('heading', { name: 'Memberships', level: 1 })
    );

    await page.getByRole('button', { name: 'Edit Free trial duration (seconds)' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit membership setting' })).toBeVisible();
    await page.getByRole('dialog').getByLabel('Free trial duration (seconds)').fill('172800');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Settings updated successfully.')).toBeVisible();
    await expect(page.getByText('172800')).toBeVisible();
    expect(patchRequested).toBe(true);

    await page.getByRole('button', { name: 'Edit Premium monthly cost' }).click();
    await page.getByRole('dialog').getByLabel('Premium monthly cost').fill('7.50');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('7.5')).toBeVisible();
    expect(scheduleRequested).toBe(true);

    patchRequested = false;
    await page.getByRole('button', { name: 'Edit Trial max Add-by-RSS feeds' }).click();
    await page.getByRole('dialog').getByLabel('Trial max Add-by-RSS feeds').fill('9');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('9')).toBeVisible();
    expect(patchRequested).toBe(true);

    await capturePageLoad(
      page,
      testInfo,
      'Membership settings updates persist on the memberships page after edits.',
      page.getByText('9')
    );
  });
});
