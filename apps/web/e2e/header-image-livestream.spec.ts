import { expect, test } from '@playwright/test';

test.describe('Livestream header image preview', () => {
  test('A livestream detail page shows the header image preview dialog trigger and can open/close it', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await test.step('Open a known channel page with livestream entries', async () => {
      await page.goto('/podcast/v5fCrIj9Io');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Navigate to the first livestream detail page from that channel', async () => {
      const livestreamLink = page.locator('a[href*="/podcast/livestream/"]').first();
      await expect(livestreamLink).toBeVisible({ timeout: 15_000 });
      await livestreamLink.click();
      await expect(page).toHaveURL(/\/podcast\/livestream\//);
    });

    await test.step('Clicking the livestream artwork opens the Image preview dialog', async () => {
      const openTrigger = page.getByRole('button', { name: 'Image preview' });
      await expect(openTrigger).toBeVisible({ timeout: 15_000 });
      await openTrigger.click();
      await expect(page.getByRole('dialog', { name: 'Image preview' })).toBeVisible();
    });

    await test.step('The close button dismisses the preview overlay', async () => {
      await page.getByRole('button', { name: 'Close modal' }).click();
      await expect(page.getByRole('dialog', { name: 'Image preview' })).toHaveCount(0);
    });
  });
});
