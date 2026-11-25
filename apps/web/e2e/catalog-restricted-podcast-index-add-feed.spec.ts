import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Podcast Index feed page with the catalog allowlist set', () => {
  test('the feed preview shows no Add Feed button and opening it sends no add request', async ({
    page,
  }, testInfo) => {
    const addRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/mq/rss/add/on-demand')) {
        addRequests.push(request.url());
      }
    });

    const notInDirectory = page.getByText('This feed is not in our directory.', { exact: true });
    const heading = page.getByRole('heading', { level: 2 });
    const rssLink = page.getByRole('link', { name: /rss link/i });

    await test.step('The feed preview renders with the not-in-directory sentence', async () => {
      await page.goto('/podcast-index/feed/2147483640');
      await expect(page).toHaveURL(/\/podcast-index\/feed\/2147483640\/?$/);
      await expect(notInDirectory).toBeVisible();
      await expect(heading).toBeVisible();
      await capturePageLoad(
        page,
        testInfo,
        'The feed preview renders with the not-in-directory sentence',
        notInDirectory
      );
    });

    await test.step('The Add Feed button is not shown and the RSS Link stays', async () => {
      await expect(page.getByRole('button', { name: /add feed/i })).toHaveCount(0);
      await expect(rssLink).toBeVisible();
      await capturePageLoad(
        page,
        testInfo,
        'The Add Feed button is not shown and the RSS Link stays',
        rssLink
      );
    });

    await test.step('Opening the page sent no add request', async () => {
      expect(addRequests).toEqual([]);
      await capturePageLoad(page, testInfo, 'Opening the page sent no add request', notInDirectory);
    });
  });
});
