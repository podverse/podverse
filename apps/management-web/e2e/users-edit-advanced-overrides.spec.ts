import { expect, test } from '@playwright/test';

import { buildUserEditPath, ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * User and product-membership endpoints are mocked so default override display is deterministic.
 */

const MOCK_USER = {
  id: 9001,
  id_text: 'e2e_edit_user_id',
  verified: true,
  email: 'e2e-edit-user@example.com',
  username: 'e2e_edit_user',
  sharable_status_id: 1,
  created_at: '2026-01-15T12:00:00.000Z',
  account_membership_id: 1,
  membership_expires_at: '2030-01-01T00:00:00.000Z',
  allow_directory_add_by_rss: null,
  max_add_by_rss_feeds: null,
  max_manual_refreshes_per_hour: null,
  track_stats: null,
  allow_notifications: null,
};

const PRODUCT_MEMBERSHIP = {
  freeTrialExpirationSeconds: 86400,
  premiumMembershipCostMonthly: 3,
  premiumMembershipCostAnnually: 30,
  trialAllowDirectoryAddByRSS: false,
  trialMaxAddByRSSFeeds: 6,
  trialMaxManualRefreshesPerHour: 3,
  trialTrackStats: false,
  trialAllowNotifications: false,
  premiumAllowDirectoryAddByRSS: true,
  premiumMaxAddByRSSFeeds: 100,
  premiumMaxManualRefreshesPerHour: 20,
  premiumTrackStats: true,
  premiumAllowNotifications: true,
};

test.describe('Management-web user edit advanced overrides', () => {
  test('a superuser sees effective defaults for unset advanced overrides', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route('**/api/v2/users/9001', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      });
    });

    await page.route('**/products/membership', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: PRODUCT_MEMBERSHIP }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(buildUserEditPath('9001', 'profile'));

    await expect(page.getByRole('heading', { name: 'Edit User', level: 1 })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Configure advanced feature overrides' }).check();

    await expect(page.locator('#edit-user-add-by-rss-value')).toHaveText('Default (Block)');
    await expect(page.locator('#edit-user-track-stats-value')).toHaveText(
      'Default (Do not track stats)'
    );
    await expect(page.locator('#edit-user-notifications-value')).toHaveText(
      'Default (Block notifications)'
    );
    await expect(page.locator('#edit-user-rss-limit')).toHaveAttribute('placeholder', 'Default: 6');
    await expect(page.locator('#edit-user-refresh-limit')).toHaveAttribute(
      'placeholder',
      'Default: 3'
    );

    await capturePageLoad(
      page,
      testInfo,
      'Edit user advanced overrides show effective defaults from product membership.',
      page.locator('#edit-user-add-by-rss-value')
    );
  });
});
