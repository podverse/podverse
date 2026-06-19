import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, captureVerifiedElement } from './helpers/stepScreenshots';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const DESKTOP_VIEWPORT = { width: 1200, height: 900 };
const SHORT_VIEWPORT = { width: 1200, height: 520 };
const TALL_NARROW_VIEWPORT = { width: 420, height: 1024 };
const PODCAST_AUDIO_EPISODE_TITLE = 'E2E Podcast Resume P > 0';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function floatingVideoPortalLocator(page: Page): Locator {
  return page.getByTestId('floating-video-portal');
}

function fullscreenModalLocator(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Fullscreen media player' });
}

async function openFullscreenMediaPlayerModal(page: Page): Promise<Locator> {
  await page.locator('#media-player').getByRole('button').first().click();
  const modal = fullscreenModalLocator(page);
  await expect(modal).toBeVisible();
  return modal;
}

async function startEpisodePlayback(
  page: Page,
  itemIdText: string,
  heading: string
): Promise<void> {
  await page.goto(`/episode/${itemIdText}`);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  // The seeded user has a restored "now playing" item that loads asynchronously into the player
  // bar. Wait for that restore to settle before starting playback so it does not clobber the item
  // we are about to play (a cold-start race that otherwise only bites the first test).
  await expect(page.locator('#media-player').getByRole('button').first()).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).first().click();
}

