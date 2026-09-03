import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { waitForAudioReadyAtLeast } from './helpers/mediaPlayerAssertions';
import { E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT } from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function persistentPlayerPlayingButtons(page: Page) {
  return page.locator('aside#media-player button[data-media-player-playing="true"]');
}

async function expectPersistentPlayerPlaying(page: Page, playing: boolean): Promise<void> {
  const playingButtons = persistentPlayerPlayingButtons(page);
  if (playing) {
    await expect(playingButtons.first()).toBeVisible();
    return;
  }
  await expect(playingButtons).toHaveCount(0);
}

async function loadPlayingNonLiveEpisode(page: Page): Promise<void> {
  await loginSeedUser(page);
  await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}`);
  await expect(page.getByRole('heading', { name: 'E2E Podcast No Stored Position' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).first().click();
  await expectPersistentPlayerPlaying(page, true);
  await waitForAudioReadyAtLeast(page, 2);
}

async function expandPodcastsSidebarAccordion(page: Page): Promise<void> {
  const sidebar = page.locator('#sidebar');
  const podcastsLink = sidebar.locator('a[href="/podcasts"]');
  const podcastsSection = sidebar.locator('details').filter({
    has: page.locator('a[href="/podcasts"]'),
  });
  await podcastsSection.locator('summary').click();
  await expect(podcastsLink).toBeVisible();
}

async function navigateToPodcastsViaSidebar(page: Page): Promise<void> {
  await expandPodcastsSidebarAccordion(page);
  await page.locator('#sidebar a[href="/podcasts"]').click();
  await expect(page.getByRole('heading', { name: 'Podcasts' })).toBeVisible();
}

async function clickEmptyMainOuterWrapper(page: Page): Promise<void> {
  const mainOuter = page.locator('#mainOuterWrapper');
  await expect(mainOuter).toBeVisible();
  const box = await mainOuter.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  // Right-edge padding in the upper main column (away from sidebar links and footer chrome).
  await page.mouse.click(box.x + box.width - 6, box.y + Math.min(box.height * 0.35, 240));
  await expect
    .poll(async () => page.evaluate(() => document.activeElement?.id === 'mainOuterWrapper'))
    .toBe(true);
}

/**
 * Matrix cells (see `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § "Cross-cutting" — Space play/pause when media is loaded and focus is not on
 *     an interactive element that intercepts Space.
 *
 * Keyboard Space routes through `setMPIsPlaying` (same as PlayButton). Livestream Space E2E awaits
 * playable seeded live feeds (decision matrix § 6c).
 */
test.describe('Media player Space shortcut', () => {
  test.beforeEach(() => {
    test.setTimeout(20_000);
  });

  test('Pressing Space on a Podcast Index feed preview page remains stable when no media is loaded', async ({
    page,
  }, testInfo) => {
    await page.goto('/podcast-index/feed/2147483640');
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    await test.step('Space key does not break the page while the persistent player has no active source', async () => {
      await page.keyboard.press('Space');
      await expect(page.locator('body')).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Pressing Space on the feed preview page leaves the page stable with no active media.'
      );
    });
  });

  test('Pressing Space toggles play and pause when non-live audio is loaded and main content is focused', async ({
    page,
  }, testInfo) => {
    await test.step('Load seeded podcast episode into the persistent player', async () => {
      await loadPlayingNonLiveEpisode(page);
    });

    await test.step('Space pauses and resumes when main content has focus', async () => {
      await page.locator('#mainOuterWrapper').focus();
      await page.keyboard.press('Space');
      await expectPersistentPlayerPlaying(page, false);

      await page.keyboard.press('Space');
      await expectPersistentPlayerPlaying(page, true);

      await capturePageLoad(
        page,
        testInfo,
        'Space toggles play and pause on loaded non-live audio when main content is focused.'
      );
    });
  });

  test('Pressing Space toggles play and pause after clicking empty main content on /podcasts', async ({
    page,
  }, testInfo) => {
    await test.step('Load seeded podcast episode into the persistent player', async () => {
      await loadPlayingNonLiveEpisode(page);
    });

    await test.step('Click empty main area on /podcasts then Space toggles play', async () => {
      await navigateToPodcastsViaSidebar(page);
      await expectPersistentPlayerPlaying(page, true);
      await waitForAudioReadyAtLeast(page, 2);

      await actionAndCapture(
        page,
        testInfo,
        'Click empty padding inside #mainOuterWrapper on /podcasts.',
        async () => {
          await clickEmptyMainOuterWrapper(page);
        },
        page.locator('#mainOuterWrapper')
      );

      await page.keyboard.press('Space');
      await expectPersistentPlayerPlaying(page, false);

      await page.keyboard.press('Space');
      await expectPersistentPlayerPlaying(page, true);

      await capturePageLoad(
        page,
        testInfo,
        'Space toggles play and pause after clicking empty main content on /podcasts.',
        page.locator('#mainOuterWrapper')
      );
    });
  });

  test('Pressing Space does not toggle play when a sidebar Podcasts link is focused', async ({
    page,
  }, testInfo) => {
    await test.step('Load seeded podcast episode into the persistent player', async () => {
      await loadPlayingNonLiveEpisode(page);
    });

    await test.step('Space with sidebar link focused leaves play state unchanged', async () => {
      await navigateToPodcastsViaSidebar(page);
      await expectPersistentPlayerPlaying(page, true);

      const podcastsSidebarLink = page.locator('#sidebar a[href="/podcasts"]');
      await expect(podcastsSidebarLink).toBeVisible();
      await podcastsSidebarLink.focus();

      await page.keyboard.press('Space');
      await expectPersistentPlayerPlaying(page, true);

      await capturePageLoad(
        page,
        testInfo,
        'Space does not toggle play when the sidebar Podcasts link has focus.',
        podcastsSidebarLink
      );
    });
  });
});
