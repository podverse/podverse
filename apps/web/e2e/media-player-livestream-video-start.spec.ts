import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  expectSingleSourcedMediaElement,
  liveStreamMediaContainer,
  liveStreamMediaElement,
  openLivestreamAndPlay,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_LIVE_AV_VIDEO_ITEM_ID_TEXT,
  E2E_LIVE_AV_VIDEO_ITEM_TITLE,
  E2E_VIDEO_SHORT_ENCLOSURE_URL,
} from './helpers/seedConstants';
import { captureVerifiedElement } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const DESKTOP_VIEWPORT = { width: 1200, height: 900 };

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

/**
 * Matrix cell (see `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md` § 6a
 * "Initial play, video live stream"): a live item whose selected enclosure is video must go through
 * the same labeled-enclosure selection as audio, initialize video.js, and render its `<video>`
 * inside `MediaPlayerLiveStreamVideoWrapper` → `MediaPlayerLivestreamVideoPortalFloating`.
 *
 * The seeded source is a progressive mp4 from the asset server, so this covers source selection,
 * controller selection, and portal placement. Live-edge behavior (`duration === Infinity`, manifest
 * reload, source fallback) needs a real HLS source and is not asserted here.
 */
test.describe('Media player live-stream video start', () => {
  test('Starting a live video stream initializes video.js and mounts the floating portal video wrapper', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginSeedUser(page);

    await openLivestreamAndPlay(page, E2E_LIVE_AV_VIDEO_ITEM_ID_TEXT, E2E_LIVE_AV_VIDEO_ITEM_TITLE);

    await test.step('video.js initializes a `<video>` in the live-stream video container pointed at the selected enclosure source', async () => {
      const liveVideo = liveStreamMediaElement(page, 'video');
      await expect(liveVideo).toHaveCount(1);
      await expect(liveVideo).toHaveAttribute('src', E2E_VIDEO_SHORT_ENCLOSURE_URL);
      // video.js replaces the tag's own classes with `vjs-tech` and moves `video-js` to a wrapper
      // div it creates, so `vjs-tech` only exists once the player has taken over the element.
      await expect(liveVideo).toHaveClass(/vjs-tech/);
    });

    await test.step('The live-stream audio container stays empty, so controller selection did not also mount the audio path', async () => {
      await expect(liveStreamMediaContainer(page, 'audio').locator('audio')).toHaveCount(0);
      await expectSingleSourcedMediaElement(page);
    });

    await test.step('The floating live-stream video portal is visible, so fullscreen and floating behavior matches non-live video', async () => {
      const portal = page.getByTestId('floating-video-portal-livestream');
      await expect(portal).toBeVisible();
      await expect(portal.locator('video')).toBeVisible();

      await captureVerifiedElement(
        page,
        testInfo,
        portal,
        'A live video stream renders inside the floating live-stream video portal.'
      );
    });
  });
});
