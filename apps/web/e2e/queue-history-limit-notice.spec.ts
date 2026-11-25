import { expect, test } from '@playwright/test';

import { loginE2eUser } from './helpers/customThemes';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Queue history limit notice', () => {
  test('a signed-in listener must acknowledge the notice, and Escape leaves it open', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);

    let posted: unknown = null;
    await page.route('**/account/queue-history-limit-notice', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ show: true, limit: 10000, at_limit: false }),
        });
        return;
      }
      if (route.request().method() === 'POST') {
        posted = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ show: false, limit: 10000, at_limit: false }),
        });
        return;
      }
      await route.continue();
    });

    await loginE2eUser(page);
    await page.goto('/');

    const dialog = page.getByRole('dialog', { name: 'History Limit' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      'Your history keeps up to 10000 items. You are within 50 of that limit.'
    );
    await expect(dialog).toContainText('contact-e2e@example.com');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'History limit notice stays open until I Understand.',
      dialog
    );

    await dialog.getByRole('button', { name: 'I Understand' }).click();
    await expect(dialog).toHaveCount(0);
    expect(posted).toEqual({ limit: 10000 });
  });
});
