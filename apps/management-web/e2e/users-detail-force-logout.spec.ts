import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { buildUserEditPath, buildUserPath, ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * User GET and the force-logout POST are mocked.
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
  maxAddByRSSFeeds: 6,
  trialMaxManualRefreshesPerHour: 3,
  trialTrackStats: false,
  trialAllowNotifications: true,
  premiumAllowDirectoryAddByRSS: true,
  premiumMaxManualRefreshesPerHour: 20,
  premiumTrackStats: true,
  premiumAllowNotifications: true,
};

const FORCE_LOGOUT_SUCCESS = 'This user was signed out of every device.';

async function installUserReadMocks(page: Page) {
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

  await page.route('**/api/v2/users/9001/invite-link', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ invite_link: null }),
    });
  });
}

async function signIn(page: Page) {
  await page.goto(ROUTES.HOME);
  await page.locator('#email').fill('e2e-superadmin@example.com');
  await page.locator('#password').fill('Test!1Aa');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Management-web user force logout', () => {
  test('When a superuser confirms Force Logout, the user detail page stays open and says the user was signed out of every device.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000); // Sign-in plus the user page load exceeds the default.

    await installUserReadMocks(page);

    let forceLogoutPosts = 0;
    await page.route('**/api/v2/users/9001/force-logout', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      forceLogoutPosts += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'User signed out', sessions_ended: 2 }),
      });
    });

    await signIn(page);
    await page.goto(buildUserPath('9001'));

    await expect(page).toHaveURL(/\/users\/9001$/);
    await expect(page.getByRole('heading', { name: 'User detail', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Force Logout' }).click();
    const dialog = page.getByRole('dialog', { name: 'Confirm Force Logout' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText('Sign this user out of every device? They will need to sign in again.', {
        exact: true,
      })
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Confirm' }).click();
    const success = page.getByText(FORCE_LOGOUT_SUCCESS, { exact: true });
    await expect(success).toBeVisible();
    await expect(page).toHaveURL(/\/users\/9001$/);
    expect(forceLogoutPosts).toBe(1);

    await capturePageLoad(
      page,
      testInfo,
      'Force Logout success stays on the user detail page.',
      success
    );
  });

  test('When a superuser cancels Force Logout, no sign-out request is sent and the dialog closes.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000); // Sign-in plus the user page load exceeds the default.

    await installUserReadMocks(page);

    let forceLogoutPosts = 0;
    await page.route('**/api/v2/users/9001/force-logout', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      forceLogoutPosts += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'User signed out', sessions_ended: 0 }),
      });
    });

    await signIn(page);
    await page.goto(buildUserPath('9001'));

    await expect(page).toHaveURL(/\/users\/9001$/);
    const forceLogoutButton = page.getByRole('button', { name: 'Force Logout' });
    await expect(forceLogoutButton).toBeVisible();

    await forceLogoutButton.click();
    const dialog = page.getByRole('dialog', { name: 'Confirm Force Logout' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(forceLogoutButton).toBeVisible();
    expect(forceLogoutPosts).toBe(0);

    await capturePageLoad(
      page,
      testInfo,
      'Cancel closes Force Logout and sends no sign-out request.',
      forceLogoutButton
    );
  });

  test('When force logout fails, the page shows the failure sentence and does not show the success sentence.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000); // Sign-in plus the user page load exceeds the default.

    await installUserReadMocks(page);

    await page.route('**/api/v2/users/9001/force-logout', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'nope' }),
      });
    });

    await signIn(page);
    await page.goto(buildUserPath('9001'));

    await expect(page).toHaveURL(/\/users\/9001$/);
    await expect(page.getByRole('heading', { name: 'User detail', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Force Logout' }).click();
    const dialog = page.getByRole('dialog', { name: 'Confirm Force Logout' });
    await dialog.getByRole('button', { name: 'Confirm' }).click();

    const failure = page.getByText('Failed to sign this user out.', { exact: true });
    await expect(failure).toBeVisible();
    await expect(page.getByText(FORCE_LOGOUT_SUCCESS, { exact: true })).toBeHidden();

    await capturePageLoad(
      page,
      testInfo,
      'Force Logout failure replaces the detail shell.',
      failure
    );
  });

  test('When a superuser saves a new password, the edit page says the user was signed out of every device.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000); // Sign-in plus the user page load exceeds the default.

    await installUserReadMocks(page);

    await page.route('**/api/v2/users/9001/password', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Password updated' }),
      });
    });

    await signIn(page);
    await page.goto(buildUserEditPath('9001', 'password'));

    await expect(page).toHaveURL(/tab=password/);
    await expect(page.getByRole('heading', { name: 'Edit user', level: 1 })).toBeVisible();

    await page.locator('#edit-user-new-password').fill('newpassword123');
    await page.getByRole('button', { name: 'Save changes' }).click();

    const success = page.getByText('Password changed. This user was signed out of every device.', {
      exact: true,
    });
    await expect(success).toBeVisible();
    await expect(page).toHaveURL(/\/users\/9001\/edit/);

    await capturePageLoad(
      page,
      testInfo,
      'Password save says the user was signed out of every device.',
      success
    );
  });
});
