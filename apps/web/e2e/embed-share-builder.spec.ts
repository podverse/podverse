import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  E2E_CLIP_ID_TEXT,
  E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT,
  E2E_EMBED_PLAYLIST_ID_TEXT,
  E2E_EMBED_VIDEO_CHANNEL_ID_TEXT,
  E2E_ITEM_CHAPTER_INTRO_ID_TEXT,
  E2E_MUSIC_ALBUM_ID_TEXT,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  E2E_SOUNDBITE_ID_TEXT,
} from './helpers/seedConstants';
import {
  expectEmbedShellHeightStable,
  expectFrameElementHeightWithin,
  embedTitleLocator,
} from './helpers/embedAssertions';
import { capturePageLoad } from './helpers/stepScreenshots';
import {
  getEmbedListResponsiveIframeHeightPx,
  getEmbedListVideoPlaceholderHeightPx,
} from '../src/lib/embed/embedLayoutDimensions';
import { EMBED_LIST_ROW_HEIGHT_PX } from '../src/lib/embed/embedLayoutTokens';

const SHARE_EMBED_BUILDER_TEST_ID = 'share-embed-builder';

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

async function openShareModalFromPlaylistItemMoreMenu(page: Page) {
  await page.goto(`/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`);
  const moreButton = page.getByRole('button', { name: 'More options' }).first();
  await expect(moreButton).toBeVisible();
  await moreButton.click();
  await page.getByRole('menuitem', { name: 'Share' }).click();
  await expect(page.getByRole('dialog', { name: 'Share' })).toBeVisible();
}

