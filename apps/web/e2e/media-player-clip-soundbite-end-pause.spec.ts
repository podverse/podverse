import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  expectMediaPlayerTitleAbsent,
  expectMediaPlayerTitleVisible,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_CLIP_END_SECONDS,
  E2E_CLIP_ID_TEXT,
  E2E_CLIP_START_SECONDS,
  E2E_PODCAST_SHORT_ENCLOSURE_URL,
  E2E_SOUNDBITE_DURATION_SECONDS,
  E2E_SOUNDBITE_ID_TEXT,
  E2E_SOUNDBITE_START_SECONDS,
} from './helpers/seedConstants';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function audioLocator(page: Page): Locator {
  return page.locator('audio').first();
}

async function expectAudioCurrentTimeNear(page: Page, expectedSeconds: number): Promise<void> {
  const audio = audioLocator(page);
  await expect(audio).toHaveCount(1);
  await waitForAudioReadyAtLeast(page, 1);
  await expect
    .poll(async () => {
      const currentTime = await audio.evaluate((el) => {
        if (!(el instanceof HTMLAudioElement)) {
          return Number.NaN;
        }
        return el.currentTime;
      });
      return currentTime >= expectedSeconds - 0.25 && currentTime <= expectedSeconds + 2;
    })
    .toBe(true);
}

/**
 * Wait until the hidden `<audio>` element's `src` reflects the expected
 * enclosure URL. Both the clip and the soundbite play the parent item's
 * default enclosure (`enclosureSelectedParams: 'use-active-item-or-default'`),
 * which is the chaptered item enclosure used by this fixture. Asserting
 * `src` first avoids stale-media false positives when the player was
 * already mounted with prior audio in full-suite order.
 */
async function expectAudioSrcMatches(page: Page, enclosureUrl: string): Promise<void> {
  const audio = audioLocator(page);
  await expect(audio).toHaveAttribute('src', enclosureUrl, { timeout: 15000 });
}

async function expectAudioPaused(page: Page): Promise<void> {
  const audio = audioLocator(page);
  await expect
    .poll(async () => {
      return audio.evaluate((el) => {
        if (!(el instanceof HTMLAudioElement)) {
          return false;
        }
        return el.paused;
      });
    })
    .toBe(true);
}

async function fastForwardAudioTo(page: Page, seconds: number): Promise<void> {
  await audioLocator(page).evaluate((el, nextTime) => {
    if (!(el instanceof HTMLAudioElement)) {
      throw new Error('Expected first media element to be an audio element.');
    }
    el.currentTime = nextTime;
    el.dispatchEvent(new Event('timeupdate'));
  }, seconds);
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 1 "Initial load" — clip seeks to `start_time`; soundbite seeks to
 *     `start_time`.
 *   - § 6 "time-update side effects" — clip pauses at `end_time + 1`;
 *     soundbite pauses at `start_time + duration + 1`.
 *
 * Pure-function and orchestration coverage exists at
 *   - `apps/web/src/components/MediaPlayer/Controller/__tests__/MediaPlayerControllerAV.timeUpdate.test.tsx`
 *   - `apps/web/src/components/MediaPlayer/Controller/__tests__/MediaPlayerControllerAV.seekPolicy.test.tsx`
 */
test.describe('Media player time-bounded playback (clip and soundbite)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await loginSeedUser(page);
    /**
     * Clear the seeded podcast queue resources so the QueueController's
     * auto-load effect (which treats the first upcoming resource like a
     * now-playing item when no resource is at the now-playing position)
     * does not race with this spec's user-initiated Play click and
     * clobber `mpClip` / `mpItem` with `e2ePodResume01`. See
     * `.llm/history/active/e2e-media-player-failures-debug/01-diagnostic-clip-test-1.md`.
     */
    await clearSeededPodcastQueueResources(page);
  });

  test('Loading a clip from the clips list page seeks the player to clip.start_time on loadedmetadata', async ({
    page,
  }) => {
    await page.goto(`/clip/${E2E_CLIP_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Clip End Pause' })).toBeVisible();

    /**
     * Scope the Play click to the page `<main>` content (rendered by
     * `MainPageScaffold`). The global `.first()` Play button matched the
     * media-player aside's Play/Pause in full-suite order whenever the
     * player was already mounted from a prior spec.
     */
    await page.locator('main').getByRole('button', { name: 'Play' }).first().click();

    await expectAudioSrcMatches(page, E2E_PODCAST_SHORT_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, E2E_CLIP_START_SECONDS);
    await expectMediaPlayerTitleVisible(page, 'E2E Clip End Pause');
  });

  test('Playing a clip past clip.end_time + 1 second clears mpClip and pauses the player', async ({
    page,
  }) => {
    await page.goto(`/clip/${E2E_CLIP_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Clip End Pause' })).toBeVisible();

    await page.locator('main').getByRole('button', { name: 'Play' }).first().click();
    await expectAudioSrcMatches(page, E2E_PODCAST_SHORT_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, E2E_CLIP_START_SECONDS);

    await fastForwardAudioTo(page, E2E_CLIP_END_SECONDS + 1);

    await expectAudioPaused(page);
    await expectMediaPlayerTitleAbsent(page, 'E2E Clip End Pause');
  });

  test('Loading a soundbite from an item detail page seeks the player to soundbite.start_time on loadedmetadata', async ({
    page,
  }) => {
    await page.goto(`/official-clip/${E2E_SOUNDBITE_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Soundbite End Pause' })).toBeVisible();

    await page.locator('main').getByRole('button', { name: 'Play' }).first().click();

    await expectAudioSrcMatches(page, E2E_PODCAST_SHORT_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, E2E_SOUNDBITE_START_SECONDS);
    await expectMediaPlayerTitleVisible(page, 'E2E Soundbite End Pause');
  });

  test('Playing a soundbite past start_time + duration + 1 second clears mpItemSoundbite and pauses', async ({
    page,
  }) => {
    await page.goto(`/official-clip/${E2E_SOUNDBITE_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Soundbite End Pause' })).toBeVisible();

    await page.locator('main').getByRole('button', { name: 'Play' }).first().click();
    await expectAudioSrcMatches(page, E2E_PODCAST_SHORT_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, E2E_SOUNDBITE_START_SECONDS);

    await fastForwardAudioTo(
      page,
      E2E_SOUNDBITE_START_SECONDS + E2E_SOUNDBITE_DURATION_SECONDS + 1.1
    );

    await expectAudioPaused(page);
    await expectMediaPlayerTitleAbsent(page, 'E2E Soundbite End Pause');
  });
});
