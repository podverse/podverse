import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Cloudflare Web Analytics integration (disabled)', () => {
  test('When Cloudflare Web Analytics is disabled, the home page does not load the beacon script', async ({
    page,
  }, testInfo) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    await expect(page.locator('#cloudflare-web-analytics')).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The home page loads without the Cloudflare Web Analytics beacon script.'
    );
  });
});
