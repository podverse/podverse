import { expect, test } from '@playwright/test';

import { dismissLocalDevelopmentModal } from './helpers/dismissLocalDevelopmentModal';

test.describe('Header image full-size preview', () => {
  test('Podcast Index feed artwork opens the image preview dialog and closes from the close control', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await page.goto('/podcast-index/feed/2147483640');
    await expect(page.getByRole('dialog', { name: /Local Development/i })).toBeVisible({
      timeout: 15_000,
    });
    await dismissLocalDevelopmentModal(page);

    await test.step('Clicking the feed artwork opens the Image preview dialog', async () => {
      const openTrigger = page.getByRole('button', { name: 'Image preview' });
      await expect(openTrigger).toBeVisible({ timeout: 15_000 });
      await openTrigger.click();
      const preview = page.getByRole('dialog', { name: 'Image preview' });
      await expect(preview).toBeVisible();
    });

    await test.step('The close button dismisses the preview overlay', async () => {
      await page.getByRole('button', { name: 'Close modal' }).click();
      await expect(page.getByRole('dialog', { name: 'Image preview' })).toHaveCount(0);
    });
  });
});
