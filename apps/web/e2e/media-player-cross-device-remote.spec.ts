import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { MEDIA_JUMP_BACK_SECONDS, MEDIA_JUMP_FORWARD_SECONDS } from '@podverse/helpers';

import {
  allowAutoplay,
  audioState,
  closeSignedInDevices,
  CROSS_DEVICE_MOBILE_VIEWPORT,
  openSignedInDevice,
  playerButton,
  playerDeviceCaption,
  playerDevicesButton,
  playerRemoteLiveLabel,
  playerRemoteProgress,
  playerSegmentStripTitle,
} from './helpers/crossDevicePlayback';
import {
  clearSeededPodcastQueueResources,
  clickDetailPagePlayButton,
  expectMediaPlayerTitleVisible,
  expectPersistentPlayerPlaying,
  openEpisodeAndPlay,
  openLivestreamAndPlay,
  openTrackAndPlay,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_CHAPTER_TWO_START_SECONDS,
  E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
  E2E_LIVE_AV_AUDIO_ITEM_TITLE,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const EPISODE_TITLE = 'E2E Podcast No Stored Position';
const CHAPTERED_EPISODE_TITLE = 'E2E Podcast With Chapters';
const TRACK_ONE_TITLE = 'E2E Music Track One';
const TRACK_TWO_TITLE = 'E2E Music Track Two';
const HOME_URL_PATTERN = /\/(?:\?.*)?$/;
const JUMP_BACK_LABEL = `Jump Back ${MEDIA_JUMP_BACK_SECONDS} Seconds`;
const JUMP_FORWARD_LABEL = `Jump Forward ${MEDIA_JUMP_FORWARD_SECONDS} Seconds`;

test.use({
  launchOptions: {
    args: ['--autoplay-policy=no-user-gesture-required'],
  },
});

const expectHomeLoaded = async (page: Page): Promise<void> => {
  await expect(page).toHaveURL(HOME_URL_PATTERN);
  await expect(page.locator('main')).toBeVisible();
};

const expectEpisodeLoaded = async (
  page: Page,
  itemIdText: string,
  heading: string
): Promise<void> => {
  await expect(page).toHaveURL(new RegExp(`/episode/${itemIdText}(?:\\?.*)?$`));
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
};

const expectTrackLoaded = async (
  page: Page,
  itemIdText: string,
  heading: string
): Promise<void> => {
  await expect(page).toHaveURL(new RegExp(`/track/${itemIdText}(?:\\?.*)?$`));
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
};

const expectAudioPaused = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      const state = await audioState(page);
      return state?.paused ?? null;
    })
    .toBe(true);
};

const expectAudioPlaying = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      const state = await audioState(page);
      return state?.paused ?? null;
    })
    .toBe(false);
};

const expectAudioNotPlaying = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      const state = await audioState(page);
      if (state === null) {
        return 'absent';
      }
      return state.paused ? 'paused' : 'playing';
    })
    .not.toBe('playing');
};

const visiblePlayerButton = (page: Page, name: string) =>
  page.locator(`aside#media-player button[aria-label="${name}"]:visible`);

