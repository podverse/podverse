import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  E2E_CLIP_ID_TEXT,
  E2E_EMBED_PLAYLIST_ID_TEXT,
  E2E_ITEM_CHAPTER_INTRO_ID_TEXT,
  E2E_MUSIC_ALBUM_ID_TEXT,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  E2E_SOUNDBITE_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

async function openShareModal(page: Page) {
  await page.getByRole('button', { name: 'Share' }).click();
}

async function openEmbedBuilderFromShare(page: Page) {
  await openShareModal(page);
  await page
    .getByTestId('share-create-embed')
    .getByRole('button', { name: 'Create Embed' })
    .click();
  await expect(page.getByTestId('embed-builder-modal')).toBeVisible();
}

async function expectBuilderEmbedPaths(page: Page, pathPattern: RegExp): Promise<void> {
  const previewContainer = page.getByTestId('embed-builder-preview');
  await expect(previewContainer).toHaveCSS('border-top-style', 'solid');
  await expect(previewContainer).toHaveCSS('border-top-width', '1px');

  const preview = previewContainer.locator('iframe');
  await expect(preview).toHaveAttribute('src', pathPattern);
  await expect(preview).toHaveCSS('border-top-width', '0px');

  const codeInput = page.getByTestId('embed-builder-code').locator('input');
  await expect(codeInput).toHaveValue(pathPattern);
}

async function openEmbedBuilderAdvancedSection(page: Page): Promise<void> {
  await page.getByText('Advanced options').click();
}

async function toggleEmbedListLayout(page: Page): Promise<void> {
  await openEmbedBuilderAdvancedSection(page);
  await page.getByRole('checkbox', { name: 'Embed full list instead of single item' }).check();
}

test.describe('Embed share builder handoff', () => {
  test('Share from an episode opens the builder with an episode embed URL', async ({
    page,
  }, testInfo) => {
    await test.step('Navigate to the episode page and open the embed builder', async () => {
      await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
      await openEmbedBuilderFromShare(page);

      await capturePageLoad(
        page,
        testInfo,
        'The embed builder opens after Create Embed is clicked from Share on an episode page.',
        page.getByTestId('embed-builder-modal')
      );
    });

    await test.step('The builder preview and code target the episode embed route', async () => {
      await expectBuilderEmbedPaths(
        page,
        new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}(\\?|$)`)
      );
    });
  });

  test('Share from an official clip uses the official-clip embed path', async ({
    page,
  }, testInfo) => {
    await test.step('Navigate to the official clip page and open Share', async () => {
      await page.goto(`/official-clip/${E2E_SOUNDBITE_ID_TEXT}`);
      await openShareModal(page);

      const officialClipShareInput = page.locator('input[name="soundbite.official_clip"]');
      await expect(officialClipShareInput).toHaveValue(
        new RegExp(`/official-clip/${E2E_SOUNDBITE_ID_TEXT}$`)
      );

      await page
        .getByTestId('share-create-embed')
        .getByRole('button', { name: 'Create Embed' })
        .click();
      await expect(page.getByTestId('embed-builder-modal')).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The embed builder opens from Share on an official clip page.',
        page.getByTestId('embed-builder-modal')
      );
    });

    await test.step('The builder preview and code target the official-clip embed route', async () => {
      await expectBuilderEmbedPaths(
        page,
        new RegExp(`/embed/official-clip/${E2E_SOUNDBITE_ID_TEXT}(\\?|$)`)
      );

      const codeInput = page.getByTestId('embed-builder-code').locator('input');
      await expect(codeInput).not.toHaveValue(/\/soundbite\//);
    });
  });

  test('Share from a track opens the builder with a track embed URL', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}(\\?|$)`)
    );
  });

  test('Share from a clip opens the builder with a clip embed URL', async ({ page }) => {
    await page.goto(`/clip/${E2E_CLIP_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/clip/${E2E_CLIP_ID_TEXT}(\\?|$)`));
  });

  test('Share from a chapter opens the builder with a chapter embed URL', async ({ page }) => {
    await page.goto(`/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}(\\?|$)`)
    );
  });

  test('Share from a playlist opens the builder with a playlist embed URL', async ({ page }) => {
    await page.goto(`/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}(\\?|$)`)
    );
  });

  test('Episode share builder list layout toggle switches to podcast list embed', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}(\\?|$)`)
    );

    await toggleEmbedListLayout(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}(\\?|$)`)
    );
  });

  test('Track share builder list layout toggle switches to album list embed', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}(\\?|$)`)
    );

    await toggleEmbedListLayout(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}(\\?|$)`)
    );
  });

  test('Builder preview URL updates when autoplay and start time change', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    const preview = page.getByTestId('embed-builder-preview').locator('iframe');
    await expect(preview).toHaveAttribute(
      'src',
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}(\\?|$)`)
    );

    await page.getByTestId('embed-builder-autoplay').getByRole('checkbox').check();
    await page.getByTestId('embed-builder-start-time').locator('input').fill('15');

    await expect(preview).toHaveAttribute('src', /autoplay=true/);
    await expect(preview).toHaveAttribute('src', /[?&]t=15/);

    const codeInput = page.getByTestId('embed-builder-code').locator('input');
    await expect(codeInput).toHaveValue(/autoplay=true/);
    await expect(codeInput).toHaveValue(/[?&]t=15/);
  });
});