test.describe('Modal video desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginSeedUser(page);
  });

  test('shows video in the modal center and returns to the floating portal on close', async ({
    page,
  }, testInfo) => {
    await startEpisodePlayback(
      page,
      E2E_EMBED_VIDEO_ITEM_ID_TEXT,
      EMBED_SAMPLE_EPISODE_VIDEO_TITLE
    );
    await expect(floatingVideoPortalLocator(page)).toBeVisible();

    await actionAndCapture(
      page,
      testInfo,
      'Opening the fullscreen media player modal moves video into the modal target.',
      async () => {
        await openFullscreenMediaPlayerModal(page);
      },
      fullscreenModalLocator(page)
    );

    const modal = fullscreenModalLocator(page);

    // Smoke check: the modal shows the playing video (not square artwork), and the floating
    // portal hands off to the modal. Detailed sizing/containment is covered by the short-viewport
    // test; pixel-exact metrics are intentionally not asserted here to avoid brittleness.
    const videoTarget = modal.getByTestId('modal-video-target');
    await expect(videoTarget).toBeVisible();
    await expect(videoTarget.locator('video')).toBeVisible();
    await expect(modal.getByRole('img', { name: 'Media player image' })).toHaveCount(0);
    await expect(floatingVideoPortalLocator(page)).toHaveCount(0);
    await expect(
      modal.getByRole('button', { name: EMBED_SAMPLE_EPISODE_VIDEO_TITLE })
    ).toBeVisible();

    await captureVerifiedElement(
      page,
      testInfo,
      videoTarget,
      'The modal video target shows the playing video instead of square artwork.'
    );

    await actionAndCapture(
      page,
      testInfo,
      'Closing the modal returns the video to the floating portal.',
      async () => {
        await modal.getByRole('button', { name: 'Close modal' }).click();
        await expect(fullscreenModalLocator(page)).toHaveCount(0);
        await expect(floatingVideoPortalLocator(page)).toBeVisible();
        await expect(floatingVideoPortalLocator(page).locator('video')).toBeVisible();
      },
      floatingVideoPortalLocator(page)
    );
  });

  test('aligns secondary control row with playback controls in the modal', async ({
    page,
  }, testInfo) => {
    await startEpisodePlayback(
      page,
      E2E_EMBED_VIDEO_ITEM_ID_TEXT,
      EMBED_SAMPLE_EPISODE_VIDEO_TITLE
    );

    const modal = await openFullscreenMediaPlayerModal(page);

    const layoutMetrics = await modal
      .locator('[class*="mediaPlayerModalContent"]')
      .first()
      .evaluate((root) => {
        const startSection = root.querySelector('[class*="startSection"]');
        const buttonsSection = root.querySelector('[class*="butttonsSection"]');
        if (!startSection || !buttonsSection) {
          return null;
        }

        const startRect = startSection.getBoundingClientRect();
        const buttonsRect = buttonsSection.getBoundingClientRect();
        const startCenterX = startRect.left + startRect.width / 2;
        const buttonsCenterX = buttonsRect.left + buttonsRect.width / 2;

        const directButtons = startSection.querySelectorAll(':scope > button');
        const settingsButton = startSection.querySelector(':scope > div > button');
        const shuffleButton = directButtons[directButtons.length - 1];
        const settingsRect = settingsButton?.getBoundingClientRect();
        const shuffleRect = shuffleButton?.getBoundingClientRect();

        return {
          centerDelta: Math.abs(startCenterX - buttonsCenterX),
          settingsWidth: settingsRect?.width ?? 0,
          settingsHeight: settingsRect?.height ?? 0,
          siblingWidth: shuffleRect?.width ?? 0,
          siblingHeight: shuffleRect?.height ?? 0,
        };
      });

    expect(layoutMetrics).not.toBeNull();
    if (layoutMetrics !== null) {
      expect(layoutMetrics.centerDelta).toBeLessThanOrEqual(2);
      expect(
        Math.abs(layoutMetrics.settingsWidth - layoutMetrics.siblingWidth)
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(layoutMetrics.settingsHeight - layoutMetrics.siblingHeight)
      ).toBeLessThanOrEqual(1);
    }

    await captureVerifiedElement(
      page,
      testInfo,
      modal.locator('[class*="butttonsSection"]').first(),
      'Secondary control row icons match playback row sizing and horizontal alignment.'
    );
  });

  test('keeps modal video visible and contained on a short viewport', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(SHORT_VIEWPORT);
    await startEpisodePlayback(
      page,
      E2E_EMBED_VIDEO_ITEM_ID_TEXT,
      EMBED_SAMPLE_EPISODE_VIDEO_TITLE
    );

    const modal = await openFullscreenMediaPlayerModal(page);
    const videoTarget = modal.getByTestId('modal-video-target');
    const video = videoTarget.locator('video');
    await expect(video).toBeVisible();

    const metrics = await video.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const wrapper = el.parentElement;
      const wrapperRect = wrapper?.getBoundingClientRect();
      return {
        videoWidth: rect.width,
        videoHeight: rect.height,
        wrapperWidth: wrapperRect?.width ?? 0,
        wrapperHeight: wrapperRect?.height ?? 0,
      };
    });

    expect(metrics.videoWidth).toBeGreaterThan(0);
    expect(metrics.videoHeight).toBeGreaterThan(0);
    expect(metrics.videoWidth).toBeLessThanOrEqual(metrics.wrapperWidth + 1);
    expect(metrics.videoHeight).toBeLessThanOrEqual(metrics.wrapperHeight + 1);
    expect(Math.abs(metrics.wrapperHeight - metrics.videoHeight)).toBeLessThanOrEqual(2);

    const modalContentScrollable = await modal
      .locator('[class*="mediaPlayerModalContent"]')
      .first()
      .evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.overflowY === 'auto' || style.overflowY === 'scroll';
      });
    expect(modalContentScrollable).toBe(true);

    await captureVerifiedElement(
      page,
      testInfo,
      videoTarget,
      'On a short viewport the modal video shrinks within the available modal space.'
    );
  });
});

