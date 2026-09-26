import { expect, test } from '@playwright/test';

import {
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ONLY_ID_TEXT,
  EMBED_SAMPLE_EPISODE_AUDIO_TITLE,
  EMBED_SAMPLE_EPISODE_VIDEO_ONLY_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Item enclosure modality icon', () => {
  test('mixed audio and video shows the wave icon that opens the source selector', async ({
    page,
  }, testInfo) => {
    await test.step('Open the seeded mixed-enclosure episode detail page', async () => {
      await page.goto(`/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`);
      await expect(
        page.getByRole('heading', { name: EMBED_SAMPLE_EPISODE_AUDIO_TITLE })
      ).toBeVisible();

      await capturePageLoad(page, testInfo, 'The mixed audio and video episode detail page loads.');
    });

    await test.step('The mixed modality wave icon is shown beside the more button', async () => {
      const modalityIcon = page.getByTestId('item-enclosure-modality-icon').first();
      await expect(modalityIcon).toBeVisible();
      await expect(modalityIcon).toHaveAttribute('data-indicator', 'mixed');

      await actionAndCapture(
        page,
        testInfo,
        'The mixed modality wave icon is visible beside the more button.',
        async () => {
          await expect(modalityIcon).toBeVisible();
        },
        modalityIcon
      );
    });

    await test.step('Clicking the modality icon opens the source selector modal', async () => {
      await page.getByTestId('item-enclosure-modality-icon').first().click();
      const modal = page.getByRole('dialog', { name: 'Select Media Source' });
      await expect(modal).toBeVisible();

      await actionAndCapture(
        page,
        testInfo,
        'Clicking the modality icon opens the source selector modal.',
        async () => {
          await expect(modal).toBeVisible();
        },
        modal
      );
    });
  });

  test('audio-only item shows no modality icon', async ({ page }, testInfo) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Podcast Resume P > 0' })).toBeVisible();

    await expect(page.getByTestId('item-enclosure-modality-icon')).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The audio-only episode detail page shows no modality icon beside the more button.'
    );
  });

  test('video-only item shows the video icon', async ({ page }, testInfo) => {
    await page.goto(`/episode/${EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ONLY_ID_TEXT}`);
    await expect(
      page.getByRole('heading', { name: EMBED_SAMPLE_EPISODE_VIDEO_ONLY_TITLE })
    ).toBeVisible();

    const modalityIcon = page.getByTestId('item-enclosure-modality-icon').first();
    await expect(modalityIcon).toBeVisible();
    await expect(modalityIcon).toHaveAttribute('data-indicator', 'video');

    await actionAndCapture(
      page,
      testInfo,
      'The video-only episode detail page shows the video modality icon.',
      async () => {
        await expect(modalityIcon).toBeVisible();
      },
      modalityIcon
    );
  });
});
