import { expect, test } from '@playwright/test';

import { loginSeedUser } from './helpers/addByRSSCredentials';
import { capturePageLoad } from './helpers/stepScreenshots';

const FEED_URL = 'https://example.com/e2e-feed-limit.xml';

test.describe('Add by RSS feed limit', () => {
  test('When a signed-in account is at its Add by RSS limit, adding a feed says the limit was reached and offers Email Support.', async ({
    page,
  }, testInfo) => {
    await loginSeedUser(page);
    await page.route('**/account/follow/add-by-rss-channel', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message:
            'You have reached your limit of 100 Add by RSS feeds. To have it raised, email support@example.com.',
          code: 'add_by_rss_feed_limit_reached',
          i18nKey: 'membership.add_by_rss_feed_limit_reached',
          limit: 100,
        }),
      });
    });

    await page.goto('/add-by-rss/add');
    await expect(page).toHaveURL(/\/add-by-rss\/add$/);
    const feedUrl = page.getByRole('textbox', { name: 'RSS Feed URL' });
    await expect(feedUrl).toBeVisible();
    await feedUrl.fill(FEED_URL);
    await page.getByRole('button', { name: 'Add Feed' }).click();

    const dialog = page.getByRole('dialog', { name: 'Limit Reached' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        /^You have reached your limit of 100 Add by RSS feeds\. To have it raised, email \S+@\S+\.$/
      )
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Email Support' })).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'The Add by RSS limit dialog names the limit and offers Email Support.',
      dialog
    );
  });
});
