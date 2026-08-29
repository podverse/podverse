import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 *
 * Validates that the Create User form accepts a username-only submission
 * (no email, no password) and renders the generated invite link panel.
 */

const STORAGE_EXPIRY_KEY = 'podverse-mgmt-create-user-membership-expires-at';

function productMembershipData(trialSeconds = 86400) {
  return {
    freeTrialExpirationSeconds: trialSeconds,
    premiumMembershipCostMonthly: 3,
    premiumMembershipCostAnnually: 30,
    trialAllowDirectoryAddByRSS: false,
    trialMaxAddByRSSFeeds: 7,
    trialMaxManualRefreshesPerHour: 4,
    trialTrackStats: false,
    trialAllowNotifications: false,
    premiumAllowDirectoryAddByRSS: true,
    premiumMaxAddByRSSFeeds: 100,
    premiumMaxManualRefreshesPerHour: 20,
    premiumTrackStats: true,
    premiumAllowNotifications: true,
  };
}

function productMembershipBody(trialSeconds = 86400): string {
  return JSON.stringify({ data: productMembershipData(trialSeconds) });
}

test.describe('Management-web create user (username-only)', () => {
  test('a superuser can create a user with username only and receives an invite link', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    const sentBodies: Record<string, unknown>[] = [];

    await page.route('**/users', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      sentBodies.push(body);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'User created. Invite link generated.',
          set_password_url: 'https://example.com/set-password?token=test-token-abc',
        }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(ROUTES.USERS_NEW);

    await expect(page.getByRole('heading', { name: 'Create User', level: 1 })).toBeVisible();

    await page.locator('#username').fill('e2e_username_only');
    await page.getByRole('button', { name: 'Create User' }).first().click();

    const inviteLinkInput = page.locator('#invite-link');
    await expect(inviteLinkInput).toBeVisible();
    await expect(inviteLinkInput).toHaveValue(
      'https://example.com/set-password?token=test-token-abc'
    );

    expect(sentBodies[0]).toMatchObject({
      username: 'e2e_username_only',
      account_membership_id: 1,
      allow_directory_add_by_rss: null,
      max_add_by_rss_feeds: null,
      max_manual_refreshes_per_hour: null,
      track_stats: null,
      allow_notifications: null,
    });
    const body = sentBodies[0] as Record<string, unknown>;
    expect(typeof body.membership_expires_at).toBe('string');
    expect(String(body.membership_expires_at)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?$/
    );

    await capturePageLoad(
      page,
      testInfo,
      'Create user with username only shows the generated invite link.',
      inviteLinkInput
    );
  });

  test('a superuser is redirected to the users list after create when the API returns no invite link', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route('**/products/membership', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: productMembershipBody(),
      });
    });

    await page.route('**/users', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'User created.',
        }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(ROUTES.USERS_NEW);

    await expect(page.getByRole('heading', { name: 'Create User', level: 1 })).toBeVisible();

    await page.locator('#username').fill('e2e_no_invite_redirect');
    await page.getByRole('button', { name: 'Create User' }).first().click();

    await expect(page).toHaveURL(/\/users$/);

    await capturePageLoad(
      page,
      testInfo,
      'After create without invite link, the user is redirected to the users list.',
      page.getByRole('heading', { name: 'Users', level: 1 })
    );
  });

  test('the Create User form shows membership status and advanced overrides toggle', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route('**/products/membership', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: productMembershipBody(),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(ROUTES.USERS_NEW);

    await expect(page.getByRole('heading', { name: 'Create User', level: 1 })).toBeVisible();
    await expect(page.getByText('Membership Status', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Membership Status')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Configure advanced feature overrides' })
    ).toBeVisible();
    await page.getByRole('checkbox', { name: 'Configure advanced feature overrides' }).check();
    await expect(page.locator('#allow-directory-add-value')).toHaveText('Default (Block)');
    await expect(page.locator('#track-stats-value')).toHaveText('Default (Do not track stats)');
    await expect(page.locator('#allow-notifications-value')).toHaveText(
      'Default (Block notifications)'
    );
    await expect(page.locator('#max-add-by-rss-feeds')).toHaveAttribute(
      'placeholder',
      'Default: 7'
    );
    await expect(page.locator('#max-manual-refreshes')).toHaveAttribute(
      'placeholder',
      'Default: 4'
    );

    await capturePageLoad(
      page,
      testInfo,
      'Advanced overrides expand with effective default labels on create user.',
      page.locator('#allow-directory-add-value')
    );
  });

  test('default membership expiry reflects product GET freeTrialExpirationSeconds', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    const trialSeconds = 7200;

    await page.route('**/products/membership', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: productMembershipData(trialSeconds),
        }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.evaluate((key) => {
      window.localStorage.removeItem(key);
    }, STORAGE_EXPIRY_KEY);

    await page.goto(ROUTES.USERS_NEW);

    await expect(page.getByRole('heading', { name: 'Create User', level: 1 })).toBeVisible();

    const expiryInput = page.locator('#membership-expires-at');
    await expect(expiryInput).toBeVisible();

    const deltaMs = await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>('#membership-expires-at');
      const val = el?.value;
      if (val === undefined || val === '') {
        return null;
      }
      const parsed = new Date(val);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed.getTime() - Date.now();
    });

    expect(deltaMs).not.toBeNull();
    expect(deltaMs).toBeGreaterThan(trialSeconds * 1000 - 120_000);
    expect(deltaMs).toBeLessThan(trialSeconds * 1000 + 120_000);

    await capturePageLoad(
      page,
      testInfo,
      'Default membership expiry reflects product freeTrialExpirationSeconds.',
      expiryInput
    );
  });
});
