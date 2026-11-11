import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { loginE2eUser } from './helpers/customThemes';
import { capturePageLoad } from './helpers/stepScreenshots';

async function stubEmptyQueueResources(page: Page) {
  await page.route('**/api/v2/queue/*/resources/upcoming-all', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  await page.route('**/api/v2/queue/*/resources/now-playing', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    });
  });
}

/** Empty banner sits under the chips with the standard chip-to-content gap. */
async function expectMessageUnderChips(page: Page, message: Locator) {
  await expect(message).toBeVisible();

  const podcastsChip = page.getByRole('button', { name: 'Podcasts', exact: true });
  await expect(podcastsChip).toBeVisible();

  const banner = message.locator('xpath=..');
  const bannerBox = await banner.boundingBox();
  const chipBox = await podcastsChip.boundingBox();
  const mainBox = await page.locator('#mainOuterWrapper main').boundingBox();
  const spacing2xlPx = await page.evaluate(() => {
    const root = document.documentElement;
    const raw = getComputedStyle(root).getPropertyValue('--spacing-2xl').trim();
    const value = Number.parseFloat(raw);
    if (raw.endsWith('rem')) {
      return value * Number.parseFloat(getComputedStyle(root).fontSize);
    }
    return value;
  });

  expect(bannerBox).not.toBeNull();
  expect(chipBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  if (!bannerBox || !chipBox || !mainBox) {
    return;
  }

  const gap = bannerBox.y - (chipBox.y + chipBox.height);
  expect(gap).toBeGreaterThanOrEqual(spacing2xlPx - 1);
  expect(gap).toBeLessThanOrEqual(spacing2xlPx + 1);
  expect(bannerBox.y).toBeLessThan(mainBox.y + mainBox.height / 2);
  expect(bannerBox.x).toBeGreaterThanOrEqual(mainBox.x - 1);
}

test.describe('Queues empty state', () => {
  test('When a signed-in listener opens an empty podcast or music queue, a message under the chips says so.', async ({
    page,
  }, testInfo) => {
    await stubEmptyQueueResources(page);
    await loginE2eUser(page);

    await page.goto('/queues');
    await expect(page).toHaveURL(/\/queues$/);
    const heading = page
      .locator('[data-appearance="web"]')
      .getByRole('heading', { level: 1, name: 'Queues' });
    await expect(heading).toBeVisible();

    const podcastEmpty = page.getByRole('status').getByText('Nothing in Your Podcast Queue Yet');
    await expectMessageUnderChips(page, podcastEmpty);
    await capturePageLoad(
      page,
      testInfo,
      'An empty podcast queue shows a message under the medium chips.',
      podcastEmpty
    );

    await page.getByRole('button', { name: 'Music', exact: true }).click();
    await expect(page).toHaveURL(/\/queues/);
    const musicEmpty = page.getByRole('status').getByText('Nothing in Your Music Queue Yet');
    await expectMessageUnderChips(page, musicEmpty);
    await capturePageLoad(
      page,
      testInfo,
      'An empty music queue shows a message under the medium chips.',
      musicEmpty
    );
  });
});
