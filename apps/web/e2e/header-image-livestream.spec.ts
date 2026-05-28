import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Livestream header image preview', () => {
  test('A livestream detail page shows the header image preview dialog trigger and can open/close it', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await test.step('Open a known channel page with livestream entries', async () => {
      await page.goto('/podcast/v5fCrIj9Io');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

      await capturePageLoad(
        page,
        testInfo,
        'The channel page loads with livestream entries visible.'
      );
    });

    await test.step('Navigate to the first livestream detail page from that channel', async () => {
      const livestreamLink = page.locator('a[href*="/podcast/livestream/"]').first();
      await expect(livestreamLink).toBeVisible({ timeout: 15_000 });
      await livestreamLink.click();
      await expect(page).toHaveURL(/\/podcast\/livestream\//);

      await capturePageLoad(
        page,
        testInfo,
        'The livestream detail page loads from the channel list.'
      );
    });

    await test.step('Clicking the livestream artwork opens the Image preview dialog', async () => {
      const openTrigger = page.getByRole('button', { name: 'Image preview' });
      await expect(openTrigger).toBeVisible({ timeout: 15_000 });
      await openTrigger.click();
      const preview = page.getByRole('dialog', { name: 'Image preview' });
      await expect(preview).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Image preview dialog opens on the livestream detail page.',
        preview
      );
    });

    await test.step('The close button dismisses the preview overlay', async () => {
      await page.getByRole('button', { name: 'Close modal' }).click();
      await expect(page.getByRole('dialog', { name: 'Image preview' })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'The Image preview dialog closes on the livestream detail page.'
      );
    });
  });
});
