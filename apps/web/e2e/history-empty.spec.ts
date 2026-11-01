import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { loginE2eUser } from './helpers/customThemes';
import { capturePageLoad } from './helpers/stepScreenshots';

async function stubEmptyHistoryResources(page: Page) {
  await page.route('**/api/v2/queue/*/resources/history-paginated**', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        meta: { page: 1, count: 0, limit: 20 },
      }),
    });
  });
}

/** Empty copy sits under the chips at the start of the column, like Recommendations. */
async function expectMessageUnderChips(page: Page, message: Locator) {
  await expect(message).toBeVisible();

  const podcastsChip = page.getByRole('button', { name: 'Podcasts', exact: true });
  await expect(podcastsChip).toBeVisible();

  const messageBox = await message.boundingBox();
  const chipBox = await podcastsChip.boundingBox();
  const mainBox = await page.locator('#mainOuterWrapper main').boundingBox();

  expect(messageBox).not.toBeNull();
  expect(chipBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  if (!messageBox || !chipBox || !mainBox) {
    return;
  }

  expect(messageBox.y).toBeGreaterThan(chipBox.y + chipBox.height);
  expect(messageBox.y).toBeLessThan(mainBox.y + mainBox.height / 2);
  expect(messageBox.x).toBeGreaterThanOrEqual(mainBox.x - 1);
}

test.describe('History empty state', () => {
  test('When a signed-in listener opens empty podcast or music history, a message under the chips says so.', async ({
    page,
  }, testInfo) => {
    await stubEmptyHistoryResources(page);
    await loginE2eUser(page);

    await page.goto('/history');
    await expect(page).toHaveURL(/\/history$/);
    const heading = page
      .locator('[data-appearance="web"]')
      .getByRole('heading', { level: 1, name: 'History' });
    await expect(heading).toBeVisible();

    const emptyMessage = page.getByRole('status').getByText('Nothing in Your History Yet');
    await expectMessageUnderChips(page, emptyMessage);
    await capturePageLoad(
      page,
      testInfo,
      'An empty podcast history shows a message under the medium chips.',
      emptyMessage
    );

    await page.getByRole('button', { name: 'Music', exact: true }).click();
    await expect(page).toHaveURL(/\/history/);
    await expectMessageUnderChips(page, emptyMessage);
    await capturePageLoad(
      page,
      testInfo,
      'An empty music history shows a message under the medium chips.',
      emptyMessage
    );
  });
});
