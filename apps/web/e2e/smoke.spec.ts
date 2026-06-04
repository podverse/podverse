import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Web smoke', () => {
  test('home page loads successfully', async ({ page }, testInfo) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/podverse/i);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    await capturePageLoad(page, testInfo, 'The home page loads and shows the document body.');
  });

  test('robots endpoint responds successfully', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();
  });
});
