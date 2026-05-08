import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * List endpoint is mocked so the table chrome is deterministic.
 */

const MOCK_USER = {
  id: 9001,
  id_text: 'e2e_list_user_id',
  verified: true,
  email: 'e2e-list-user@example.com',
  username: 'e2e_list_user',
  sharable_status_id: 1,
  created_at: '2026-01-15T12:00:00.000Z',
  account_membership_id: 1,
  membership_expires_at: null,
  allow_directory_add_by_rss: null,
  max_add_by_rss_feeds: null,
  max_manual_refreshes_per_hour: null,
  track_stats: null,
  allow_notifications: null,
};

test.describe('Management-web users list', () => {
  test('when the users API returns rows, the list shows sortable headers and can delete with confirmation', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    let includeUserAfterDelete = true;

    await page.route('**/api/v2/users**', async (route) => {
      if (route.request().method() === 'DELETE') {
        includeUserAfterDelete = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'deleted' }),
        });
        return;
      }
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const users = includeUserAfterDelete ? [MOCK_USER] : [];
      const total = includeUserAfterDelete ? 1 : 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users,
          pagination: {
            page: 1,
            limit: 25,
            total,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/users');
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Sort by Email' })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'e2e-list-user@example.com', exact: true })
    ).toBeVisible();

    const userRow = page.getByRole('row', { name: /e2e-list-user@example.com/ });
    await userRow.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(
      page.getByText('No data found yet. This page will be enabled when there is data to display.')
    ).toBeVisible();
  });

  test('when the users API reports zero users, table tools are hidden and the system empty message is shown', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await page.route('**/api/v2/users**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [],
          pagination: {
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();

    await expect(page.getByPlaceholder('Search')).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Create New' })).not.toBeVisible();
    await expect(
      page.getByText('No data found yet. This page will be enabled when there is data to display.')
    ).toBeVisible();
  });

  test('when the users list refetches, the sortable header stays mounted', async ({ page }) => {
    test.setTimeout(45_000);

    let listCalls = 0;

    await page.route('**/api/v2/users**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      listCalls += 1;
      if (listCalls >= 2) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 900);
        });
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [MOCK_USER],
          pagination: {
            page: 1,
            limit: 25,
            total: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/users');
    await expect(page.getByRole('button', { name: 'Sort by Email' })).toBeVisible();

    await page.getByPlaceholder('Search').fill('refetch-trigger');

    await expect(page.getByRole('button', { name: 'Sort by Email' })).toBeVisible();

    await expect.poll(async () => listCalls >= 2).toBeTruthy();

    await expect(page.getByRole('button', { name: 'Sort by Email' })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'e2e-list-user@example.com', exact: true })
    ).toBeVisible();
  });
});
