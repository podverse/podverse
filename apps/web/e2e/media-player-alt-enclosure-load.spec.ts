import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_EMBED_VIDEO_CHANNEL_ID_TEXT,
  EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, captureVerifiedElement } from './helpers/stepScreenshots';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const DESKTOP_VIEWPORT = { width: 1200, height: 900 };

// Second seeded video episode on the embed video channel (see tools/web/seed-embed-fixtures.mjs:
// EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT). It has the same audio+video alternate enclosures as
// episode one, so its row shows the "Select media source" icon.
const EMBED_SAMPLE_EPISODE_VIDEO_TWO_TITLE = 'Episode Two (video)';
const SELECT_SOURCE_LABEL = 'Select media source';
const AUDIO_SOURCE_LABEL = 'OGG Opus';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function fullscreenModalLocator(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Fullscreen media player' });
}

function sourceSelectorModalLocator(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Select Media Source' });
}

/** The episode row (CommonEpisodeRow) that contains the given title heading and its row actions. */
function episodeRow(page: Page, title: string, exact = false): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { level: 3, name: title, exact }) })
    .filter({ has: page.getByRole('button', { name: SELECT_SOURCE_LABEL }) })
    .last();
}

async function openFullscreenMediaPlayerModal(page: Page): Promise<Locator> {
  await page.locator('#media-player').getByRole('button').first().click();
  const modal = fullscreenModalLocator(page);
  await expect(modal).toBeVisible();
  return modal;
}

test.describe('Alt-enclosure icon loads the row item', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginSeedUser(page);
  });

  test('loads a non-playing row item with the chosen source instead of switching the now-playing item', async ({
    page,
  }, testInfo) => {
    await page.goto(`/podcast/${E2E_EMBED_VIDEO_CHANNEL_ID_TEXT}`);

    const rowOne = episodeRow(page, EMBED_SAMPLE_EPISODE_VIDEO_TITLE, true);
    const rowTwo = episodeRow(page, EMBED_SAMPLE_EPISODE_VIDEO_TWO_TITLE);
    await expect(rowOne).toBeVisible();
    await expect(rowTwo).toBeVisible();

    // Play episode one so it becomes the now-playing item.
    await actionAndCapture(
      page,
      testInfo,
      'Playing episode one from its list row makes it the now-playing item.',
      async () => {
        await rowOne.getByRole('button', { name: 'Play' }).click();
        const modal = await openFullscreenMediaPlayerModal(page);
        await expect(
          modal.getByRole('button', { name: EMBED_SAMPLE_EPISODE_VIDEO_TITLE, exact: true })
        ).toBeVisible();
        await modal.getByRole('button', { name: 'Close modal' }).click();
        await expect(fullscreenModalLocator(page)).toHaveCount(0);
      }
    );

    // On episode two's row (NOT the now-playing item) open the source selector and pick an audio
    // source. The icon must act as a play button for that row's item.
    await rowTwo.getByRole('button', { name: SELECT_SOURCE_LABEL }).click();
    const sourceModal = sourceSelectorModalLocator(page);
    await expect(sourceModal).toBeVisible();

    await actionAndCapture(
      page,
      testInfo,
      'Selecting a source on a non-playing row loads that row item into the player.',
      async () => {
        await sourceModal.getByText(AUDIO_SOURCE_LABEL).first().click();
        await expect(sourceSelectorModalLocator(page)).toHaveCount(0);
      }
    );

    // The now-playing item is episode two (the row we clicked), not episode one whose enclosure
    // would have been mutated by the old behavior.
    const modal = await openFullscreenMediaPlayerModal(page);
    await expect(
      modal.getByRole('button', { name: EMBED_SAMPLE_EPISODE_VIDEO_TWO_TITLE })
    ).toBeVisible();
    await expect(
      modal.getByRole('button', { name: EMBED_SAMPLE_EPISODE_VIDEO_TITLE, exact: true })
    ).toHaveCount(0);

    await captureVerifiedElement(
      page,
      testInfo,
      modal,
      'The alt-enclosure icon on a non-playing row loaded that row item as the now-playing item.'
    );
  });
});
