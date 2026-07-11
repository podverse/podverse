import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  expectMediaPlayerTitleVisible,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_CHAPTER_ONE_END_SECONDS,
  E2E_CHAPTER_ONE_START_SECONDS,
  E2E_CHAPTER_TWO_START_SECONDS,
  E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
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

async function fastForwardAudioTo(page: Page, seconds: number): Promise<void> {
  await audioLocator(page).evaluate((el, nextTime) => {
    if (!(el instanceof HTMLAudioElement)) {
      throw new Error('Expected first media element to be an audio element.');
    }
    el.currentTime = nextTime;
    el.dispatchEvent(new Event('timeupdate'));
  }, seconds);
}

async function openChapteredEpisode(page: Page): Promise<void> {
  await page.goto(`/episode/${E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT}`);
  await expect(page.getByRole('heading', { name: 'E2E Podcast With Chapters' })).toBeVisible();
  // `clearSeededPodcastQueueResources` (beforeEach) removes any now-playing row
  // left by earlier specs (e.g. media-player-alt-enclosure-load's embed-video
  // episodes), so QueueController's auto-load must not mount the video player.
  await expect(page.getByTestId('floating-video-portal')).toHaveCount(0);
}

async function openChaptersTab(page: Page): Promise<void> {
  await page.getByText('Chapters', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Intro' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Topic A' })).toBeVisible();
}

/**
 * Matrix cell (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 1 "Initial load" — chapter seek → `start_time` on `loadedmetadata`
 *     when `mpItemChapter` is set with `mpItemChapterShouldSeek = true`.
 *   - § 6 "time-update" — `mpItemChapter` updates as `currentTime` walks
 *     into the next chapter (handled separately in
 *     `NonLiveMediaOrchestrator.timeUpdate.test.tsx`).
 *
 * The pure-function coverage for the selection helper lives at
 * `selectItemChapterForTime.test.ts`; the existing foundation harness
 * covers overlay resolution, but not the real episode-page chapter click.
 */
test.describe('Media player chapter seek', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await loginSeedUser(page);
    /**
     * Clear the seeded podcast queue resources so the QueueController's
     * auto-load effect does not race with this spec's chapter Play
     * click. See
     * `.llm/history/active/e2e-media-player-failures-debug/01-diagnostic-clip-test-1.md`.
     */
    await clearSeededPodcastQueueResources(page);
  });

  test('Clicking a chapter row on an episode page seeks the player to chapter.start_time on next loadedmetadata', async ({
    page,
  }) => {
    await openChapteredEpisode(page);
    await openChaptersTab(page);

    /**
     * Anchor from the specific `Topic A` chapter heading to its containing
     * chapter row, then click the Play button inside that row. The previous
     * `locator('div').filter(...)` form was strict-mode ambiguous because
     * nested `<div>` ancestors of the heading also contain a Play button,
     * and Playwright would resolve to multiple matches in full-suite order
     * after the media player aside mounts.
     */
    const topicRowPlayButton = page
      .getByRole('heading', { name: 'Topic A' })
      .locator("xpath=ancestor::div[.//button[@aria-label='Play']][1]")
      .getByRole('button', { name: 'Play' });
    await topicRowPlayButton.click();

    await expectAudioCurrentTimeNear(page, E2E_CHAPTER_TWO_START_SECONDS);
    await expectMediaPlayerTitleVisible(page, 'Topic A');
  });

  test('Playing past a chapter end_time updates mpItemChapter to the next overlapping chapter', async ({
    page,
  }) => {
    await openChapteredEpisode(page);

    /**
     * Scope the Play click to the page `<main>` content (rendered by
     * `MainPageScaffold`) so that we never accidentally click the media
     * player aside's Play button if a previous spec left the player
     * mounted with audio loaded.
     */
    await page.locator('main').getByRole('button', { name: 'Play' }).first().click();
    await expectAudioCurrentTimeNear(page, E2E_CHAPTER_ONE_START_SECONDS);
    await expectMediaPlayerTitleVisible(page, 'Intro');

    await fastForwardAudioTo(page, E2E_CHAPTER_ONE_END_SECONDS + 0.5);

    await expectMediaPlayerTitleVisible(page, 'Topic A');
  });
});