test.describe('Media player across two signed-in browsers', () => {
  test('When a browser is not playing, it shows the active browser item and its controls drive that browser playback.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);

      await test.step('When browser A opens the seeded episode and presses Play, the persistent player starts locally.', async () => {
        await openEpisodeAndPlay(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
        await expectEpisodeLoaded(
          deviceA.page,
          E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
          EPISODE_TITLE
        );
        await expectPersistentPlayerPlaying(deviceA.page, true);
        await expect(playerButton(deviceA.page, 'More Options')).toBeVisible();
        await expect(visiblePlayerButton(deviceA.page, 'Share')).toHaveCount(0);
        await expect(playerDevicesButton(deviceA.page)).toHaveCount(0);
      });

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);

      await test.step('When browser B opens Home, it shows remote playback state from browser A.', async () => {
        await deviceB.page.goto('/');
        await expectHomeLoaded(deviceB.page);
        await expectMediaPlayerTitleVisible(deviceB.page, EPISODE_TITLE, { timeout: 20_000 });
        await expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on');
        await expect(playerRemoteProgress(deviceB.page)).toBeVisible();
        await expect(playerDevicesButton(deviceA.page)).toBeVisible();
        await expect(playerDevicesButton(deviceB.page)).toBeVisible();
        await capturePageLoad(
          deviceB.page,
          testInfo,
          'Browser B shows remote episode playback from browser A.',
          playerDeviceCaption(deviceB.page)
        );
      });

      await test.step('When browser B stays open on Home, the remote progress bar advances.', async () => {
        const firstValueRaw = await playerRemoteProgress(deviceB.page).getAttribute(
          'aria-valuenow'
        );
        const firstValue = Number(firstValueRaw ?? '0');
        await expect
          .poll(
            async () => {
              const valueRaw = await playerRemoteProgress(deviceB.page).getAttribute(
                'aria-valuenow'
              );
              return Number(valueRaw ?? '0');
            },
            { timeout: 20_000 }
          )
          .toBeGreaterThan(firstValue);
      });

      await test.step('When browser B is remote, it shows skip track controls and hides local mute controls.', async () => {
        await expect(playerButton(deviceB.page, 'Skip to Previous')).toBeVisible();
        await expect(playerButton(deviceB.page, 'Skip to Next')).toBeVisible();
        await expect(visiblePlayerButton(deviceB.page, 'Mute')).toHaveCount(0);
      });

      await test.step('When browser B presses Pause and Play, browser A pauses and resumes playback.', async () => {
        await playerButton(deviceB.page, 'Pause').click();
        await expectPersistentPlayerPlaying(deviceA.page, false);
        await expectAudioPaused(deviceA.page);
        await expect(playerButton(deviceB.page, 'Play')).toBeVisible();
        await expect(playerDeviceCaption(deviceB.page)).toContainText('Paused on');

        await playerButton(deviceB.page, 'Play').click();
        await expectPersistentPlayerPlaying(deviceA.page, true);
        await expectAudioPlaying(deviceA.page);
        await expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on');
      });

      await test.step('When browser B sends jump and seek commands, browser A updates its position.', async () => {
        const beforeJump = await audioState(deviceA.page);
        if (beforeJump === null) {
          throw new Error('Expected browser A to have an audio element before jump-forward.');
        }
        await playerButton(deviceB.page, JUMP_FORWARD_LABEL).click();
        await expect
          .poll(
            async () => {
              const state = await audioState(deviceA.page);
              return state?.currentTime ?? -1;
            },
            { timeout: 20_000 }
          )
          .toBeGreaterThanOrEqual(beforeJump.currentTime + 25);

        const progressBar = playerRemoteProgress(deviceB.page);
        const progressBox = await progressBar.boundingBox();
        expect(progressBox).not.toBeNull();
        if (progressBox === null) {
          throw new Error('Expected remote progress bar to have a bounding box.');
        }
        await progressBar.click({
          position: { x: progressBox.width * 0.25, y: progressBox.height / 2 },
        });
        await expect
          .poll(
            async () => {
              const state = await audioState(deviceA.page);
              if (state === null) {
                return false;
              }
              return state.currentTime >= 12 && state.currentTime <= 20;
            },
            { timeout: 20_000 }
          )
          .toBe(true);
      });

      await test.step('When browser B changes playback speed from player settings, browser A applies that speed.', async () => {
        await playerButton(deviceB.page, 'More Options').click();
        const speedItem = deviceB.page.getByRole('menuitem', { name: /^Playback Speed:/ });
        await expect(speedItem).toBeVisible();
        await speedItem.click();
        await expect
          .poll(
            async () => {
              const state = await audioState(deviceA.page);
              return state?.playbackRate ?? 1;
            },
            { timeout: 20_000 }
          )
          .toBeGreaterThan(1);
      });
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When a user chooses another device from playback devices, playback moves there and This Device can move it back.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openEpisodeAndPlay(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectEpisodeLoaded(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);
      await expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on');

      await test.step('When browser A opens the playback-device menu, it shows This Device as checked and playing.', async () => {
        await playerDevicesButton(deviceA.page).click();
        const menuItems = deviceA.page.getByRole('menuitemradio');
        await expect(menuItems).toHaveCount(2);
        await expect(menuItems.first()).toContainText('This Device');
        await expect(menuItems.first()).toContainText('Playing');
        await expect(menuItems.first()).toHaveAttribute('aria-checked', 'true');
        await expect(menuItems.nth(1)).toHaveAttribute('aria-checked', 'false');
        await captureVerifiedElement(
          deviceA.page,
          testInfo,
          menuItems.first(),
          'Browser A shows This Device as the checked active playback device.'
        );
      });

      await test.step('When browser A chooses browser B from the menu, browser B starts playback and browser A stops playing audio.', async () => {
        await deviceA.page.getByRole('menuitemradio').nth(1).click();
        await expectPersistentPlayerPlaying(deviceB.page, true);
        await expectAudioPlaying(deviceB.page);
        await expectAudioNotPlaying(deviceA.page);
        await expect(playerDeviceCaption(deviceA.page)).toContainText('Playing on');
      });

      await test.step('When browser B is active, its menu marks This Device as checked.', async () => {
        await playerDevicesButton(deviceB.page).click();
        const menuItems = deviceB.page.getByRole('menuitemradio');
        await expect(menuItems).toHaveCount(2);
        await expect(menuItems.first()).toContainText('This Device');
        await expect(menuItems.first()).toHaveAttribute('aria-checked', 'true');
      });

      await test.step('When browser A chooses This Device from its menu, playback returns to browser A.', async () => {
        await playerDevicesButton(deviceA.page).click();
        await deviceA.page.getByRole('menuitemradio').first().click();
        await expectPersistentPlayerPlaying(deviceA.page, true);
        await expectAudioPlaying(deviceA.page);
        await expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on');
      });
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When one browser opens another tab in the same context, it shows Playing in Another Tab and can take playback in that browser.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openEpisodeAndPlay(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectPersistentPlayerPlaying(deviceA.page, true);

      const pageA2 = await deviceA.context.newPage();
      await pageA2.goto('/');
      await expectHomeLoaded(pageA2);
      await expect(playerDeviceCaption(pageA2)).toContainText('Playing in Another Tab');
      await expect(playerDevicesButton(pageA2)).toHaveCount(0);
      await capturePageLoad(
        pageA2,
        testInfo,
        'Another tab in the same browser shows Playing in Another Tab without a devices button.',
        playerDeviceCaption(pageA2)
      );

      await test.step('When the second tab presses Pause and Play, the first tab audio pauses and resumes.', async () => {
        await playerButton(pageA2, 'Pause').click();
        await expectPersistentPlayerPlaying(deviceA.page, false);
        await expectAudioPaused(deviceA.page);
        await playerButton(pageA2, 'Play').click();
        await expectPersistentPlayerPlaying(deviceA.page, true);
        await expectAudioPlaying(deviceA.page);
      });

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);
      await expectMediaPlayerTitleVisible(deviceB.page, EPISODE_TITLE, { timeout: 20_000 });

      await test.step('When another device joins, selecting This Device from the second tab takes playback there.', async () => {
        await playerDevicesButton(pageA2).click();
        const firstMenuItem = pageA2.getByRole('menuitemradio').first();
        await expect(firstMenuItem).toContainText('This Device');
        await expect(firstMenuItem).toContainText('Playing in Another Tab');
        await firstMenuItem.click();
        await expectPersistentPlayerPlaying(pageA2, true);
        await expectAudioPlaying(pageA2);
        await expectAudioNotPlaying(deviceA.page);
      });
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When a browser comes back after its audio tab paused a livestream and left, a new page plays an episode in that browser.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);

      await test.step('When browser A plays the seeded livestream and then pauses it, browser A stops playing.', async () => {
        await openLivestreamAndPlay(
          deviceA.page,
          E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
          E2E_LIVE_AV_AUDIO_ITEM_TITLE
        );
        await expectPersistentPlayerPlaying(deviceA.page, true);
        await playerButton(deviceA.page, 'Pause').click();
        await expectPersistentPlayerPlaying(deviceA.page, false);
        await expectAudioPaused(deviceA.page);
      });

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);

      await test.step('When browser A loads a new page, its player is local and does not say Playing in Another Tab.', async () => {
        await deviceA.page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}`);
        await expectEpisodeLoaded(
          deviceA.page,
          E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
          EPISODE_TITLE
        );
        await expect(playerDevicesButton(deviceA.page)).toBeVisible({ timeout: 20_000 });
        await expect(playerDeviceCaption(deviceA.page)).toHaveCount(0);
        await capturePageLoad(
          deviceA.page,
          testInfo,
          'After coming back, browser A shows its own player with no Playing in Another Tab caption.',
          deviceA.page.locator('aside#media-player')
        );
      });

      await test.step('When browser A presses Play on the episode page, the episode plays in browser A and browser B shows it playing there.', async () => {
        await clickDetailPagePlayButton(deviceA.page);
        await expectPersistentPlayerPlaying(deviceA.page, true);
        await expectAudioPlaying(deviceA.page);
        await expectMediaPlayerTitleVisible(deviceA.page, EPISODE_TITLE);
        await expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on');
      });
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When transfer targets a browser that blocks autoplay, the receiver shows Ready to Play Here and the sender shows the blocked-start notice.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openEpisodeAndPlay(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectPersistentPlayerPlaying(deviceA.page, true);

      const deviceB = await openSignedInDevice(browser, { blockAutoplay: true });
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);
      await expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on');

      await test.step('When browser A transfers playback to blocked browser B, browser B shows the tap-to-play dialog and browser A shows the blocked toast.', async () => {
        await playerDevicesButton(deviceA.page).click();
        await deviceA.page.getByRole('menuitemradio').nth(1).click();
        const readyDialog = deviceB.page.getByRole('dialog', { name: 'Ready to Play Here' });
        await expect(readyDialog).toBeVisible({ timeout: 20_000 });
        await expect(deviceA.page.getByText('needs a tap first')).toBeVisible({ timeout: 20_000 });
        await captureVerifiedElement(
          deviceB.page,
          testInfo,
          readyDialog,
          'The receiving browser asks for a tap before it can start audio.'
        );
      });

      await test.step('When browser B allows autoplay and presses Play Here, browser B starts playing and browser A becomes remote.', async () => {
        await allowAutoplay(deviceB.page);
        await deviceB.page.getByRole('button', { name: 'Play Here', exact: true }).click();
        await expectPersistentPlayerPlaying(deviceB.page, true);
        await expectAudioPlaying(deviceB.page);
        await expect(playerDeviceCaption(deviceA.page)).toContainText('Playing on');
      });
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When the active item is a livestream, the remote browser shows Live plus play and pause without seek controls.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openLivestreamAndPlay(
        deviceA.page,
        E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
        E2E_LIVE_AV_AUDIO_ITEM_TITLE
      );
      await expect(deviceA.page).toHaveURL(
        new RegExp(`/podcast/livestream/${E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT}(?:\\?.*)?$`)
      );
      await expectPersistentPlayerPlaying(deviceA.page, true);

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);
      await expectMediaPlayerTitleVisible(deviceB.page, E2E_LIVE_AV_AUDIO_ITEM_TITLE, {
        timeout: 20_000,
      });
      await expect(playerRemoteLiveLabel(deviceB.page)).toBeVisible();
      await expect(playerRemoteProgress(deviceB.page)).toHaveCount(0);
      await expect(visiblePlayerButton(deviceB.page, JUMP_FORWARD_LABEL)).toHaveCount(0);
      await expect(visiblePlayerButton(deviceB.page, JUMP_BACK_LABEL)).toHaveCount(0);
      await expect(visiblePlayerButton(deviceB.page, 'Player Settings')).toHaveCount(0);
      await playerButton(deviceB.page, 'More Options').click();
      await expect(deviceB.page.getByRole('menuitem', { name: /^Playback Speed:/ })).toHaveCount(0);
      await expect(
        deviceB.page.getByRole('menuitem', { name: 'Share', exact: true })
      ).toBeVisible();
      await deviceB.page.keyboard.press('Escape');
      await capturePageLoad(
        deviceB.page,
        testInfo,
        'The remote livestream view shows the Live label with no seek controls.',
        playerRemoteLiveLabel(deviceB.page)
      );

      await playerButton(deviceB.page, 'Pause').click();
      await expectPersistentPlayerPlaying(deviceA.page, false);
      await expectAudioPaused(deviceA.page);
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When another browser opens the same episode detail page, its main Play button reflects remote state and can pause the active browser.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openEpisodeAndPlay(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectEpisodeLoaded(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectPersistentPlayerPlaying(deviceA.page, true);

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);
      await deviceB.page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}`);
      await expectEpisodeLoaded(deviceB.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      const detailPauseButton = deviceB.page
        .locator('main')
        .getByRole('button', { name: 'Pause', exact: true })
        .first();
      await expect(detailPauseButton).toBeVisible();
      await captureVerifiedElement(
        deviceB.page,
        testInfo,
        detailPauseButton,
        'The episode detail page shows Pause while another browser is actively playing.'
      );

      await detailPauseButton.click();
      await expectPersistentPlayerPlaying(deviceA.page, false);
      await expectAudioPaused(deviceA.page);
      await expect(
        deviceB.page.locator('main').getByRole('button', { name: 'Play', exact: true }).first()
      ).toBeVisible();
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When the active browser closes, the remaining browser returns to local paused state after presence expires.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openEpisodeAndPlay(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectPersistentPlayerPlaying(deviceA.page, true);

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);
      await expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on');

      await deviceA.context.close();
      const deviceAIndex = devicesToClose.findIndex((device) => device === deviceA);
      if (deviceAIndex >= 0) {
        devicesToClose.splice(deviceAIndex, 1);
      }

      await expect(playerDeviceCaption(deviceB.page)).toHaveCount(0, { timeout: 45_000 });
      await expect(playerDevicesButton(deviceB.page)).toHaveCount(0, { timeout: 45_000 });
      await expectMediaPlayerTitleVisible(deviceB.page, EPISODE_TITLE, { timeout: 45_000 });
      await expectPersistentPlayerPlaying(deviceB.page, false);
      await capturePageLoad(
        deviceB.page,
        testInfo,
        'After the active browser closes, the remaining browser returns to a paused local view.',
        deviceB.page.locator('aside#media-player')
      );
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When the active browser advances chapters, the remote browser updates the segment strip and chapter-row playback state.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openEpisodeAndPlay(
        deviceA.page,
        E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
        CHAPTERED_EPISODE_TITLE
      );
      await expectEpisodeLoaded(
        deviceA.page,
        E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
        CHAPTERED_EPISODE_TITLE
      );
      await expectPersistentPlayerPlaying(deviceA.page, true);

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);
      await expectMediaPlayerTitleVisible(deviceB.page, CHAPTERED_EPISODE_TITLE, {
        timeout: 20_000,
      });
      await expect
        .poll(async () => (await playerSegmentStripTitle(deviceB.page).textContent()) ?? '', {
          timeout: 20_000,
        })
        .toContain('Intro');

      await playerButton(deviceB.page, 'Skip to Next').click();
      await expect
        .poll(
          async () => {
            const state = await audioState(deviceA.page);
            return state?.currentTime ?? -1;
          },
          { timeout: 20_000 }
        )
        .toBeGreaterThanOrEqual(E2E_CHAPTER_TWO_START_SECONDS);
      await expect(playerSegmentStripTitle(deviceB.page)).toContainText('Topic A');
      await capturePageLoad(
        deviceB.page,
        testInfo,
        'The remote segment strip updates to Topic A after Skip to Next.',
        playerSegmentStripTitle(deviceB.page)
      );

      await deviceB.page.goto(`/episode/${E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT}`);
      await expectEpisodeLoaded(
        deviceB.page,
        E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
        CHAPTERED_EPISODE_TITLE
      );
      await deviceB.page.getByText('Chapters', { exact: true }).click();
      const introHeading = deviceB.page.getByRole('heading', { name: 'Intro', exact: true });
      const topicHeading = deviceB.page.getByRole('heading', { name: 'Topic A', exact: true });
      await expect(introHeading).toBeVisible();
      await expect(topicHeading).toBeVisible();
      await expect(topicHeading).toHaveClass(/highlighted-text/);
      await expect(introHeading).not.toHaveClass(/highlighted-text/);
      const topicRowPauseButton = topicHeading
        .locator("xpath=ancestor::div[.//button[@aria-label='Pause' or @aria-label='Play']][1]")
        .getByRole('button', { name: 'Pause', exact: true });
      await expect(topicRowPauseButton).toBeVisible();
      await topicRowPauseButton.click();
      await expectPersistentPlayerPlaying(deviceA.page, false);
      await expectAudioPaused(deviceA.page);
      await expect(
        topicHeading
          .locator("xpath=ancestor::div[.//button[@aria-label='Pause' or @aria-label='Play']][1]")
          .getByRole('button', { name: 'Play', exact: true })
      ).toBeVisible();
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When another browser is remote, Add to Playlist, Share, and the title link stay available in the player.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openEpisodeAndPlay(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectPersistentPlayerPlaying(deviceA.page, true);

      const deviceB = await openSignedInDevice(browser);
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);
      await expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on');

      await playerButton(deviceB.page, 'Add to Playlist').click();
      const addDialog = deviceB.page.getByRole('dialog', { name: 'Add to Playlist' });
      await expect(addDialog).toBeVisible();
      await deviceB.page.keyboard.press('Escape');
      await expect(addDialog).toHaveCount(0);

      await playerButton(deviceB.page, 'More Options').click();
      await deviceB.page.getByRole('menuitem', { name: 'Share', exact: true }).click();
      const shareDialog = deviceB.page.getByRole('dialog', { name: 'Share' });
      await expect(shareDialog).toBeVisible();
      await deviceB.page.keyboard.press('Escape');
      await expect(shareDialog).toHaveCount(0);

      await deviceB.page.locator('#media-player').getByRole('button').first().click();
      const fullscreenDialog = deviceB.page.getByRole('dialog', {
        name: 'Fullscreen Media Player',
      });
      await expect(fullscreenDialog).toBeVisible();
      const titleLink = fullscreenDialog.getByRole('link', { name: EPISODE_TITLE, exact: true });
      await expect(titleLink).toHaveAttribute(
        'href',
        `/episode/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}`
      );
      await captureVerifiedElement(
        deviceB.page,
        testInfo,
        titleLink,
        'The full-size remote player keeps the title link to the episode page.'
      );

      await titleLink.click();
      await expectEpisodeLoaded(deviceB.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectPersistentPlayerPlaying(deviceA.page, true);
      await expectAudioPlaying(deviceA.page);
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });

  test('When a remote browser is narrow, the bar shows jump controls and track skip stays on the full player.', async ({
    browser,
  }, testInfo) => {
    // Two signed-in contexts, plus cross-device presence leave wait, can exceed the default test budget.
    test.setTimeout(120_000);
    const devicesToClose: Array<Awaited<ReturnType<typeof openSignedInDevice>>> = [];

    try {
      const deviceA = await openSignedInDevice(browser);
      devicesToClose.push(deviceA);
      await clearSeededPodcastQueueResources(deviceA.page);
      await openEpisodeAndPlay(deviceA.page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
      await expectPersistentPlayerPlaying(deviceA.page, true);

      const deviceB = await openSignedInDevice(browser, {
        viewport: CROSS_DEVICE_MOBILE_VIEWPORT,
      });
      devicesToClose.push(deviceB);
      await deviceB.page.goto('/');
      await expectHomeLoaded(deviceB.page);
      await expect(playerButton(deviceB.page, JUMP_BACK_LABEL)).toBeVisible();
      await expect(playerButton(deviceB.page, JUMP_FORWARD_LABEL)).toBeVisible();
      await expect(playerButton(deviceB.page, 'Pause')).toBeVisible();
      await expect(playerDevicesButton(deviceB.page)).toBeVisible();
      await expect(visiblePlayerButton(deviceB.page, 'Skip to Previous')).toHaveCount(0);
      await expect(visiblePlayerButton(deviceB.page, 'Skip to Next')).toHaveCount(0);
      await expect(visiblePlayerButton(deviceB.page, 'More Options')).toHaveCount(0);
      await expect(visiblePlayerButton(deviceB.page, 'Share')).toHaveCount(0);
      await expect(visiblePlayerButton(deviceB.page, 'Add to Playlist')).toHaveCount(0);
      await capturePageLoad(
        deviceB.page,
        testInfo,
        'On a narrow remote podcast view, the bar shows play, jumps, and device switch.',
        playerButton(deviceB.page, JUMP_FORWARD_LABEL)
      );

      await openTrackAndPlay(deviceA.page, E2E_MUSIC_TRACK_ONE_ID_TEXT, TRACK_ONE_TITLE);
      await expectTrackLoaded(deviceA.page, E2E_MUSIC_TRACK_ONE_ID_TEXT, TRACK_ONE_TITLE);
      await expectMediaPlayerTitleVisible(deviceB.page, TRACK_ONE_TITLE, { timeout: 20_000 });
      await expect(playerButton(deviceB.page, JUMP_BACK_LABEL)).toBeVisible();
      await expect(playerButton(deviceB.page, JUMP_FORWARD_LABEL)).toBeVisible();
      await expect(visiblePlayerButton(deviceB.page, 'Skip to Previous')).toHaveCount(0);
      await expect(visiblePlayerButton(deviceB.page, 'Skip to Next')).toHaveCount(0);
      await deviceB.page.getByTestId('media-player-bar-title-mobile').click();
      const fullscreenDialog = deviceB.page.getByRole('dialog', {
        name: 'Fullscreen Media Player',
      });
      await expect(fullscreenDialog).toBeVisible();
      await fullscreenDialog.getByRole('button', { name: 'Skip to Next' }).click();
      await expectMediaPlayerTitleVisible(deviceA.page, TRACK_TWO_TITLE, { timeout: 20_000 });
    } finally {
      await closeSignedInDevices(devicesToClose);
    }
  });
});
