import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  loginSeedUser,
  stubAddByRSSParse,
  stubAddByRSSParseAll,
} from './helpers/addByRSSCredentials';
import { E2E_ADD_BY_RSS_TEST_ASSETS_FEED_URL } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

async function readBox(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    throw new Error('The overlay has a layout box.');
  }
  return box;
}

async function readViewport(page: Page): Promise<{ width: number; height: number }> {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (viewport === null) {
    throw new Error('The page has a viewport.');
  }
  return viewport;
}

test.describe('Background activity overlay', () => {
  test('When a signed-in account follows an Add by RSS feed, the overlay stays above the player, remembers expanded or collapsed, and leaves when the refresh finishes.', async ({
    page,
  }, testInfo) => {
    // The parse stays in flight until the last step releases it, so the overlay stays up across reloads.
    test.setTimeout(60_000);
    await loginSeedUser(page);

    let releaseStatus: () => void = () => undefined;
    const statusReleased = new Promise<void>((resolve) => {
      releaseStatus = resolve;
    });
    await stubAddByRSSParse(page, {
      feedUrl: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_URL,
      outcomes: [{ status: 'parsed' }],
      statusReleased,
    });
    await stubAddByRSSParseAll(page);

    const overlay = page.getByTestId('background-activity-overlay');
    const toggle = page.getByTestId('background-activity-toggle');

    let collapsedRight = 0;
    let collapsedWidth = 0;

    await test.step('The overlay appears collapsed above the player area while feeds refresh', async () => {
      await page.goto('/add-by-rss');
      await expect(page).toHaveURL(/\/add-by-rss\/?$/);
      await expect(overlay).toBeVisible({ timeout: 15_000 });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toHaveAccessibleName('Background Activity');
      await expect(page.getByTestId('background-activity-details')).toHaveCount(0);

      const viewport = await readViewport(page);
      const box = await readBox(overlay);
      expect(Math.abs(viewport.width - (box.x + box.width))).toBeLessThanOrEqual(24);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 128);
      collapsedRight = box.x + box.width;
      collapsedWidth = box.width;

      await capturePageLoad(
        page,
        testInfo,
        'The overlay is a collapsed spinner in the bottom-right, above the player area.',
        overlay
      );
    });

    await test.step('Clicking the overlay expands it to the left with the message', async () => {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const details = page.getByTestId('background-activity-details');
      await expect(details).toBeVisible();
      await expect(details).toContainText('Updating Your RSS Feeds');

      const box = await readBox(overlay);
      expect(box.width).toBeGreaterThan(collapsedWidth);
      expect(Math.abs(box.x + box.width - collapsedRight)).toBeLessThanOrEqual(1);

      await capturePageLoad(
        page,
        testInfo,
        'The overlay is expanded to the left and reads Updating Your RSS Feeds.',
        details
      );
    });

    await test.step('A reload keeps it expanded', async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/add-by-rss\/?$/);
      await expect(overlay).toBeVisible({ timeout: 15_000 });
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');

      await capturePageLoad(
        page,
        testInfo,
        'After a reload the overlay is still expanded before any click.',
        toggle
      );
    });

    await test.step('Collapsing is remembered too', async () => {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await page.reload();
      await expect(page).toHaveURL(/\/add-by-rss\/?$/);
      await expect(overlay).toBeVisible({ timeout: 15_000 });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await capturePageLoad(
        page,
        testInfo,
        'After collapsing and reloading, the overlay is collapsed again.',
        toggle
      );
    });

    await test.step('The overlay goes away when the refresh finishes', async () => {
      releaseStatus();
      await expect(overlay).toHaveCount(0, { timeout: 15_000 });

      await capturePageLoad(
        page,
        testInfo,
        'The overlay is gone after the feed refresh finishes.',
        page.getByRole('main')
      );
    });
  });

  test('A signed-out visitor never sees the overlay', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/browse$/);
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
    await expect(page.getByTestId('background-activity-overlay')).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The home page for a signed-out visitor has no background activity overlay.',
      main
    );
  });
});
