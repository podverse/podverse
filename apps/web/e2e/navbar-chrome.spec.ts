import { expect, test } from '@playwright/test';

import { actionAndCapture } from './helpers/stepScreenshots';

test.describe('Main layout navbar chrome', () => {
  test('the home page shows account menu and history controls on a wide viewport', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await actionAndCapture(
      page,
      testInfo,
      'The wide home page shows account menu and history controls.',
      async () => {
        await page.goto('/');
        const chrome = page.locator('[data-appearance="web"]');
        await expect(chrome).toBeVisible();
        await expect(chrome.getByRole('button', { name: 'Account' })).toBeVisible();
        await expect(chrome.getByRole('button', { name: 'Back' })).toBeVisible();
        await expect(chrome.getByRole('button', { name: 'Forward' })).toBeVisible();
      },
      page.locator('[data-appearance="web"]')
    );
  });

  test('sidebar sections start expanded on a wide viewport', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await actionAndCapture(
      page,
      testInfo,
      'The wide home page shows each sidebar section expanded.',
      async () => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/$/);
        const sections = page.locator('#sidebar details');
        await expect(sections).toHaveCount(4);
        const count = await sections.count();
        for (let index = 0; index < count; index += 1) {
          await expect(sections.nth(index)).toHaveJSProperty('open', true);
        }
        await expect(page.locator('#sidebar a[href="/podcasts"]')).toBeVisible();
        await expect(page.locator('#sidebar a[href="/artists"]')).toBeVisible();
        await expect(page.locator('#sidebar a[href="/add-by-rss/podcasts"]')).toBeVisible();
        await expect(page.locator('#sidebar a[href="/playlists"]')).toBeVisible();
      },
      page.locator('#sidebar')
    );
  });

  test('a narrow viewport shows search, the mobile menu toggle in its closed state', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await actionAndCapture(
      page,
      testInfo,
      'The narrow home page shows search and the closed mobile menu toggle.',
      async () => {
        await page.goto('/');
        const chrome = page.locator('[data-appearance="web"]');
        await expect(chrome.getByRole('link', { name: 'Search' })).toBeVisible();
        await expect(chrome.getByRole('button', { name: 'Open Menu' })).toBeVisible();
      },
      page.locator('[data-appearance="web"]')
    );
  });
});
