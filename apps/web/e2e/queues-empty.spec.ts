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

async function expectMessageVerticallyCenteredInMain(message: Locator) {
  await expect(message).toBeVisible();

  const alignment = await message.evaluate((node) => {
    const main = document.querySelector('#mainOuterWrapper main');
    if (!main) {
      return null;
    }
    const messageBox = node.getBoundingClientRect();
    const mainBox = main.getBoundingClientRect();
    return {
      mainMidY: mainBox.top + mainBox.height / 2,
      messageMidY: messageBox.top + messageBox.height / 2,
      mainHeight: mainBox.height,
    };
  });

  expect(alignment).not.toBeNull();
  if (!alignment) {
    return;
  }
  // CenteredMessage fills the column under the chips, so the copy sits near the middle of main.
  expect(Math.abs(alignment.messageMidY - alignment.mainMidY)).toBeLessThan(
    alignment.mainHeight * 0.2
  );
}

test.describe('Queues empty state', () => {
  test('When a signed-in listener opens an empty podcast or music queue, a centered message says so.', async ({
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
    await expectMessageVerticallyCenteredInMain(podcastEmpty);
    await capturePageLoad(
      page,
      testInfo,
      'An empty podcast queue shows a centered message under the medium chips.',
      podcastEmpty
    );

    await page.getByRole('button', { name: 'Music', exact: true }).click();
    await expect(page).toHaveURL(/\/queues/);
    const musicEmpty = page.getByRole('status').getByText('Nothing in Your Music Queue Yet');
    await expectMessageVerticallyCenteredInMain(musicEmpty);
    await capturePageLoad(
      page,
      testInfo,
      'An empty music queue shows a centered message under the medium chips.',
      musicEmpty
    );
  });
});
