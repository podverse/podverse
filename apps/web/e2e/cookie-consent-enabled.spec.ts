import { expect, test } from '@playwright/test';

import {
  ANONYMOUS_PLAYBACK_SNAPSHOT_LOCAL_STORAGE_KEY,
  readAnonymousSnapshotFromPage,
  writeAnonymousSnapshotBeforeNavigation,
} from './helpers/anonymousSnapshot';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';
import { E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT } from './helpers/seedConstants';

test.describe('Cookie consent banner (enabled)', () => {
  test('When the cookie consent banner is enabled, visitors can accept all cookies and load analytics.', async ({
    page,
  }, testInfo) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');

    const bannerRegion = page.getByRole('region', { name: /cookie/i });
    await expect(bannerRegion).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept all' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Essential only' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'None' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The cookie consent banner is visible on first visit with all three choice buttons.',
      bannerRegion
    );

    await actionAndCapture(
      page,
      testInfo,
      'After choosing Accept all, the banner is hidden and Cloudflare analytics loads.',
      async () => {
        await page.getByRole('button', { name: 'Accept all' }).click();
        await expect(bannerRegion).toHaveCount(0);
        const beacon = page.locator('#cloudflare-web-analytics');
        await expect(beacon).toHaveAttribute(
          'src',
          'https://static.cloudflareinsights.com/beacon.min.js'
        );
      },
      page.locator('#cloudflare-web-analytics')
    );
  });

  test('When the visitor chooses None, the banner is hidden, analytics does not load, and anonymous playback storage is cleared.', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT,
      playbackPositionSeconds: 30,
    });

    await page.goto('/');

    await expect(page).toHaveURL('/');

    const bannerRegion = page.getByRole('region', { name: /cookie/i });
    await expect(bannerRegion).toBeVisible();

    await actionAndCapture(
      page,
      testInfo,
      'After choosing None, the banner is hidden, Cloudflare analytics stays absent, and anonymous playback storage is cleared.',
      async () => {
        await page.getByRole('button', { name: 'None' }).click();
        await expect(bannerRegion).toHaveCount(0);
        await expect(page.locator('#cloudflare-web-analytics')).toHaveCount(0);
        expect(await readAnonymousSnapshotFromPage(page)).toBeNull();
      },
      page.locator('body')
    );

    await context.close();
  });

  test('When the visitor chooses Essential only, analytics does not load and anonymous playback storage is allowed.', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/');

    await expect(page).toHaveURL('/');

    const bannerRegion = page.getByRole('region', { name: /cookie/i });
    await expect(bannerRegion).toBeVisible();

    await actionAndCapture(
      page,
      testInfo,
      'After choosing Essential only, Cloudflare analytics stays absent and anonymous playback storage can be used.',
      async () => {
        await page.getByRole('button', { name: 'Essential only' }).click();
        await expect(bannerRegion).toHaveCount(0);
        await expect(page.locator('#cloudflare-web-analytics')).toHaveCount(0);

        await page.evaluate(
          ({ storageKey, payload }) => {
            window.localStorage.setItem(storageKey, payload);
          },
          {
            storageKey: ANONYMOUS_PLAYBACK_SNAPSHOT_LOCAL_STORAGE_KEY,
            payload: JSON.stringify({
              v: 1,
              kind: 'item',
              id_text: E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT,
              playback_position_seconds: 30,
              updated_at: new Date().toISOString(),
            }),
          }
        );

        const snapshot = await readAnonymousSnapshotFromPage(page);
        expect(snapshot).not.toBeNull();
        expect(snapshot).toContain(E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT);
      },
      page.locator('body')
    );

    await context.close();
  });
});
