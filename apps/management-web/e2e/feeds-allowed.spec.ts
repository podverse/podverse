import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

async function signIn(page: Page): Promise<void> {
  await page.goto(ROUTES.HOME);
  await page.locator('#email').fill('e2e-superadmin@example.com');
  await page.locator('#password').fill('Test!1Aa');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Management-web allowed feeds', () => {
  test('the feeds hub hides Allowed Feeds when the allowlist is off', async ({ page }) => {
    await signIn(page);
    const allowlistResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/feeds/catalog-allowlist') &&
        !response.url().includes('directory-search') &&
        response.request().method() === 'GET'
    );
    await page.goto(ROUTES.FEEDS);
    const response = await allowlistResponse;
    expect(response.status()).toBe(404);
    await expect(page.getByRole('link', { name: 'Allowed Feeds' })).toHaveCount(0);
  });

  test('an admin can search the directory and add a feed', async ({ page }, testInfo) => {
    const feeds = [
      {
        podcast_index_id: 10,
        resolved_podcast_index_id: null,
        origin: 'deployment',
        title: 'Deployed Show',
        feed_url: 'https://deployed.example/feed.xml',
        stored: true,
        removable: false,
      },
    ];

    await page.route('**/feeds/catalog-allowlist**', async (route) => {
      const url = route.request().url();
      if (url.includes('directory-search')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeds: [
              {
                podcast_index_id: 77,
                title: 'Directory Show',
                feed_url: 'https://dir.example/feed.xml',
                author: 'Ada',
                already_allowed: false,
              },
            ],
          }),
        });
        return;
      }
      if (route.request().method() === 'POST') {
        feeds.push({
          podcast_index_id: 77,
          resolved_podcast_index_id: null,
          origin: 'admin',
          title: 'Directory Show',
          feed_url: 'https://dir.example/feed.xml',
          stored: false,
          removable: true,
        });
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            podcast_index_id: 77,
            origin: 'admin',
            title: 'Directory Show',
            feed_url: 'https://dir.example/feed.xml',
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feeds }),
      });
    });

    await signIn(page);
    await page.goto(ROUTES.FEEDS_ALLOWED);
    await expect(page.getByRole('heading', { name: 'Allowed Feeds' })).toBeVisible();

    await page.locator('#catalog-allowlist-search').fill('Directory');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('Directory Show')).toBeVisible();
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByRole('cell', { name: 'Management' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Allowed Feeds shows the directory hit after it is added.',
      page.getByRole('cell', { name: 'Directory Show' })
    );
  });
});
