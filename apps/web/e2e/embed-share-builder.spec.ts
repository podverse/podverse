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
  const createEmbed = page.getByTestId('share-create-embed');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await shareButton.click();
    try {
      await expect(createEmbed).toBeVisible({ timeout: 5_000 });
      return;
    } catch {
      if (attempt === 1) {
        throw new Error('Share modal did not open after retry.');
      }
    }
  }
}

async function closeEmbedBuilderIfOpen(page: Page): Promise<void> {
  const builder = page.getByTestId('embed-builder-modal');
  if (await builder.isVisible()) {
    await page.keyboard.press('Escape');
    // Non-fatal cleanup: page.goto in each test resets UI state.
    if (await builder.isVisible()) {
      const globalCloseButton = page.getByRole('button', { name: /close/i }).first();
      if (await globalCloseButton.isVisible()) {
        await globalCloseButton.click();
      }
    }
  }
}

async function openEmbedBuilderFromShare(page: Page) {
  await openShareModal(page);
  const createEmbedButton = page
    .getByTestId('share-create-embed')
    .getByRole('button', { name: 'Create Embed' });
  const embedBuilderModal = page.getByTestId('embed-builder-modal');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await createEmbedButton.click();
    try {
      await expect(embedBuilderModal).toBeVisible({ timeout: 5_000 });
      return;
    } catch {
      if (attempt === 1) {
        throw new Error('Embed builder did not open after retry.');
      }
    }
  }
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

async function openEmbedBuilderAdvancedSection(page: Page): Promise<void> {
  await page.getByText('Advanced options').click();
}

async function toggleEmbedListLayout(page: Page): Promise<void> {
  await openEmbedBuilderAdvancedSection(page);
  await page.getByRole('checkbox', { name: 'Embed full list instead of single item' }).check();
}

test.describe('Embed share builder handoff', () => {
  test.setTimeout(30_000);

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
        new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
      );
    });

    await closeEmbedBuilderIfOpen(page);
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
        new RegExp(`/embed/official-clip/${E2E_SOUNDBITE_ID_TEXT}`)
      );

      const codeInput = page.getByTestId('embed-builder-code').locator('input');
      await expect(codeInput).not.toHaveValue(/\/soundbite\//);
    });

    await closeEmbedBuilderIfOpen(page);
  });

  test('Share from a track opens the builder with a track embed URL', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`));

    await closeEmbedBuilderIfOpen(page);
  });

  test('Share from a clip opens the builder with a clip embed URL', async ({ page }) => {
    await page.goto(`/clip/${E2E_CLIP_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Clip End Pause', level: 3 })).toBeVisible();
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/clip/${E2E_CLIP_ID_TEXT}`));

    await closeEmbedBuilderIfOpen(page);
  });

  test('Share from a chapter opens the builder with a chapter embed URL', async ({ page }) => {
    await page.goto(`/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}`)
    );

    await closeEmbedBuilderIfOpen(page);
  });

  test('Share from a playlist opens the builder with a playlist embed URL', async ({ page }) => {
    await page.goto(`/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`)
    );

    await closeEmbedBuilderIfOpen(page);
  });

  test('Episode share builder list layout toggle switches to podcast list embed', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
    );

    await toggleEmbedListLayout(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`)
    );

    await closeEmbedBuilderIfOpen(page);
  });

  test('Track share builder list layout toggle switches to album list embed', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`));

    await toggleEmbedListLayout(page);

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}`));

    await closeEmbedBuilderIfOpen(page);
  });

  test('Builder preview URL updates when autoplay and start time change', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

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

    await closeEmbedBuilderIfOpen(page);
  });
});