test.describe('Modal video audio regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginSeedUser(page);
  });

  test('keeps artwork in the modal for audio playback', async ({ page }, testInfo) => {
    await startEpisodePlayback(
      page,
      E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
      PODCAST_AUDIO_EPISODE_TITLE
    );

    const modal = await openFullscreenMediaPlayerModal(page);
    await expect(modal.getByTestId('modal-video-target')).toHaveCount(0);
    await expect(modal.getByRole('img', { name: 'Media player image' })).toBeVisible();
    await expect(modal.getByRole('button', { name: PODCAST_AUDIO_EPISODE_TITLE })).toBeVisible();

    // The subtitle band reserves constant space even when there is no chapter/clip,
    // so autoplaying between items with and without chapters does not shift the layout.
    const reservedSubtitleHeight = await modal
      .locator('[class*="subtitleSection"]')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(reservedSubtitleHeight).toBeGreaterThan(0);

    // The square audio art fills the available height (no small cap) and the text hugs it
    // symmetrically, matching the video spacing.
    const audioMetrics = await modal
      .locator('[class*="mediaPlayerModalContent"]')
      .first()
      .evaluate((root) => {
        const title = root.querySelector('[class*="titleSection"]');
        const subtitle = root.querySelector('[class*="subtitleSection"]');
        const imageInner = root.querySelector('[class*="imageInner"]');
        if (!title || !subtitle || !imageInner) {
          return null;
        }
        const titleRect = title.getBoundingClientRect();
        const subtitleRect = subtitle.getBoundingClientRect();
        const imageRect = imageInner.getBoundingClientRect();
        return {
          imageWidth: imageRect.width,
          imageHeight: imageRect.height,
          gapAbove: imageRect.top - titleRect.bottom,
          gapBelow: subtitleRect.top - imageRect.bottom,
        };
      });
    expect(audioMetrics).not.toBeNull();
    if (audioMetrics !== null) {
      // Square wrapper.
      expect(Math.abs(audioMetrics.imageWidth - audioMetrics.imageHeight)).toBeLessThanOrEqual(2);
      // Fills substantial height instead of the old small cap.
      expect(audioMetrics.imageHeight).toBeGreaterThan(350);
      // Symmetric spacing above and below the artwork.
      expect(audioMetrics.gapAbove).toBeGreaterThanOrEqual(0);
      expect(audioMetrics.gapBelow).toBeGreaterThanOrEqual(0);
      expect(Math.abs(audioMetrics.gapAbove - audioMetrics.gapBelow)).toBeLessThanOrEqual(4);
    }

    await captureVerifiedElement(
      page,
      testInfo,
      modal.getByRole('img', { name: 'Media player image' }),
      'Audio playback still shows square artwork in the fullscreen media player modal.'
    );
  });

  test('keeps audio art square and text close in a tall narrow window', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(TALL_NARROW_VIEWPORT);
    await startEpisodePlayback(
      page,
      E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
      PODCAST_AUDIO_EPISODE_TITLE
    );

    const modal = await openFullscreenMediaPlayerModal(page);
    await expect(modal.getByRole('img', { name: 'Media player image' })).toBeVisible();

    // In a tall, narrow window the square is width-limited, so the wrapper must hug it and keep the
    // title/subtitle a consistent gap away instead of spreading them apart.
    const tallNarrowMetrics = await modal
      .locator('[class*="mediaPlayerModalContent"]')
      .first()
      .evaluate((root) => {
        const info = root.querySelector('[class*="info"]');
        const title = root.querySelector('[class*="titleSection"]');
        const subtitle = root.querySelector('[class*="subtitleSection"]');
        const imageInner = root.querySelector('[class*="imageInner"]');
        if (!info || !title || !subtitle || !imageInner) {
          return null;
        }
        const infoGap = Number.parseFloat(window.getComputedStyle(info).rowGap);
        const titleRect = title.getBoundingClientRect();
        const subtitleRect = subtitle.getBoundingClientRect();
        const imageRect = imageInner.getBoundingClientRect();
        return {
          infoGap,
          imageWidth: imageRect.width,
          imageHeight: imageRect.height,
          gapAbove: imageRect.top - titleRect.bottom,
          gapBelow: subtitleRect.top - imageRect.bottom,
        };
      });
    expect(tallNarrowMetrics).not.toBeNull();
    if (tallNarrowMetrics !== null) {
      // Still a square.
      expect(
        Math.abs(tallNarrowMetrics.imageWidth - tallNarrowMetrics.imageHeight)
      ).toBeLessThanOrEqual(2);
      // The gap above and below matches the configured 2xl row gap (no spread).
      expect(Math.abs(tallNarrowMetrics.gapAbove - tallNarrowMetrics.infoGap)).toBeLessThanOrEqual(
        4
      );
      expect(Math.abs(tallNarrowMetrics.gapBelow - tallNarrowMetrics.infoGap)).toBeLessThanOrEqual(
        4
      );
      expect(Math.abs(tallNarrowMetrics.gapAbove - tallNarrowMetrics.gapBelow)).toBeLessThanOrEqual(
        4
      );
    }

    await captureVerifiedElement(
      page,
      testInfo,
      modal.getByRole('img', { name: 'Media player image' }),
      'In a tall narrow window the audio art stays square with the text a consistent gap away.'
    );
  });
});
