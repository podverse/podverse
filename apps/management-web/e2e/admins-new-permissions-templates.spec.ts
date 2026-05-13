import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 */

const ROLES_FIXTURE = {
  roles: [
    {
      id: 'everything',
      name_key: 'managementAdminRoles.everything',
      name: null,
      is_predefined: true,
      feeds_crud: 15,
      feed_takedown_reasons_crud: 15,
      admins_crud: 15,
      stats_crud: 15,
      billing_prices_crud: 15,
      bucket_crud: 15,
      created_at: null,
    },
    {
      id: 'storage_full',
      name_key: 'managementAdminRoles.storageFull',
      name: null,
      is_predefined: true,
      feeds_crud: 0,
      feed_takedown_reasons_crud: 0,
      admins_crud: 0,
      stats_crud: 0,
      billing_prices_crud: 0,
      bucket_crud: 15,
      created_at: null,
    },
  ],
};

test.describe('Create admin page for the authenticated superuser', () => {
  test('when the user opens create admin, permission templates load and bulk shortcut buttons are available', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await page.route('**/api/v2/admins/roles', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ROLES_FIXTURE),
      });
    });

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/admins/new');
    await expect(page.getByRole('heading', { name: 'Create Admin', level: 1 })).toBeVisible();

    await expect(page.getByText('Permission template')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select all permissions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear all permissions' })).toBeVisible();
    await expect(page.getByText('Billing prices')).toBeVisible();
  });
});
