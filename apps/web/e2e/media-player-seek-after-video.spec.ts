import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { waitForAudioReadyAtLeast } from './helpers/mediaPlayerAssertions';
import {
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
  E2E_MUSIC_TRACK_DURATION_SECONDS,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
} from './helpers/seedConstants';

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

function audioLocator(page: Page): Locator {
  return page.locator('audio').first();
}

function floatingVideoPortalLocator(page: Page): Locator {
  return page.getByTestId('floating-video-portal');
}

/**
 * The progress bar renders in the desktop, mobile, and modal control layouts at once; only the
 * layout for the active viewport is visible. The progress slider is distinguished from the volume
 * slider (which shares `role="slider"`) by its `aria-valuetext` of the form `"<time> of <time>"`.
 */
function visibleProgressBarLocator(page: Page): Locator {
  return page.locator('aside#media-player [role="slider"][aria-valuetext*=" of "]:visible').first();
}

async function readAudioCurrentTime(page: Page): Promise<number> {
  return audioLocator(page).evaluate((el) => {
    if (!(el instanceof HTMLAudioElement)) {
      return Number.NaN;
    }
    return el.currentTime;
  });
}

async function startVideoEpisodePlayback(page: Page): Promise<void> {
  await page.goto(`/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}`);
  await expect(page.getByRole('heading', { name: EMBED_SAMPLE_EPISODE_VIDEO_TITLE })).toBeVisible();
  // The seeded user has a restored "now playing" item that loads asynchronously into the player
  // bar; wait for that to settle before starting playback so it does not clobber our item.
  await expect(page.locator('#media-player').getByRole('button').first()).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).first().click();
  // The floating video portal mounting confirms the video orchestrator (a second controls-bridge
  // registrant) is now in the tree.
  await expect(floatingVideoPortalLocator(page)).toBeVisible();
}

async function startMusicTrackPlayback(page: Page): Promise<void> {
  await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
  await expect(page.getByRole('heading', { name: 'E2E Music Track One' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).first().click();
  // Switching to audio unmounts the video orchestrator (the regression trigger): its cleanup must
  // not strand the controls on the no-op bridge.
  await expect(floatingVideoPortalLocator(page)).toHaveCount(0);
  await expect(audioLocator(page)).toHaveCount(1);
  await waitForAudioReadyAtLeast(page, 1);
}

/**
 * Regression for the single-slot controls-bridge registry: after a video element unmounted, the
 * audio orchestrator was left unregistered, so `useMediaPlayerControls().seek` fell back to the
 * frozen no-op bridge. The progress bar UI still moved (via `setMPCurrentTime`) but the playing
 * element's `currentTime` never changed. See
 * `apps/web/src/contexts/MediaPlayerControls.tsx`.
 */
test.describe('Media player seek after video unmount', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginSeedUser(page);
  });

  test('Clicking the progress bar still seeks the audio element after a video has played and unmounted', async ({
    page,
  }) => {
    await startVideoEpisodePlayback(page);
    await startMusicTrackPlayback(page);

    // Pause so the playhead does not drift while we measure the seek, then confirm we start near 0
    // (explicit Play on a music track seeks to 0).
    await audioLocator(page).evaluate((el) => {
      if (el instanceof HTMLAudioElement) {
        el.pause();
      }
    });
    await expect.poll(async () => readAudioCurrentTime(page)).toBeLessThan(3);

    // Click the middle of the progress bar — the user's exact action. This routes through
    // `useMediaPlayerControls().seek`, which must reach the live audio element.
    const progressBar = visibleProgressBarLocator(page);
    await expect(progressBar).toBeVisible();
    const box = await progressBar.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      throw new Error('Expected the progress bar to have a bounding box.');
    }
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);

    // The element's currentTime must actually jump to roughly the clicked position (~50% of the
    // 30s track). With the regression, it stayed near 0 while only the UI moved.
    const expectedSeconds = E2E_MUSIC_TRACK_DURATION_SECONDS * 0.5;
    await expect.poll(async () => readAudioCurrentTime(page)).toBeGreaterThan(expectedSeconds - 5);
    await expect.poll(async () => readAudioCurrentTime(page)).toBeLessThan(expectedSeconds + 5);
  });
});
