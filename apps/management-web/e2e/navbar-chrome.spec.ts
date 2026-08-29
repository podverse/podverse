import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management layout navbar chrome', () => {
  test('the dashboard shows the management shell bar with a dashboard brand link and account menu', async ({
    page,
  }, testInfo) => {
    await page.goto(ROUTES.HOME);

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    const chrome = page.locator('[data-appearance="management"]');
    await expect(chrome).toBeVisible();

    const brandToDashboard = chrome.locator('a[href="/dashboard"]').first();
    await expect(brandToDashboard).toBeVisible();
    await expect(brandToDashboard).not.toHaveText('');

    await page.getByRole('button', { name: 'Account menu' }).click();
    await expect(page.getByText(/Role:/)).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The dashboard shows management shell chrome and the account menu with role text.',
      page.getByText(/Role:/)
    );
  });

  test('clicking a dashboard nav card shows a loading overlay until the destination route is ready', async ({
    page,
  }, testInfo) => {
    await page.goto(ROUTES.HOME);

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    const usersNavLink = page.getByRole('link', { name: 'Users' });
    await expect(usersNavLink).toBeVisible();

    const loadingOverlay = page.getByLabel('Loading…');

    await Promise.all([
      loadingOverlay.waitFor({ state: 'visible', timeout: 10_000 }),
      usersNavLink.click(),
    ]);

    await page.waitForURL('**/users');
    await expect(loadingOverlay).toBeHidden();

    await capturePageLoad(
      page,
      testInfo,
      'The users list page is visible after route navigation and the loading overlay is dismissed.',
      page.getByRole('heading', { name: 'Users' })
    );
  });
});
