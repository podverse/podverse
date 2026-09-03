import { expect, test } from '@playwright/test';

/**
 * Loading the seeded live-audio item must not crash the page or produce a stray non-live `<audio>`
 * element with a `src` attribute. The seeded `live_item` has no enclosure URL, so this spec covers
 * navigation and controller-tree mounting without starting or seeking a stream.
 */
test.describe('Media player live-stream audio start (controller plumbing)', () => {
  test('Navigating into the seeded livestream item renders the media player tree without crashing', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await test.step('Open the seeded livestream channel page', async () => {
      await page.goto('/podcast/v5fCrIj9Io');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Navigate to the seeded livestream detail page', async () => {
      const livestreamLink = page.locator('a[href*="/podcast/livestream/"]').first();
      await expect(livestreamLink).toBeVisible({ timeout: 15_000 });
      await livestreamLink.click();
      await expect(page).toHaveURL(/\/podcast\/livestream\//);
    });

    await test.step('The media player aside is attached to the DOM (controller tree mounted; Phase 1 does not press play, so visibility is not asserted — see matrix § 6c)', async () => {
      await expect(page.locator('aside#media-player')).toBeAttached();
    });

    await test.step('No non-live `<audio>` element has a real `src` set (controller selection has not fallen back to the non-live AV controller)', async () => {
      const audioWithSrc = page.locator('audio[src]');
      await expect(audioWithSrc).toHaveCount(0);
    });
  });
});
