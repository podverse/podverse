import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Podcast Index add feed when directory add is blocked for Trial', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/mq/rss/add/on-demand', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Your account does not currently have access to this feature.',
          code: 'feature_not_available_for_account_type',
          i18nKey: 'membership.feature_not_available_for_account_type',
          renewPath: '/membership/renew',
        }),
      });
    });
  });

  test('the modal explains Trial directory limits, shows a mailto link, and Get Premium navigates to membership', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);
    const loginResponse = await page.request.post('http://localhost:4030/api/v2/auth/login', {
      data: { email: 'e2e-user@example.com', password: 'Test!1Aa' },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    // Use Podcast Index mock-feed id range (see packages/external-services-podcast-index TEST_PODCAST_INDEX_ID_MIN).
    // E2E runs the API with NODE_ENV=test (not production), so real PI ids hit live Podcast Index and SSR fails without credentials.
    await page.goto('/podcast-index/feed/2147483640');
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    await test.step('The Add Feed button is available after login', async () => {
      await expect(page.getByRole('button', { name: /add feed/i })).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Add Feed button is visible on the Podcast Index feed preview page.',
        page.getByRole('button', { name: /add feed/i })
      );
    });

    await test.step('Clicking Add Feed opens the Premium Required modal with descriptive copy', async () => {
      await page.getByRole('button', { name: /add feed/i }).click();
      const dialog = page.getByRole('dialog', { name: 'Premium Required' });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Login Required' })).toHaveCount(0);
      await expect(dialog.getByText(/Trial accounts.*add feeds.*public directory/i)).toBeVisible();
      const mailLink = dialog.locator('a[href^="mailto:"]');
      await expect(mailLink.first()).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Premium Required modal explains Trial directory limits with a mailto link.',
        dialog
      );
    });

    await test.step('Get Premium navigates to the membership page', async () => {
      await page
        .getByRole('dialog', { name: 'Premium Required' })
        .getByRole('button', { name: 'Get Premium' })
        .click();
      await expect(page).toHaveURL(/\/membership/);

      await capturePageLoad(
        page,
        testInfo,
        'Get Premium navigates to the membership page.',
        page.getByRole('heading', { level: 1 })
      );
    });
  });
});
