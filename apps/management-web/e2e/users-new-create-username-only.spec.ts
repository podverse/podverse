import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 *
 * Validates that the Create User form accepts a username-only submission
 * (no email, no password) and renders the generated invite link panel.
 */

const STORAGE_EXPIRY_KEY = 'podverse-mgmt-create-user-membership-expires-at';

test.describe('Management-web create user (username-only)', () => {
  test('a superuser can create a user with username only and receives an invite link', async ({
    page,
  }) => {
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

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/users/new');

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
  });

  test('the Create User form shows membership status and advanced overrides toggle', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/users/new');

    await expect(page.getByRole('heading', { name: 'Create User', level: 1 })).toBeVisible();
    await expect(page.getByText('Membership Status', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Membership Status')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Configure advanced feature overrides' })
    ).toBeVisible();
  });

  test('default membership expiry reflects product GET freeTrialExpirationSeconds', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    const trialSeconds = 7200;

    await page.route('**/product/membership', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            freeTrialExpirationSeconds: trialSeconds,
            premiumMembershipCostMonthly: 3,
            premiumMembershipCostAnnually: 30,
            trialMaxAddByRSSFeeds: 10,
            trialMaxManualRefreshesPerHour: 5,
            premiumMaxAddByRSSFeeds: 100,
            premiumMaxManualRefreshesPerHour: 20,
          },
        }),
      });
    });

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.evaluate((key) => {
      window.localStorage.removeItem(key);
    }, STORAGE_EXPIRY_KEY);

    await page.goto('/users/new');

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
  });
});
