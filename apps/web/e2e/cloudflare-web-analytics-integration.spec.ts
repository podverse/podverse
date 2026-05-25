import { expect, test } from '@playwright/test';

const cloudflareEnabledE2e = process.env.E2E_CLOUDFLARE_WEB_ANALYTICS_ENABLED === 'true';

(cloudflareEnabledE2e ? test.describe.skip : test.describe)(
  'Cloudflare Web Analytics integration (disabled)',
  () => {
    test('When Cloudflare Web Analytics is disabled, the home page does not load the beacon script', async ({
      page,
    }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/');

      const body = page.locator('body');
      await expect(body).toBeVisible();

      await expect(page.locator('#cloudflare-web-analytics')).toHaveCount(0);
    });
  }
);

(cloudflareEnabledE2e ? test.describe : test.describe.skip)(
  'Cloudflare Web Analytics integration (enabled)',
  () => {
    test('When Cloudflare Web Analytics is enabled, the home page loads the beacon script with the configured token', async ({
      page,
    }) => {
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
    });
  }
);
