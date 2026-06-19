import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  expectMediaPlayerTitleVisible,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_CLIP_ID_TEXT,
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
  EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
} from './helpers/seedConstants';
import { captureVerifiedElement } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function clipEditorSectionLocator(page: Page): Locator {
  return page.locator('[class*="clipEditorSection"]');
}

function chapterMarkersIn(container: Locator): Locator {
  return container.locator('[class*="chapterMarker"]');
}

test.describe('Clip editor progress bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);
  });

  test('When the Create Clip modal is open on a video episode, the clip editor progress bar does not show chapter markers', async ({
    page,
  }, testInfo) => {
    await page.goto(`/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}`);
    await expect(
      page.getByRole('heading', { name: EMBED_SAMPLE_EPISODE_VIDEO_TITLE })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Play' }).first().click();
    await expectMediaPlayerTitleVisible(page, EMBED_SAMPLE_EPISODE_VIDEO_TITLE);

    await page.getByTestId('media-player-clip-button').click();

    const createClipDialog = page.getByRole('dialog', { name: 'Create Clip' });
    await expect(createClipDialog).toBeVisible();

    const clipEditorSection = clipEditorSectionLocator(createClipDialog);
    await expect(clipEditorSection).toBeVisible();
    await expect(chapterMarkersIn(clipEditorSection)).toHaveCount(0);

    await captureVerifiedElement(
      page,
      testInfo,
      clipEditorSection,
      'The Create Clip modal clip editor hides chapter markers on the progress bar.'
    );
  });

  test('When editing a clip on a chaptered episode, the clip editor progress bar hides chapter markers while the main player still shows them', async ({
    page,
  }, testInfo) => {
    await page.goto(`/clip/edit/${E2E_CLIP_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'Edit Clip' })).toBeVisible();

    const clipEditorSection = clipEditorSectionLocator(page);
    await expect(clipEditorSection).toBeVisible();
    await expect(chapterMarkersIn(clipEditorSection)).toHaveCount(0);

    const mainPlayerProgress = page.locator('aside#media-player [class*="mediaPlayerProgress"]');
    await expect.poll(async () => chapterMarkersIn(mainPlayerProgress).count()).toBeGreaterThan(0);

    await captureVerifiedElement(
      page,
      testInfo,
      clipEditorSection,
      'The Edit Clip form clip editor hides chapter markers while chapters remain on the main player bar.'
    );
  });
});
