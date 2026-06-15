import { expect, test } from '@playwright/test';

import {
  EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
  EMBED_SAMPLE_EPISODE_AUDIO_TITLE,
} from './helpers/seedConstants';
import { capturePageLoad, actionAndCapture } from './helpers/stepScreenshots';

async function seekMainPlayerToSeconds(page: import('@playwright/test').Page, seconds: number) {
  const mediaPlayer = page.locator('aside#media-player');
  const slider = mediaPlayer.locator('[class*="customProgressBar"]').first();
  await expect(slider).toBeVisible();

  const durationSeconds = Number(await slider.getAttribute('aria-valuemax'));
  expect(Number.isFinite(durationSeconds)).toBe(true);
  expect(durationSeconds).toBeGreaterThan(0);

  const box = await slider.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }

  const fraction = Math.min(Math.max(seconds / durationSeconds, 0), 1);
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2);

  await expect
    .poll(async () => Number(await slider.getAttribute('aria-valuenow')))
    .toBeGreaterThanOrEqual(seconds - 2);
}

test.describe('Media player alternate enclosure control', () => {
  test('shows the alternate enclosure button and opens the source selector modal', async ({
    page,
  }, testInfo) => {
    await test.step('Open the seeded episode page and start playback in the bottom media player', async () => {
      await page.goto(`/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`);
      await expect(
        page.getByRole('heading', { name: EMBED_SAMPLE_EPISODE_AUDIO_TITLE })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Play' }).first().click();
      await expect(page.locator('aside#media-player')).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The episode page loads and the bottom media player is visible after starting playback.',
        page.locator('aside#media-player')
      );
    });

    await test.step('The alternate enclosure button is visible as the leftmost control in the player button row', async () => {
      const mediaPlayer = page.locator('aside#media-player');
      const alternateEnclosureButton = mediaPlayer
        .getByTestId('media-player-alternate-enclosure-button')
        .first();
      await expect(alternateEnclosureButton).toBeVisible();

      await actionAndCapture(
        page,
        testInfo,
        'The alternate enclosure button is visible in the bottom media player button row.',
        async () => {
          await expect(alternateEnclosureButton).toBeVisible();
        },
        alternateEnclosureButton
      );
    });

    await test.step('Clicking the alternate enclosure button opens the source selector modal with multiple formats', async () => {
      const mediaPlayer = page.locator('aside#media-player');
      await mediaPlayer.getByTestId('media-player-alternate-enclosure-button').first().click();
      const modal = page.getByRole('dialog', { name: 'Select Media Source' });
      await expect(modal).toBeVisible();
      const sourceButtons = modal.getByRole('button').filter({ hasText: 'localhost' });
      await expect(sourceButtons).toHaveCount(4);

      await actionAndCapture(
        page,
        testInfo,
        'The source selector modal lists the seeded alternate enclosure formats.',
        async () => {
          await expect(modal).toBeVisible();
        },
        modal
      );
    });
  });

  test('preserves the current playhead when switching alternate enclosures', async ({ page }) => {
    await page.goto(`/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`);
    await page.getByRole('button', { name: 'Play' }).first().click();
    await expect(page.locator('aside#media-player')).toBeVisible();

    await seekMainPlayerToSeconds(page, 15);
    const mediaPlayer = page.locator('aside#media-player');
    const slider = mediaPlayer.locator('[class*="customProgressBar"]').first();
    const positionBeforeSwitch = Number(await slider.getAttribute('aria-valuenow'));
    expect(positionBeforeSwitch).toBeGreaterThanOrEqual(13);

    await mediaPlayer.getByTestId('media-player-alternate-enclosure-button').first().click();
    const modal = page.getByRole('dialog', { name: 'Select Media Source' });
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: /OGG Opus/i }).click();

    await expect
      .poll(async () => Number(await slider.getAttribute('aria-valuenow')))
      .toBeGreaterThanOrEqual(positionBeforeSwitch - 2);
  });
});
