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
  const shareButton = page.getByRole('button', { name: 'Share' }).locator('visible=true').first();
  await expect(shareButton).toBeVisible();
  await expect(shareButton).toBeEnabled();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await shareButton.click();
    try {
      await expect(page.getByRole('dialog', { name: 'Share' })).toBeVisible({ timeout: 5_000 });
      return;
    } catch {
      if (attempt === 1) {
        throw new Error('Share modal did not open after retry.');
      }
    }
  }
}

async function clickShareEmbedAction(page: Page, embedButtonTestId: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Share' });
  const embedControl = dialog.getByTestId(embedButtonTestId).getByRole('link');
  await expect(embedControl).toBeVisible({ timeout: 10_000 });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await embedControl.click();
    try {
      await expect(page.getByTestId('embed-builder-page')).toBeVisible({ timeout: 10_000 });
      return;
    } catch {
      if (attempt === 1) {
        throw new Error(`Embed builder page did not open for ${embedButtonTestId}.`);
      }
      await expect(dialog).toBeVisible({ timeout: 5_000 });
    }
  }
}

async function openEmbedBuilderFromShare(page: Page, embedButtonTestId: string) {
  await openShareModal(page);
  await clickShareEmbedAction(page, embedButtonTestId);
}

async function expectBuilderEmbedPaths(page: Page, pathPattern: RegExp): Promise<void> {
  const previewContainer = page.getByTestId('embed-builder-preview');
  await expect(previewContainer).toHaveCSS('border-top-style', 'solid');
  await expect(previewContainer).toHaveCSS('border-top-width', '1px');

  const preview = previewContainer.locator('iframe');
  await expect(preview).toHaveAttribute('src', pathPattern);
  await expect(preview).toHaveCSS('border-top-width', '0px');

  const codeInput = page.getByTestId('embed-builder-code').locator('input');
  await expect.poll(async () => codeInput.inputValue()).toMatch(pathPattern);
}

async function selectEmbedBuilderType(page: Page, label: string): Promise<void> {
  await page.getByTestId('embed-builder-type-selector').getByRole('radio', { name: label }).check();
}

test.describe('Embed share builder handoff', () => {
  test.setTimeout(30_000);

  test('Share from an episode opens the builder with an episode embed URL', async ({
    page,
  }, testInfo) => {
    await test.step('Navigate to the episode page and open the embed builder', async () => {
      await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
      await openEmbedBuilderFromShare(page, 'share-embed-episode');

      await capturePageLoad(
        page,
        testInfo,
        'The embed builder page opens after Embed Episode is clicked from Share on an episode page.',
        page.getByTestId('embed-builder-page')
      );
    });

    await test.step('The builder preview and code target the episode embed route', async () => {
      await expectBuilderEmbedPaths(
        page,
        new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
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

      await clickShareEmbedAction(page, 'share-embed-official-clip');
      await expect(page.getByTestId('embed-builder-page')).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The embed builder page opens from Share on an official clip page.',
        page.getByTestId('embed-builder-page')
      );
    });

    await test.step('The builder preview and code target the official-clip embed route', async () => {
      await expectBuilderEmbedPaths(
        page,
        new RegExp(`/embed/official-clip/${E2E_SOUNDBITE_ID_TEXT}`)
      );

      const codeInput = page.getByTestId('embed-builder-code').locator('input');
      await expect(codeInput).not.toHaveValue(/\/soundbite\//);
    });
  });

  test('Share from a track opens the builder with a track embed URL', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-track');

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`));
  });

  test('Share from a clip opens the builder with a clip embed URL', async ({ page }) => {
    await page.goto(`/clip/${E2E_CLIP_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Clip End Pause', level: 3 })).toBeVisible();
    await openShareModal(page);

    const clipShareInput = page.locator('input[name="clip.clip"]');
    await expect(clipShareInput).toHaveValue(new RegExp(`/clip/${E2E_CLIP_ID_TEXT}$`));

    await clickShareEmbedAction(page, 'share-embed-clip');

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/clip/${E2E_CLIP_ID_TEXT}`));
  });

  test('Share from a chapter opens the builder with a chapter embed URL', async ({ page }) => {
    await page.goto(`/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-chapter');

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}`)
    );
  });

  test('Share from a playlist opens the builder with a playlist embed URL', async ({ page }) => {
    await page.goto(`/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-playlist');

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`)
    );
  });

  test('Episode share builder audio list type switches to podcast list embed', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
    );

    await selectEmbedBuilderType(page, 'Audio list');

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`)
    );
  });

  test('Track share builder audio list type switches to album list embed', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-track');

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`));

    await selectEmbedBuilderType(page, 'Audio list');

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}`));
  });

  test('Builder preview URL updates when autoplay and start time change', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    const preview = page.getByTestId('embed-builder-preview').locator('iframe');
    await expect(preview).toHaveAttribute(
      'src',
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
    );

    await page.getByTestId('embed-builder-autoplay').getByRole('checkbox').check();
    await page.getByTestId('embed-builder-start-time').locator('input').fill('15');

    await expect(preview).toHaveAttribute('src', /autoplay=true/);
    await expect(preview).toHaveAttribute('src', /[?&]t=15/);

    const codeInput = page.getByTestId('embed-builder-code').locator('input');
    await expect.poll(async () => codeInput.inputValue()).toMatch(/autoplay=true/);
    await expect.poll(async () => codeInput.inputValue()).toMatch(/[?&]t=15/);
  });
});
