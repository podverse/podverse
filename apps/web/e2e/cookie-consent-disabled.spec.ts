import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Cookie consent banner (disabled)', () => {
  test('When the cookie consent banner is disabled, the home page loads without the banner region.', async ({
    page,
  }, testInfo) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    await expect(page.getByRole('region', { name: /cookie/i })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The home page loads without the cookie consent banner when the feature is disabled.'
    );
  });
});
