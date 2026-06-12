import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web embed demo config', () => {
  test('signed-in superuser can open the embed demo configuration page', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);

    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    await page.goto('/web/embed-demo');

    const title = page.getByRole('heading', { name: 'Embed demo', level: 1 });
    await expect(title).toBeVisible();
    await expect(
      page.getByText(
        'Enter id_text values for each embed type you want shown on the public demo page. Unconfigured slots are hidden.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Single episodes, tracks, and clips' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Podcasts, albums, and playlists' })
    ).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The embed demo configuration page lists showcase slots for superuser editing.',
      title
    );
  });
});
