import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Cloudflare Web Analytics integration (enabled)', () => {
  test('When Cloudflare Web Analytics is enabled, the home page loads the beacon script with the configured token', async ({
    page,
  }, testInfo) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    const beacon = page.locator('#cloudflare-web-analytics');
    await expect(beacon).toHaveAttribute(
      'src',
      'https://static.cloudflareinsights.com/beacon.min.js'
    );
    await expect(beacon).toHaveAttribute(
      'data-cf-beacon',
      JSON.stringify({ token: 'e2e-test-cloudflare-token' })
    );

    await capturePageLoad(
      page,
      testInfo,
      'The home page loads the Cloudflare Web Analytics beacon with the configured token.'
    );
  });
});