async function clickShareEmbedAction(
  page: Page,
  embedButtonTestId: string = SHARE_EMBED_BUILDER_TEST_ID
): Promise<void> {
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

async function openEmbedBuilderFromShare(
  page: Page,
  embedButtonTestId: string = SHARE_EMBED_BUILDER_TEST_ID
) {
  await openShareModal(page);
  await clickShareEmbedAction(page, embedButtonTestId);
}

function getEmbedBuilderCodeValueLocator(page: Page) {
  return page.getByTestId('embed-builder-code-value');
}

async function expectEmbedBuilderCodeValue(page: Page, pattern: RegExp): Promise<void> {
  const codeValue = getEmbedBuilderCodeValueLocator(page);
  await expect.poll(async () => codeValue.innerText()).toMatch(pattern);
}

async function expectBuilderEmbedPaths(page: Page, pathPattern: RegExp): Promise<void> {
  const previewContainer = page.getByTestId('embed-builder-preview');
  await expect(previewContainer).toHaveCSS('border-top-style', 'solid');
  await expect(previewContainer).toHaveCSS('border-top-width', '1px');

  const preview = previewContainer.locator('iframe');
  await expect(preview).toHaveAttribute('src', pathPattern);
  await expect(preview).toHaveCSS('border-top-width', '0px');

  await expectEmbedBuilderCodeValue(page, pathPattern);
}

async function selectEmbedBuilderPlayerSize(page: Page, label: string): Promise<void> {
  await page
    .getByTestId('embed-builder-type-selector')
    .getByRole('radio', { name: label, exact: true })
    .check();
}

async function selectEmbedBuilderList(page: Page, label: 'On' | 'Off'): Promise<void> {
  await page
    .getByTestId('embed-builder-list-selector')
    .getByRole('radio', { name: label, exact: true })
    .check();
}

async function fillEmbedBuilderInput(page: Page, testId: string, value: string): Promise<void> {
  const input = page.getByTestId(testId).locator('input');
  await input.fill(value);
  await input.blur();
}

test.describe('Embed share builder handoff', () => {
  test.setTimeout(30_000);

  test('Share from a podcast opens the builder with a podcast list embed URL', async ({ page }) => {
    await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`)
    );
  });

  test('Podcast share builder shows list on with off disabled for channel embeds', async ({
    page,
  }) => {
    await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    const orientation = page.getByTestId('embed-builder-orientation');
    await expect(orientation.getByRole('heading')).toContainText(/^Podcast:/);
    await expect(orientation.getByRole('link')).toHaveAttribute(
      'href',
      `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`
    );
    await expect(orientation.getByRole('link')).toHaveAttribute('target', '_blank');

    const typeSelector = page.getByTestId('embed-builder-type-selector');
    await expect(typeSelector.getByRole('radio', { name: 'Compact', exact: true })).toBeVisible();
    await expect(
      typeSelector.getByRole('radio', { name: 'Responsive', exact: true })
    ).toBeVisible();

    const listSelector = page.getByTestId('embed-builder-list-selector');
    await expect(listSelector.getByRole('radio', { name: 'On', exact: true })).toBeChecked();
    await expect(listSelector.getByRole('radio', { name: 'Off', exact: true })).toBeDisabled();
  });

  test('Episode share builder offers compact, responsive, and list on/off controls', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    const orientation = page.getByTestId('embed-builder-orientation');
    await expect(orientation.getByRole('heading')).toContainText(/^Episode:/);
    await expect(orientation.getByRole('link')).toHaveAttribute(
      'href',
      `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`
    );
    await expect(orientation.getByRole('link')).toHaveAttribute('target', '_blank');

    const typeSelector = page.getByTestId('embed-builder-type-selector');
    await expect(typeSelector.getByRole('radio', { name: 'Compact', exact: true })).toBeVisible();
    await expect(
      typeSelector.getByRole('radio', { name: 'Responsive', exact: true })
    ).toBeVisible();

    const listSelector = page.getByTestId('embed-builder-list-selector');
    await expect(listSelector.getByRole('radio', { name: 'On', exact: true })).toBeVisible();
    await expect(listSelector.getByRole('radio', { name: 'Off', exact: true })).toBeVisible();
    await expect(listSelector.getByRole('radio', { name: 'Off', exact: true })).toBeChecked();
  });

  test('Share from an episode opens the builder with an episode embed URL', async ({
    page,
  }, testInfo) => {
    await test.step('Navigate to the episode page and open the embed builder', async () => {
      await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
      await openEmbedBuilderFromShare(page);

      await expect(page.locator('#page-wrapper')).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The embed builder page opens after Embed Builder is clicked from Share on an episode page.',
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

      await clickShareEmbedAction(page);
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

      await expect(getEmbedBuilderCodeValueLocator(page)).not.toContainText(/\/soundbite\//);
    });
  });

  test('Share from a track opens the builder with a track embed URL', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`));
  });

  test('Share from a clip opens the builder with a clip embed URL', async ({ page }) => {
    await page.goto(`/clip/${E2E_CLIP_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Clip End Pause', level: 3 })).toBeVisible();
    await openShareModal(page);

    const clipShareInput = page.locator('input[name="clip.clip"]');
    await expect(clipShareInput).toHaveValue(new RegExp(`/clip/${E2E_CLIP_ID_TEXT}$`));

    await clickShareEmbedAction(page);

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/clip/${E2E_CLIP_ID_TEXT}`));
  });

  test('Share from a chapter opens the builder with a chapter embed URL', async ({ page }) => {
    await page.goto(`/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}`)
    );
  });

  test('Share from a playlist opens the builder with a playlist embed URL', async ({ page }) => {
    await page.goto(`/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`)
    );
  });

  test('Share from a playlist item More menu opens the builder with playlist_item in the URL', async ({
    page,
  }) => {
    await openShareModalFromPlaylistItemMoreMenu(page);
    await clickShareEmbedAction(page);

    await expect(page).toHaveURL(
      new RegExp(
        `[?&]playlist=${E2E_EMBED_PLAYLIST_ID_TEXT}.*playlist_item=${E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT}|playlist_item=${E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT}.*playlist=${E2E_EMBED_PLAYLIST_ID_TEXT}`
      )
    );

    await expectBuilderEmbedPaths(
      page,
      new RegExp(
        `/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}\\?.*play_id_text=${E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT}`
      )
    );
  });

  test('Episode share builder list on switches to podcast list embed', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
    );

    await selectEmbedBuilderList(page, 'On');

    await expectBuilderEmbedPaths(
      page,
      new RegExp(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`)
    );
  });

  test('Podcast list builder can switch to a popularity-sorted clip list embed', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await selectEmbedBuilderList(page, 'On');

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
    await openEmbedBuilderFromShare(page);

    await selectEmbedBuilderList(page, 'On');

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

  test('Track share builder list on switches to album list embed', async ({ page }) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await expectBuilderEmbedPaths(page, new RegExp(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`));

    await selectEmbedBuilderList(page, 'On');

    await expectBuilderEmbedPaths(
      page,
      new RegExp(
        `/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}\\?.*play_id_text=${E2E_MUSIC_TRACK_ONE_ID_TEXT}`
      )
    );

    const embedFrame = page.getByTestId('embed-builder-preview').frameLocator('iframe');
    await expect(embedTitleLocator(embedFrame)).toContainText('E2E Music Track One');

    await page
      .getByTestId('embed-builder-list-sort-selector')
      .getByRole('radio', { name: 'Last to first' })
      .check();

    await expectBuilderEmbedPaths(
      page,
      new RegExp(
        `/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}\\?.*play_id_text=${E2E_MUSIC_TRACK_ONE_ID_TEXT}.*sort=backward`
      )
    );
  });

  test('Builder preview URL updates when start time changes', async ({ page }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    const preview = page.getByTestId('embed-builder-preview').locator('iframe');
    await expect(preview).toHaveAttribute(
      'src',
      new RegExp(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`)
    );

    await fillEmbedBuilderInput(page, 'embed-builder-start-time', '15');

    await expect(preview).toHaveAttribute('src', /[?&]t=15/);

    await expectEmbedBuilderCodeValue(page, /[?&]t=15/);
  });

  test('Border color selector updates the inline border style in the generated embed code.', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    const borderSelector = page.getByTestId('embed-builder-border-color-selector');

    await test.step('The default border color is darker gray and appears as an inline style.', async () => {
      await expectEmbedBuilderCodeValue(page, /border:1px solid #444444/);
    });

    await test.step('Choosing None removes the inline border from the generated code.', async () => {
      await borderSelector.getByRole('radio', { name: 'None' }).check();
      await expect
        .poll(async () => getEmbedBuilderCodeValueLocator(page).innerText())
        .not.toMatch(/border:/);
    });

    await test.step('Choosing Black sets a black inline border in the generated code.', async () => {
      await borderSelector.getByRole('radio', { name: 'Black' }).check();
      await expectEmbedBuilderCodeValue(page, /border:1px solid #000000/);
    });

    await test.step('Choosing Custom and typing a color sets that inline border in the generated code.', async () => {
      await borderSelector.getByRole('radio', { name: 'Custom' }).check();
      await fillEmbedBuilderInput(page, 'embed-builder-border-color-custom', '#abcdef');
      await expectEmbedBuilderCodeValue(page, /border:1px solid #abcdef/);
    });
  });

  test('Builder preview height matches list items visible for responsive list embeds', async ({
    page,
  }) => {
    await page.goto(`/podcast/${E2E_EMBED_VIDEO_CHANNEL_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await selectEmbedBuilderList(page, 'On');
    await selectEmbedBuilderPlayerSize(page, 'Responsive');
    await page
      .getByTestId('embed-builder-prefer-selector')
      .getByRole('radio', { name: 'Video' })
      .check();

    const previewFrame = page.getByTestId('embed-builder-preview');
    const embedFrame = previewFrame.frameLocator('iframe');
    const listRegion = embedFrame.getByTestId('embed-list-region');

    await expect(listRegion).toBeVisible();

    await expectEmbedShellHeightStable(
      previewFrame,
      getEmbedListResponsiveIframeHeightPx({ aspectRatio: '16x9', listVisibleRows: 5 })
    );

    await expectFrameElementHeightWithin(listRegion, EMBED_LIST_ROW_HEIGHT_PX * 5);

    await fillEmbedBuilderInput(page, 'embed-builder-list-visible-rows', '3');

    await expectEmbedShellHeightStable(
      previewFrame,
      getEmbedListResponsiveIframeHeightPx({ aspectRatio: '16x9', listVisibleRows: 3 })
    );

    await expectFrameElementHeightWithin(listRegion, EMBED_LIST_ROW_HEIGHT_PX * 3);
  });

  test('Builder aspect ratio resizes list video panel only, not the list region', async ({
    page,
  }) => {
    await page.goto(`/podcast/${E2E_EMBED_VIDEO_CHANNEL_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    await selectEmbedBuilderPlayerSize(page, 'Responsive');
    await page
      .getByTestId('embed-builder-prefer-selector')
      .getByRole('radio', { name: 'Video' })
      .check();

    const previewFrame = page.getByTestId('embed-builder-preview');
    const embedFrame = previewFrame.frameLocator('iframe');
    const listRegion = embedFrame.getByTestId('embed-list-region');
    const playerRegion = embedFrame.getByTestId('embed-player-region');

    await expect(listRegion).toBeVisible();

    const listVisibleRows = 5;
    await expectFrameElementHeightWithin(listRegion, EMBED_LIST_ROW_HEIGHT_PX * listVisibleRows);
    await expectFrameElementHeightWithin(
      playerRegion,
      getEmbedListVideoPlaceholderHeightPx('16x9')
    );

    await page
      .getByTestId('embed-builder-aspect-ratio-selector')
      .getByRole('radio', { name: '4:3' })
      .check();

    await expectEmbedShellHeightStable(
      previewFrame,
      getEmbedListResponsiveIframeHeightPx({ aspectRatio: '4x3', listVisibleRows })
    );

    await expectFrameElementHeightWithin(listRegion, EMBED_LIST_ROW_HEIGHT_PX * listVisibleRows);
    await expectFrameElementHeightWithin(playerRegion, getEmbedListVideoPlaceholderHeightPx('4x3'));
  });

  test('Builder type changes set default prefer values and generated URLs include player and presentation params', async ({
    page,
  }) => {
    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await openEmbedBuilderFromShare(page);

    const preferSelector = page.getByTestId('embed-builder-prefer-selector');
    const preview = page.getByTestId('embed-builder-preview').locator('iframe');

    await test.step('Compact player defaults to prefer audio in preview and embed code', async () => {
      await expect(preferSelector.getByRole('radio', { name: 'Audio' })).toBeChecked();
      await expect(preferSelector.getByRole('radio', { name: 'Video' })).toBeDisabled();
      await expect(preview).toHaveAttribute('src', /[?&]player=compact/);
      await expect(preview).toHaveAttribute('src', /[?&]presentation=audio/);
      await expectEmbedBuilderCodeValue(page, /player=compact/);
      await expectEmbedBuilderCodeValue(page, /presentation=audio/);
    });

    await test.step('List on with compact player disables video prefer option', async () => {
      await selectEmbedBuilderList(page, 'On');
      await expect(preferSelector.getByRole('radio', { name: 'Audio' })).toBeChecked();
      await expect(preferSelector.getByRole('radio', { name: 'Video' })).toBeDisabled();
    });

    await test.step('Responsive player defaults to prefer video', async () => {
      await selectEmbedBuilderPlayerSize(page, 'Responsive');
      await expect(preferSelector.getByRole('radio', { name: 'Video' })).toBeChecked();
      await expect(preferSelector.getByRole('radio', { name: 'Video' })).toBeEnabled();
      await expect(preview).toHaveAttribute('src', /[?&]player=responsive/);
      await expect(preview).toHaveAttribute('src', /[?&]presentation=video/);
    });

    await test.step('Prefer audio can be selected independently on responsive player', async () => {
      await preferSelector.getByRole('radio', { name: 'Audio' }).check();
      await expect(preview).toHaveAttribute('src', /[?&]player=responsive/);
      await expect(preview).toHaveAttribute('src', /[?&]presentation=audio/);
    });
  });
});
