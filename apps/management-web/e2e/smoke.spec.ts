import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Management-web smoke', () => {
  test('login page loads successfully', async ({ page }, testInfo) => {
    await page.goto(ROUTES.HOME);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    await capturePageLoad(page, testInfo, 'The management-web login page loads successfully.');
  });
});
