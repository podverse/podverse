import { expect, test } from '@playwright/test';

import { dismissLocalDevelopmentModal } from './helpers/dismissLocalDevelopmentModal';

test.describe('Media player Space shortcut', () => {
  test('Pressing Space on a Podcast Index feed preview page remains stable when no media is loaded', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await page.goto('/podcast-index/feed/2147483640');
    await expect(page.getByRole('dialog', { name: /Local Development/i })).toBeVisible({
      timeout: 15_000,
    });
    await dismissLocalDevelopmentModal(page);

    await test.step('Space key does not break the page while the persistent player has no active source', async () => {
      await page.keyboard.press('Space');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
