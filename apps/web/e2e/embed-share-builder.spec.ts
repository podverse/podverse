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
  await page
    .getByTestId('embed-builder-type-selector')
    .getByRole('radio', { name: label, exact: true })
    .check();
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

  test('Episode share builder short list type switches to podcast list embed', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
    );

    await selectEmbedBuilderType(page, 'Short list');

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`)
    );
  });

  test('Podcast list builder can switch to a popularity-sorted clip list embed', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    await selectEmbedBuilderType(page, 'Short list');

    await page
      .getByTestId('embed-builder-list-content-selector')
      .getByRole('radio', { name: 'Clips' })
      .check();
    await page
      .getByTestId('embed-builder-list-sort-selector')
      .getByRole('radio', { name: 'Popularity' })
      .check();

    await expectBuilderEmbedPaths(
      page,
      new RegExp(
        `/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}\\?.*type=clips.*sort=top.*range=all-time`
      )
    );
  });

  test('Episode share builder can switch to an episode-chapters list embed', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    await selectEmbedBuilderType(page, 'Short list');

    await page
      .getByTestId('embed-builder-list-content-selector')
      .getByRole('radio', { name: 'Chapters' })
      .check();

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/episode-chapters/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
    );

    await page
      .getByTestId('embed-builder-list-sort-selector')
      .getByRole('radio', { name: 'Last to first' })
      .check();

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/episode-chapters/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}\\?.*sort=desc`)
    );
  });

  test('Track share builder short list type switches to album list embed', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-track');

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`));

    await selectEmbedBuilderType(page, 'Short list');

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}`));

    await page
      .getByTestId('embed-builder-list-sort-selector')
      .getByRole('radio', { name: 'Last to first' })
      .check();

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}\\?.*sort=backward`)
    );
  });

  test('Builder preview URL updates when start time changes', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    const preview = page.getByTestId('embed-builder-preview').locator('iframe');
    await expect(preview).toHaveAttribute(
      'src',
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
    );

    await page.getByTestId('embed-builder-start-time').locator('input').fill('15');

    await expect(preview).toHaveAttribute('src', /[?&]t=15/);

    const codeInput = page.getByTestId('embed-builder-code').locator('input');
    await expect.poll(async () => codeInput.inputValue()).toMatch(/[?&]t=15/);
  });

  test('Border color selector updates the inline border style in the generated embed code.', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    const borderSelector = page.getByTestId('embed-builder-border-color-selector');
    const codeInput = page.getByTestId('embed-builder-code').locator('input');

    await test.step('The default border color is darker gray and appears as an inline style.', async () => {
      await expect.poll(async () => codeInput.inputValue()).toMatch(/border:1px solid #444444/);
    });

    await test.step('Choosing None removes the inline border from the generated code.', async () => {
      await borderSelector.getByRole('radio', { name: 'None' }).check();
      await expect.poll(async () => codeInput.inputValue()).not.toMatch(/border:/);
    });

    await test.step('Choosing Black sets a black inline border in the generated code.', async () => {
      await borderSelector.getByRole('radio', { name: 'Black' }).check();
      await expect.poll(async () => codeInput.inputValue()).toMatch(/border:1px solid #000000/);
    });

    await test.step('Choosing Custom and typing a color sets that inline border in the generated code.', async () => {
      await borderSelector.getByRole('radio', { name: 'Custom' }).check();
      await page.getByTestId('embed-builder-border-color-custom').locator('input').fill('#abcdef');
      await expect.poll(async () => codeInput.inputValue()).toMatch(/border:1px solid #abcdef/);
    });
  });

  test('When tall-list auto-resize settings are enabled in the builder, the URL and helper snippet update together.', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    await selectEmbedBuilderType(page, 'Tall list');
    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`)
    );

    await page.getByTestId('embed-builder-list-visible-rows').locator('input').fill('7');
    const preview = page.getByTestId('embed-builder-preview').locator('iframe');
    await expect(preview).toHaveAttribute('src', /[?&]rows=7/);

    await page.getByText('Advanced options').click();
    await page.getByRole('checkbox', { name: 'Auto-resize iframe to content width' }).check();

    await expect(preview).toHaveAttribute('src', /[?&]resize=1/);
    const codeInput = page.getByTestId('embed-builder-code').locator('input');
    await expect.poll(async () => codeInput.inputValue()).toMatch(/data-podverse-embed-resize/);
    await expect(page.locator('textarea[name="embed_resize_listener_snippet"]')).toBeVisible();
    await expect(page.locator('textarea[name="embed_resize_listener_snippet"]')).toHaveValue(
      /MESSAGE_SOURCE/
    );
  });

  test('Builder type changes set default prefer values and generated URLs include player and presentation params', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page, 'share-embed-episode');

    const preferSelector = page.getByTestId('embed-builder-prefer-selector');
    const preview = page.getByTestId('embed-builder-preview').locator('iframe');
    const codeInput = page.getByTestId('embed-builder-code').locator('input');

    await test.step('Short player defaults to prefer audio in preview and embed code', async () => {
      await expect(preferSelector.getByRole('radio', { name: 'Prefer audio' })).toBeChecked();
      await expect(preview).toHaveAttribute('src', /[?&]player=short/);
      await expect(preview).toHaveAttribute('src', /[?&]presentation=audio/);
      await expect.poll(async () => codeInput.inputValue()).toMatch(/player=short/);
      await expect.poll(async () => codeInput.inputValue()).toMatch(/presentation=audio/);
    });

    await test.step('Tall player defaults to prefer video', async () => {
      await selectEmbedBuilderType(page, 'Tall');
      await expect(preferSelector.getByRole('radio', { name: 'Prefer video' })).toBeChecked();
      await expect(preview).toHaveAttribute('src', /[?&]player=tall/);
      await expect(preview).toHaveAttribute('src', /[?&]presentation=video/);
    });

    await test.step('Prefer audio can be selected independently on tall player', async () => {
      await preferSelector.getByRole('radio', { name: 'Prefer audio' }).check();
      await expect(preview).toHaveAttribute('src', /[?&]player=tall/);
      await expect(preview).toHaveAttribute('src', /[?&]presentation=audio/);
    });
  });
});
