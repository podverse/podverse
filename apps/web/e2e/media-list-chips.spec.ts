import type { Locator, Page, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  loginSeedUser,
  stubAddByRSSParse,
  stubAddByRSSParseAll,
} from './helpers/addByRSSCredentials';
import {
  E2E_ADD_BY_RSS_TEST_ASSETS_FEED_IMAGE_URL,
  E2E_ADD_BY_RSS_TEST_ASSETS_FEED_TITLE,
  E2E_ADD_BY_RSS_TEST_ASSETS_FEED_URL,
  E2E_DIRECTORY_ARTIST_TITLE,
  E2E_LIVE_AV_AUDIO_ITEM_TITLE,
  E2E_LIVE_AV_HLS_VIDEO_ITEM_TITLE,
  E2E_LIVE_AV_LATER_SCHEDULED_ITEM_TITLE,
  E2E_LIVE_AV_SCHEDULED_ITEM_TITLE,
  E2E_LIVE_AV_STALE_SCHEDULED_ITEM_TITLE,
  E2E_LIVESTREAM_ITEM_TITLE,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_CHANNEL_TITLE,
  E2E_REMOVED_PLAYLIST_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const EPISODE_TITLE = 'E2E Chips Add by RSS Episode';
const E2E_CHIPS_ADD_BY_RSS_LIVESTREAM_TITLE = 'E2E Chips Add by RSS Livestream';
const E2E_CHIPS_ADD_BY_RSS_SCHEDULED_TITLE = 'E2E Chips Add by RSS Scheduled';
const E2E_CHIPS_ADD_BY_RSS_ENDED_RECENT_TITLE = 'E2E Chips Add by RSS Ended Recent';
const E2E_CHIPS_ADD_BY_RSS_ENDED_OLD_TITLE = 'E2E Chips Add by RSS Ended Old';

const E2E_CHIPS_MINUTE_MS = 60 * 1000;
const E2E_CHIPS_HOUR_MS = 60 * E2E_CHIPS_MINUTE_MS;
const E2E_CHIPS_DAY_MS = 24 * E2E_CHIPS_HOUR_MS;
const E2E_CHIPS_NOW_MS = Date.now();

const e2eChipsIsoBeforeNow = (deltaMs: number): string =>
  new Date(E2E_CHIPS_NOW_MS - deltaMs).toISOString();

const E2E_CHIPS_ADD_BY_RSS_LIVE_ENCLOSURE = {
  url: 'http://localhost:2111/audio/audio-001.mp3',
  type: 'audio/mpeg',
  length: 0,
};

const BROWSE_CHIP_LABELS = [
  'Podcasts',
  'Episodes',
  'Clips',
  'Artists',
  'Albums',
  'Tracks',
  'Livestreams',
  'Playlists',
  'Users',
] as const;

const SUBSCRIBED_CHIP_LABELS = [
  'Podcasts',
  'Episodes',
  'Clips',
  'Artists',
  'Albums',
  'Tracks',
  'Livestreams',
] as const;

const ADD_BY_RSS_CHIP_LABELS = [
  'Podcasts',
  'Episodes',
  'Artists',
  'Albums',
  'Tracks',
  'Livestreams',
] as const;

/** List routes the chips pages replace. A podcast detail URL is not in this list. */
const REMOVED_LIST_PATHS = [
  '/podcasts',
  '/episodes',
  '/clips',
  '/artists',
  '/albums',
  '/tracks',
  '/podcasts/livestreams',
  '/music/livestreams',
  '/add-by-rss/podcasts',
  '/add-by-rss/livestreams',
] as const;

/** Partytime-shaped feed the stubbed parse returns for the seeded test-assets follow. */
const PARSED_FEED = {
  title: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_TITLE,
  link: 'http://localhost:2111/',
  description: 'E2E chips fixture',
  explicit: false,
  image: { url: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_IMAGE_URL },
  items: [
    {
      title: EPISODE_TITLE,
      guid: 'e2e-chips-add-by-rss-episode',
      duration: 61,
      explicit: false,
      enclosure: {
        url: 'http://localhost:2111/audio/audio-001.mp3',
        type: 'audio/mpeg',
        length: 0,
      },
      pubDate: '2025-04-08T15:00:00.000Z',
    },
  ],
  podcastLiveItems: [
    {
      title: E2E_CHIPS_ADD_BY_RSS_LIVESTREAM_TITLE,
      guid: 'e2e-chips-add-by-rss-live',
      status: 'live',
      start: e2eChipsIsoBeforeNow(2 * E2E_CHIPS_HOUR_MS),
      enclosure: E2E_CHIPS_ADD_BY_RSS_LIVE_ENCLOSURE,
    },
    {
      title: E2E_CHIPS_ADD_BY_RSS_SCHEDULED_TITLE,
      guid: 'e2e-chips-add-by-rss-scheduled',
      status: 'pending',
      start: e2eChipsIsoBeforeNow(30 * E2E_CHIPS_MINUTE_MS),
      enclosure: E2E_CHIPS_ADD_BY_RSS_LIVE_ENCLOSURE,
    },
    {
      title: E2E_CHIPS_ADD_BY_RSS_ENDED_RECENT_TITLE,
      guid: 'e2e-chips-add-by-rss-ended-recent',
      status: 'ended',
      start: e2eChipsIsoBeforeNow(10 * E2E_CHIPS_MINUTE_MS),
      end: e2eChipsIsoBeforeNow(5 * E2E_CHIPS_MINUTE_MS),
      enclosure: E2E_CHIPS_ADD_BY_RSS_LIVE_ENCLOSURE,
    },
    {
      title: E2E_CHIPS_ADD_BY_RSS_ENDED_OLD_TITLE,
      guid: 'e2e-chips-add-by-rss-ended-old',
      status: 'ended',
      start: e2eChipsIsoBeforeNow(3 * E2E_CHIPS_DAY_MS),
      end: e2eChipsIsoBeforeNow(2 * E2E_CHIPS_DAY_MS),
      enclosure: E2E_CHIPS_ADD_BY_RSS_LIVE_ENCLOSURE,
    },
  ],
};

const chipRow = (page: Page) => page.getByTestId('media-list-chips-items');

const chipButton = (page: Page, name: string) =>
  chipRow(page).getByRole('button', { name, exact: true });

const chipTrailing = (page: Page) => page.getByTestId('media-list-chips-trailing');

const sortChip = (page: Page) => chipTrailing(page).getByRole('button', { name: /^Sort: / });

const categoryChip = (page: Page) => chipTrailing(page).getByTestId('media-list-category-chip');

const layoutChip = (page: Page) =>
  chipTrailing(page).getByRole('button', { name: 'Change Layout View', exact: true });

const expectAppPath = async (page: Page, path: string): Promise<void> => {
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === path);
};

const expectChipOrder = async (page: Page, labels: readonly string[]): Promise<void> => {
  await expect(chipRow(page).getByRole('button')).toHaveText([...labels]);
};

const expectPressedChip = async (page: Page, name: string): Promise<void> => {
  await expect(chipButton(page, name)).toHaveAttribute('aria-pressed', 'true');
};

const liveItemRow = (page: Page, title: string): Locator =>
  page.getByTestId('list-live-item-row').filter({ hasText: title });

const addByRssLivestreamRow = (page: Page, title: string): Locator =>
  page.getByTestId('add-by-rss-livestream-row').filter({ hasText: title });

const rowTop = async (row: Locator): Promise<number> => {
  const box = await row.boundingBox();
  expect(box, 'livestream row is in the layout').not.toBeNull();
  if (box === null) {
    return 0;
  }
  return box.y;
};

/**
 * Holds the server render of one chip on one page until the returned function runs. Only the RSC
 * request is held; a full document load of the same URL passes.
 */
const holdChipRender = async (page: Page, pathname: string, tab: string): Promise<() => void> => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname === pathname && url.searchParams.get('tab') === tab,
    async (route) => {
      if (route.request().headers()['rsc'] !== '1') {
        await route.fallback();
        return;
      }
      await gate;
      await route.continue();
    }
  );
  return release;
};

const listLoading = (page: Page) => page.getByTestId('media-list-loading');

/** Scrolls the chip row so the chip sits in the middle of it. */
const centerChipInRow = async (page: Page, chipKey: string): Promise<void> => {
  await chipRow(page).evaluate((items, key) => {
    const scroller = items.parentElement;
    const chip = items.querySelector(`[data-testid="media-list-chips-${key}"]`);
    if (scroller === null || chip === null) {
      throw new Error('The chip row or the chip is not in the layout.');
    }
    const scrollerRect = scroller.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    scroller.scrollLeft +=
      chipRect.left - scrollerRect.left - (scroller.clientWidth - chipRect.width) / 2;
  }, chipKey);
};

const chipBox = async (page: Page, name: string): Promise<{ x: number; y: number }> => {
  const box = await chipButton(page, name).boundingBox();
  expect(box, `${name} chip is in the layout`).not.toBeNull();
  return { x: box?.x ?? 0, y: box?.y ?? 0 };
};

const expectChipStill = async (
  page: Page,
  name: string,
  before: { x: number; y: number }
): Promise<void> => {
  const after = await chipBox(page, name);
  expect(after.x, `${name} chip did not move sideways`).toBeCloseTo(before.x, 0);
  expect(after.y, `${name} chip did not move up or down`).toBeCloseTo(before.y, 0);
};

type ChipStepScroll = { windowY: number; rowLeft: number };

const readChipStepScroll = async (page: Page): Promise<ChipStepScroll> => {
  const windowY = await page.evaluate(() => window.scrollY);
  const rowLeft = await chipRow(page).evaluate((items) => items.parentElement?.scrollLeft ?? 0);
  return { windowY, rowLeft };
};

const restoreChipStepScroll = async (page: Page, saved: ChipStepScroll): Promise<void> => {
  await page.evaluate((top) => {
    window.scrollTo({ top, left: 0, behavior: 'auto' });
  }, saved.windowY);
  await chipRow(page).evaluate((items, left) => {
    const scroller = items.parentElement;
    if (scroller !== null) {
      scroller.scrollLeft = left;
    }
  }, saved.rowLeft);
};

/**
 * Centers the verified element for the step screenshot, then puts the window and the chip row
 * back. These tests read chip positions as viewport boxes, and centering scrolls the page.
 */
const capturePageLoadKeepingScroll = async (
  page: Page,
  testInfo: TestInfo,
  label: string,
  element: Locator
): Promise<void> => {
  const saved = await readChipStepScroll(page);
  try {
    await capturePageLoad(page, testInfo, label, element);
  } finally {
    await restoreChipStepScroll(page, saved);
  }
};

const expectStatusLeftOfDate = async (row: Locator, statusLabel: string): Promise<void> => {
  const date = row.getByTestId('live-item-row-date');
  const status = row.getByTestId('live-item-row-status');
  await expect(date).toBeVisible();
  await expect(status.getByText(statusLabel, { exact: true })).toBeVisible();
  const dateBox = await date.boundingBox();
  const statusBox = await status.boundingBox();
  expect(dateBox, 'date line is in the layout').not.toBeNull();
  expect(statusBox, 'status slot is in the layout').not.toBeNull();
  if (dateBox === null || statusBox === null) {
    return;
  }
  expect(dateBox.x).toBeGreaterThanOrEqual(statusBox.x + statusBox.width - 1);
  const statusCenterY = statusBox.y + statusBox.height / 2;
  expect(statusCenterY).toBeGreaterThan(dateBox.y);
  expect(statusCenterY).toBeLessThan(dateBox.y + dateBox.height);
};

test.describe('Subscribed, Browse, and Add by RSS chips pages', () => {
  test('Browse chips keep the chosen chip in the URL and in this browser', async ({
    page,
  }, testInfo) => {
    await test.step('Browse opens on Podcasts with nine chips and no tab in the URL', async () => {
      await page.goto('/browse');
      await expectAppPath(page, '/browse');
      await expect(page.getByRole('heading', { name: 'Browse', exact: true })).toBeVisible();
      await expectChipOrder(page, BROWSE_CHIP_LABELS);
      await expectPressedChip(page, 'Podcasts');

      await capturePageLoad(
        page,
        testInfo,
        'Browse opens with Podcasts pressed and no tab query.',
        chipButton(page, 'Podcasts')
      );
    });

    await test.step('Clicking Artists puts artists in the URL and shows the directory artist', async () => {
      await chipButton(page, 'Artists').click();
      await expectAppPath(page, '/browse?tab=artists');
      await expectPressedChip(page, 'Artists');
      const artistTitle = page.getByRole('heading', {
        name: E2E_DIRECTORY_ARTIST_TITLE,
        level: 3,
      });
      await expect(artistTitle).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Artists chip is pressed and the directory artist is listed.',
        artistTitle
      );
    });

    await test.step('Reloading keeps Artists, and a plain Browse URL restores the stored chip', async () => {
      await page.reload();
      await expectAppPath(page, '/browse?tab=artists');
      await expectPressedChip(page, 'Artists');

      await page.goto('/browse');
      await expectAppPath(page, '/browse');
      await expectPressedChip(page, 'Artists');

      await capturePageLoad(
        page,
        testInfo,
        'Opening Browse with no query restores the stored Artists chip.',
        chipButton(page, 'Artists')
      );
    });

    await test.step('Clicking Podcasts returns to Browse with no tab', async () => {
      await chipButton(page, 'Podcasts').click();
      await expectAppPath(page, '/browse');
      await expectPressedChip(page, 'Podcasts');

      await capturePageLoad(
        page,
        testInfo,
        'Podcasts is pressed again and the URL has no tab.',
        chipButton(page, 'Podcasts')
      );
    });
  });

  test('On a narrow Browse, a clicked chip is pressed at once, a spinner replaces the old list, the chip row does not move, and the chip clicked last wins', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const artistTitle = page.getByRole('heading', { name: E2E_DIRECTORY_ARTIST_TITLE, level: 3 });
    let tracksBefore: { x: number; y: number } = { x: 0, y: 0 };
    let releaseTracks: () => void = () => undefined;

    await test.step('Browse Artists lists the directory artist, and the Tracks chip sits in the middle of the row', async () => {
      await page.goto('/browse?tab=artists');
      await expectAppPath(page, '/browse?tab=artists');
      await expectPressedChip(page, 'Artists');
      await expect(artistTitle).toBeVisible();
      await centerChipInRow(page, 'tracks');
      tracksBefore = await chipBox(page, 'Tracks');

      await capturePageLoadKeepingScroll(
        page,
        testInfo,
        'Browse Artists lists the directory artist, and the Tracks chip sits in the middle of the row.',
        chipButton(page, 'Tracks')
      );
    });

    await test.step('While the Tracks list is held, Tracks is pressed, the artist is hidden, a spinner shows, and the row has not moved', async () => {
      releaseTracks = await holdChipRender(page, '/browse', 'tracks');
      await chipButton(page, 'Tracks').click();
      await expect(chipButton(page, 'Tracks')).toHaveAttribute('aria-pressed', 'true');
      await expect(chipButton(page, 'Artists')).toHaveAttribute('aria-pressed', 'false');
      await expectAppPath(page, '/browse?tab=artists');
      await expect(artistTitle).toBeHidden();
      await expect(listLoading(page)).toBeVisible();
      await expect(sortChip(page)).toBeHidden();
      await expectChipStill(page, 'Tracks', tracksBefore);

      await capturePageLoadKeepingScroll(
        page,
        testInfo,
        'While the Tracks list is held, Tracks is pressed, the artist is hidden, a spinner shows, and the row has not moved.',
        listLoading(page)
      );
    });

    await test.step('When the Tracks list arrives, the spinner is gone, Tracks keeps focus, and the row has not moved', async () => {
      releaseTracks();
      await expectAppPath(page, '/browse?tab=tracks');
      await expectPressedChip(page, 'Tracks');
      await expect(listLoading(page)).toHaveCount(0);
      await expect(sortChip(page)).toBeVisible();
      await expect(chipButton(page, 'Tracks')).toBeFocused();
      await expectChipStill(page, 'Tracks', tracksBefore);
      await page.unrouteAll({ behavior: 'ignoreErrors' });

      await capturePageLoadKeepingScroll(
        page,
        testInfo,
        'When the Tracks list arrives, the spinner is gone, Tracks keeps focus, and the row has not moved.',
        chipButton(page, 'Tracks')
      );
    });

    await test.step('Clicking Albums and then Artists before Albums loads ends on Artists', async () => {
      const releaseAlbums = await holdChipRender(page, '/browse', 'albums');
      await chipButton(page, 'Albums').click();
      await expect(chipButton(page, 'Albums')).toHaveAttribute('aria-pressed', 'true');
      await expect(listLoading(page)).toBeVisible();
      await chipButton(page, 'Artists').click();
      await expectAppPath(page, '/browse?tab=artists');
      await expectPressedChip(page, 'Artists');
      await expect(artistTitle).toBeVisible();
      await expect(listLoading(page)).toHaveCount(0);
      releaseAlbums();
      await expectAppPath(page, '/browse?tab=artists');
      await expectPressedChip(page, 'Artists');
      await page.unrouteAll({ behavior: 'ignoreErrors' });

      await capturePageLoadKeepingScroll(
        page,
        testInfo,
        'Clicking Albums and then Artists before Albums loads ends on Artists.',
        artistTitle
      );
    });

    await test.step('Clicking Episodes and then Artists again before Episodes loads stays on Artists', async () => {
      const releaseEpisodes = await holdChipRender(page, '/browse', 'episodes');
      await chipButton(page, 'Episodes').click();
      await expect(chipButton(page, 'Episodes')).toHaveAttribute('aria-pressed', 'true');
      await expect(artistTitle).toBeHidden();
      await chipButton(page, 'Artists').click();
      await expectPressedChip(page, 'Artists');
      releaseEpisodes();
      await expectAppPath(page, '/browse?tab=artists');
      await expectPressedChip(page, 'Artists');
      await expect(artistTitle).toBeVisible();
      await expect(listLoading(page)).toHaveCount(0);
      await page.unrouteAll({ behavior: 'ignoreErrors' });

      await capturePageLoadKeepingScroll(
        page,
        testInfo,
        'Clicking Episodes and then Artists again before Episodes loads stays on Artists.',
        chipButton(page, 'Artists')
      );
    });
  });

  test('On signed-out Subscribed, a clicked chip hides the getting-started message behind a spinner until its list arrives', async ({
    page,
  }, testInfo) => {
    const gettingStarted = page.getByText('Your subscriptions will appear here.');
    let podcastsBefore: { x: number; y: number } = { x: 0, y: 0 };
    let releaseEpisodes: () => void = () => undefined;

    await test.step('While the Episodes list is held, Episodes is pressed and a spinner replaces the getting-started message', async () => {
      await page.goto('/');
      await expectAppPath(page, '/');
      await expect(gettingStarted).toBeVisible();
      await expectPressedChip(page, 'Podcasts');
      podcastsBefore = await chipBox(page, 'Podcasts');
      releaseEpisodes = await holdChipRender(page, '/', 'episodes');
      await chipButton(page, 'Episodes').click();
      await expectPressedChip(page, 'Episodes');
      await expect(gettingStarted).toBeHidden();
      await expect(listLoading(page)).toBeVisible();
      await expectChipStill(page, 'Podcasts', podcastsBefore);

      await capturePageLoadKeepingScroll(
        page,
        testInfo,
        'While the Episodes list is held, Episodes is pressed and a spinner replaces the getting-started message.',
        listLoading(page)
      );
    });

    await test.step('When the Episodes list arrives, the URL names episodes and the spinner is gone', async () => {
      releaseEpisodes();
      await expectAppPath(page, '/?tab=episodes');
      await expectPressedChip(page, 'Episodes');
      await expect(listLoading(page)).toHaveCount(0);
      await expectChipStill(page, 'Podcasts', podcastsBefore);
      await page.unrouteAll({ behavior: 'ignoreErrors' });

      await capturePageLoadKeepingScroll(
        page,
        testInfo,
        'When the Episodes list arrives, the URL names episodes and the spinner is gone.',
        chipButton(page, 'Episodes')
      );
    });
  });

  test('Browse Playlists and Users chips show public lists without type tabs', async ({
    page,
  }, testInfo) => {
    await test.step('Playlists is pressed and the page has no Create Playlist button or My Playlists tab', async () => {
      await page.goto('/browse?tab=playlists');
      await expectAppPath(page, '/browse?tab=playlists');
      await expectPressedChip(page, 'Playlists');
      await expect(page.getByRole('button', { name: 'Create Playlist' })).toHaveCount(0);
      await expect(page.getByRole('tab', { name: 'My Playlists' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'My Playlists', exact: true })).toHaveCount(0);
      await expect(
        chipTrailing(page).getByRole('button', { name: 'Filter: All', exact: true })
      ).toBeVisible();
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      await expect(page.getByText('No Playlists Found', { exact: true })).toBeVisible();
      await sortChip(page).click();
      const sortMenu = page.getByRole('menu', { name: 'Sort' });
      await expect(sortMenu).toBeVisible();
      await expect(page.getByRole('menu', { name: 'Range' })).toHaveCount(0);
      await expect(
        sortMenu.getByRole('menuitemradio', { name: 'Recent', exact: true })
      ).toBeVisible();
      await expect(sortMenu.getByRole('menuitemradio', { name: 'Top', exact: true })).toBeVisible();
      await expect(page.getByTestId('media-list-chips').getByRole('menu')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(sortMenu).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Browse Playlists is pressed with no create button or My Playlists tab.',
        chipButton(page, 'Playlists')
      );
    });

    await test.step('When the listener chooses Recent, Browse Playlists stays on the playlists tab and shows the removed playlist.', async () => {
      await sortChip(page).click();
      const sortMenu = page.getByRole('menu', { name: 'Sort' });
      await expect(sortMenu).toBeVisible();
      await sortMenu.getByRole('menuitemradio', { name: 'Recent', exact: true }).click();

      await expectAppPath(page, '/browse?tab=playlists');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Recent');
      const playlistTitle = page.getByText(E2E_REMOVED_PLAYLIST_TITLE, { exact: true });
      await expect(playlistTitle).toBeVisible();
      await expect(page.getByText('No Playlists Found', { exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Choosing Recent on Browse Playlists shows the removed playlist.',
        playlistTitle
      );
    });

    await test.step('When the listener chooses Top and then Week, Browse Playlists says no playlists were found and has no next page.', async () => {
      await sortChip(page).click();
      const sortMenu = page.getByRole('menu', { name: 'Sort' });
      await expect(sortMenu).toBeVisible();
      await sortMenu.getByRole('menuitemradio', { name: 'Top', exact: true }).click();
      const rangeMenu = page.getByRole('menu', { name: 'Range' });
      await expect(rangeMenu).toBeVisible();
      await rangeMenu.getByRole('menuitemradio', { name: 'Week', exact: true }).click();

      await expectAppPath(page, '/browse?tab=playlists');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      await expect(page.getByText(E2E_REMOVED_PLAYLIST_TITLE, { exact: true })).toHaveCount(0);
      const message = page.getByText('No Playlists Found', { exact: true });
      await expect(message).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next Page', exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Choosing Top and then Week on Browse Playlists says no playlists were found.',
        message
      );
    });

    await test.step('Users is pressed and the page header has no Global type label', async () => {
      await page.goto('/browse?tab=users');
      await expectAppPath(page, '/browse?tab=users');
      await expectPressedChip(page, 'Users');
      await expect(page.locator('header').getByText('Global', { exact: true })).toHaveCount(0);
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');

      await capturePageLoad(
        page,
        testInfo,
        'Browse Users is pressed and the header has no Global label.',
        chipButton(page, 'Users')
      );
    });
  });

  test('On a narrow screen the Browse chips stay on one line and the chosen chip is scrolled into view', async ({
    page,
  }, testInfo) => {
    // The row scrolls the selected chip into view on mount, so the viewport is narrow first.
    await page.setViewportSize({ width: 390, height: 844 });

    await test.step('Browse Users stays on one line, and the Users chip sits inside the row', async () => {
      await page.goto('/browse?tab=users');
      await expectAppPath(page, '/browse?tab=users');
      await expect(page.getByRole('heading', { name: 'Browse', exact: true })).toBeVisible();

      const usersChip = page.getByTestId('media-list-chips-users');
      const podcastsChip = page.getByTestId('media-list-chips-podcasts');
      const chipRowRoot = page.getByTestId('media-list-chips');
      await expect(usersChip).toHaveAttribute('aria-pressed', 'true');

      const usersBox = await usersChip.boundingBox();
      const podcastsBox = await podcastsChip.boundingBox();
      const rowBox = await chipRowRoot.boundingBox();
      expect(usersBox, 'Users chip is in the layout').not.toBeNull();
      expect(podcastsBox, 'Podcasts chip is in the layout').not.toBeNull();
      expect(rowBox, 'chip row is in the layout').not.toBeNull();
      if (usersBox === null || podcastsBox === null || rowBox === null) {
        return;
      }

      expect(podcastsBox.y).toBe(usersBox.y);
      expect(usersBox.x).toBeGreaterThanOrEqual(rowBox.x);
      expect(usersBox.x + usersBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width);

      await capturePageLoad(
        page,
        testInfo,
        'On a narrow screen the Users chip stays on one line and inside the chip row.',
        usersChip
      );
    });
  });

  test('On Browse, the Categories chip shows the category list in place of the list and hides Sort until a category is chosen', async ({
    page,
  }, testInfo) => {
    const categoriesList = page.getByTestId('media-list-categories');

    await test.step('Pressing the Categories chip on Browse Episodes shows the category list and hides Sort and the gear', async () => {
      await page.goto('/browse?tab=episodes');
      await expectAppPath(page, '/browse?tab=episodes');
      await expectPressedChip(page, 'Episodes');
      await expect(categoryChip(page)).toHaveAccessibleName('Categories');
      await expect(categoryChip(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(sortChip(page)).toBeVisible();

      await categoryChip(page).click();
      await expect(categoryChip(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(categoriesList).toBeVisible();
      await expect(sortChip(page)).toHaveCount(0);
      await expect(layoutChip(page)).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'The category list replaces the episodes, and Sort and the gear are hidden.',
        categoriesList
      );
    });

    await test.step('Choosing Arts keeps Episodes pressed, names Arts on the chip, and brings Sort back', async () => {
      await categoriesList.getByRole('button', { name: 'Arts', exact: true }).click();

      await expectAppPath(page, '/browse?tab=episodes&category=arts');
      await expectPressedChip(page, 'Episodes');
      await expect(categoryChip(page)).toHaveAccessibleName('Categories: Arts');
      await expect(categoryChip(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(categoriesList).toHaveCount(0);
      await expect(sortChip(page)).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Categories chip names Arts and the episodes list is back.',
        categoryChip(page)
      );
    });

    await test.step('Reopening the list marks Arts as current, and All Categories clears the category', async () => {
      await categoryChip(page).click();
      await expect(
        categoriesList.getByRole('button', { name: 'Arts', exact: true })
      ).toHaveAttribute('aria-current', 'true');

      await categoriesList.getByRole('button', { name: 'All Categories', exact: true }).click();

      await expectAppPath(page, '/browse?tab=episodes');
      await expect(categoryChip(page)).toHaveAccessibleName('Categories');

      await capturePageLoad(
        page,
        testInfo,
        'All Categories clears the category and the chip reads Categories again.',
        categoryChip(page)
      );
    });
  });

  test('Subscribed and Browse lists put Sort and the gear after the media chips, and only where the list uses them', async ({
    page,
  }, testInfo) => {
    await test.step('Signed-out Subscribed Episodes has a plain title, no Categories chip, Sort on Recent, and the gear', async () => {
      await page.goto('/?tab=episodes&category=arts');
      await expect(page.getByRole('heading', { name: 'Subscribed', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Subscribed >/ })).toHaveCount(0);
      await expect(categoryChip(page)).toHaveCount(0);
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Recent');
      await expect(layoutChip(page)).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Subscribed Episodes shows Sort and the gear after the media chips.',
        sortChip(page)
      );
    });

    await test.step('On Browse Podcasts, choosing Top then Month puts Month on the sort chip', async () => {
      await page.goto('/browse');
      await sortChip(page).click();
      await expect(page.getByRole('menu', { name: 'Sort' })).toBeVisible();
      await expect(page.getByTestId('media-list-chips').getByRole('menu')).toHaveCount(0);

      await page.getByRole('menuitemradio', { name: 'Top', exact: true }).click();
      const rangeMenu = page.getByRole('menu', { name: 'Range' });
      await expect(rangeMenu).toBeVisible();
      await rangeMenu.getByRole('menuitemradio', { name: 'Month', exact: true }).click();
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Month');

      await capturePageLoad(
        page,
        testInfo,
        'The sort chip reads Month after choosing Top and then Month.',
        sortChip(page)
      );
    });

    await test.step('Browse Clips has Categories and Sort but no gear, and Browse Artists has Sort and the gear but no Categories', async () => {
      await page.goto('/browse?tab=clips');
      await expect(categoryChip(page)).toBeVisible();
      await expect(sortChip(page)).toBeVisible();
      await expect(layoutChip(page)).toHaveCount(0);

      await page.goto('/browse?tab=artists');
      await expect(categoryChip(page)).toHaveCount(0);
      await expect(sortChip(page)).toBeVisible();
      await expect(layoutChip(page)).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Browse Artists shows Sort and the gear and no Categories chip.',
        sortChip(page)
      );
    });
  });

  test('Clip lists sort by Recent or Top, never A-Z, and a saved A-Z for Browse Clips opens on Top for the week', async ({
    page,
  }, testInfo) => {
    await test.step('Browse Clips opens on Top for the week and its Sort menu offers Recent and Top but not A-Z', async () => {
      await page.goto('/browse?tab=clips');
      await expectAppPath(page, '/browse?tab=clips');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      await sortChip(page).click();
      const sortMenu = page.getByRole('menu', { name: 'Sort' });
      await expect(sortMenu).toBeVisible();
      await expect(
        sortMenu.getByRole('menuitemradio', { name: 'Recent', exact: true })
      ).toBeVisible();
      await expect(sortMenu.getByRole('menuitemradio', { name: 'Top', exact: true })).toBeVisible();
      await expect(sortMenu.getByRole('menuitemradio', { name: 'A-Z', exact: true })).toHaveCount(
        0
      );

      await capturePageLoad(
        page,
        testInfo,
        'The Browse Clips sort menu lists Recent and Top only.',
        sortMenu
      );
      await page.keyboard.press('Escape');
      await expect(sortMenu).toHaveCount(0);
    });

    await test.step('Signed-out Subscribed Clips also offers Recent and Top but not A-Z', async () => {
      await page.goto('/?tab=clips');
      await expectAppPath(page, '/?tab=clips');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Recent');
      await sortChip(page).click();
      const sortMenu = page.getByRole('menu', { name: 'Sort' });
      await expect(sortMenu).toBeVisible();
      await expect(
        sortMenu.getByRole('menuitemradio', { name: 'Recent', exact: true })
      ).toBeVisible();
      await expect(sortMenu.getByRole('menuitemradio', { name: 'Top', exact: true })).toBeVisible();
      await expect(sortMenu.getByRole('menuitemradio', { name: 'A-Z', exact: true })).toHaveCount(
        0
      );
      await page.keyboard.press('Escape');
      await expect(sortMenu).toHaveCount(0);
    });

    await test.step('A saved A-Z for Browse Clips in this browser opens on Top for the week', async () => {
      const baseURL =
        typeof testInfo.project.use.baseURL === 'string'
          ? testInfo.project.use.baseURL
          : 'http://localhost:4032';
      const settings = {
        uit: 'dark',
        vs: 'grid',
        seda: false,
        aqc: { rp: false, rd: false },
        fd: { clips: { type: 'global', sort: 'a_z', range: null, category: null } },
        sp: [],
      };
      await page.context().addCookies([
        {
          name: 'local-settings',
          value: encodeURIComponent(JSON.stringify(settings)),
          url: baseURL,
        },
      ]);

      await page.goto('/browse?tab=clips');
      await expectAppPath(page, '/browse?tab=clips');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');

      await capturePageLoad(
        page,
        testInfo,
        'Browse Clips reads Week even when this browser saved A-Z for clips.',
        sortChip(page)
      );
    });
  });

  test('When Browse Livestreams is opened signed out, live streams are listed latest start first, then scheduled streams soonest start first, and a long-past scheduled stream is hidden', async ({
    page,
  }, testInfo) => {
    await test.step('Browse Livestreams is pressed, live streams are listed latest start first, then scheduled streams soonest start first, a long-past scheduled stream is hidden, each status sits on the date line to the left of the date, and the page has no Ended label, Global header, or view selector', async () => {
      await page.goto('/browse?tab=livestreams');
      await expectAppPath(page, '/browse?tab=livestreams');
      await expectPressedChip(page, 'Livestreams');
      await expect(page.getByRole('heading', { name: 'Browse', exact: true })).toBeVisible();

      const audioRow = liveItemRow(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE);
      const hlsVideoRow = liveItemRow(page, E2E_LIVE_AV_HLS_VIDEO_ITEM_TITLE);
      const followedLiveRow = liveItemRow(page, E2E_LIVESTREAM_ITEM_TITLE);
      const scheduledRow = liveItemRow(page, E2E_LIVE_AV_SCHEDULED_ITEM_TITLE);
      const laterScheduledRow = liveItemRow(page, E2E_LIVE_AV_LATER_SCHEDULED_ITEM_TITLE);
      await expect(audioRow).toBeVisible();
      await expect(hlsVideoRow).toBeVisible();
      await expect(followedLiveRow).toBeVisible();
      await expect(scheduledRow).toBeVisible();
      await expect(laterScheduledRow).toBeVisible();
      await expect(audioRow.getByText('Live', { exact: true })).toBeVisible();
      await expect(followedLiveRow.getByText('Live', { exact: true })).toBeVisible();
      await expect(scheduledRow.getByText('Scheduled', { exact: true })).toBeVisible();
      await expect(laterScheduledRow.getByText('Scheduled', { exact: true })).toBeVisible();
      await expectStatusLeftOfDate(audioRow, 'Live');
      await expectStatusLeftOfDate(followedLiveRow, 'Live');
      await expectStatusLeftOfDate(scheduledRow, 'Scheduled');
      await expectStatusLeftOfDate(laterScheduledRow, 'Scheduled');

      const scheduledTop = await rowTop(scheduledRow);
      expect(scheduledTop).toBeGreaterThan(await rowTop(audioRow));
      expect(scheduledTop).toBeGreaterThan(await rowTop(followedLiveRow));
      expect(await rowTop(hlsVideoRow)).toBeGreaterThan(await rowTop(audioRow));
      expect(await rowTop(laterScheduledRow)).toBeGreaterThan(scheduledTop);
      await expect(liveItemRow(page, E2E_LIVE_AV_STALE_SCHEDULED_ITEM_TITLE)).toHaveCount(0);

      await expect(
        page.locator('#mainOuterWrapper').getByText('Ended', { exact: true })
      ).toHaveCount(0);
      await expect(page.locator('header').getByText('Global', { exact: true })).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Change Layout View', exact: true })
      ).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Browse Livestreams lists live streams latest start first, then scheduled streams soonest start first, without the long-past scheduled stream.',
        scheduledRow
      );
    });

    await test.step('Clicking the live audio title opens its podcast livestream page', async () => {
      const audioTitle = liveItemRow(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE).getByRole('heading', {
        name: E2E_LIVE_AV_AUDIO_ITEM_TITLE,
        exact: true,
      });
      const detailTitle = page.getByRole('heading', {
        name: E2E_LIVE_AV_AUDIO_ITEM_TITLE,
        exact: true,
      });

      await actionAndCapture(
        page,
        testInfo,
        'The live audio title opens the podcast livestream page.',
        async () => {
          await audioTitle.click();
          await expect(page).toHaveURL(/\/podcast\/livestream\//);
          await expect(detailTitle).toBeVisible();
        },
        detailTitle
      );
    });
  });

  test('Signed-out Subscribed points to Browse', async ({ page }, testInfo) => {
    await test.step('Subscribed shows seven chips and a Browse link in the getting-started message', async () => {
      await page.goto('/');
      await expectAppPath(page, '/');
      await expect(page.getByRole('heading', { name: 'Subscribed', exact: true })).toBeVisible();
      await expectChipOrder(page, SUBSCRIBED_CHIP_LABELS);
      const browseLink = page.locator('a[href="/browse"]').filter({ hasText: 'podcasts' });
      await expect(page.getByText('Your subscriptions will appear here.')).toBeVisible();
      await expect(browseLink).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Signed-out Subscribed links to Browse from the getting-started message.',
        browseLink
      );
    });
  });

  test('When Subscribed Livestreams is opened signed in, only a followed channel is listed', async ({
    page,
  }, testInfo) => {
    // Login outlasts the default budget before the followed livestream row settles.
    test.setTimeout(60_000);

    await test.step('Subscribed Livestreams is pressed and lists the followed live stream without the unfollowed scheduled stream', async () => {
      await loginSeedUser(page);
      await page.goto('/?tab=livestreams');
      await expectAppPath(page, '/?tab=livestreams');
      await expectPressedChip(page, 'Livestreams');

      const followedLiveRow = liveItemRow(page, E2E_LIVESTREAM_ITEM_TITLE);
      await expect(followedLiveRow).toBeVisible();
      await expect(followedLiveRow.getByText('Live', { exact: true })).toBeVisible();
      await expect(liveItemRow(page, E2E_LIVE_AV_SCHEDULED_ITEM_TITLE)).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Subscribed Livestreams lists the followed live stream.',
        followedLiveRow
      );
    });
  });

  test.describe('When the seeded account is signed in, Subscribed and Add by RSS include followed feeds', () => {
    test.beforeEach(async ({ page }) => {
      // Login plus the stubbed parse outlast the default budget before the followed row settles.
      test.setTimeout(60_000);
      await loginSeedUser(page);
      await stubAddByRSSParse(page, {
        feedUrl: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_URL,
        outcomes: [{ status: 'parsed', payload: PARSED_FEED }],
      });
      await stubAddByRSSParseAll(page);
    });

    test('Subscribed lists server and Add by RSS follows together', async ({ page }, testInfo) => {
      await test.step('Subscribed opens on Podcasts with seven chips, the seeded show, and the followed feed', async () => {
        await page.goto('/');
        await expectAppPath(page, '/');
        await expect(page.getByRole('heading', { name: 'Subscribed', exact: true })).toBeVisible();
        await expectChipOrder(page, SUBSCRIBED_CHIP_LABELS);
        await expectPressedChip(page, 'Podcasts');
        await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE).first()).toBeVisible();
        const feedLink = page
          .locator('a[href*="/add-by-rss/podcast/"]')
          .filter({ hasText: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_TITLE })
          .first();
        await expect(feedLink).toBeVisible({ timeout: 15_000 });

        await capturePageLoad(
          page,
          testInfo,
          'Subscribed Podcasts lists the seeded show and the followed Add by RSS feed.',
          feedLink
        );
      });

      await test.step('Clicking Episodes shows the parsed Add by RSS episode', async () => {
        await chipButton(page, 'Episodes').click();
        await expectAppPath(page, '/?tab=episodes');
        await expectPressedChip(page, 'Episodes');
        const episode = page.getByText(EPISODE_TITLE).first();
        await expect(episode).toBeVisible({ timeout: 15_000 });

        await capturePageLoad(
          page,
          testInfo,
          'Subscribed Episodes lists the parsed Add by RSS episode.',
          episode
        );
      });

      await test.step('Clicking Clips shows no Add by RSS row in the main column', async () => {
        await chipButton(page, 'Clips').click();
        await expectAppPath(page, '/?tab=clips');
        await expectPressedChip(page, 'Clips');
        await expect(page.locator('#mainOuterWrapper a[href*="/add-by-rss/"]')).toHaveCount(0);

        await capturePageLoad(
          page,
          testInfo,
          'Subscribed Clips has no Add by RSS link in the main column.',
          chipButton(page, 'Clips')
        );
      });
    });

    test('The Add by RSS page has its own chips and Add Feed', async ({ page }, testInfo) => {
      await test.step('The Library link opens Add by RSS with six chips and the followed feed', async () => {
        await page.goto('/');
        const libraryLink = page.locator('#sidebar a[href="/add-by-rss"]');
        await expect(libraryLink).toBeVisible();
        await libraryLink.click();
        await expectAppPath(page, '/add-by-rss');
        await expect(page.getByRole('heading', { name: 'Add by RSS', exact: true })).toBeVisible();
        await expectChipOrder(page, ADD_BY_RSS_CHIP_LABELS);
        await expectPressedChip(page, 'Podcasts');
        const feedLink = page
          .locator('a[href*="/add-by-rss/podcast/"]')
          .filter({ hasText: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_TITLE })
          .first();
        await expect(feedLink).toBeVisible({ timeout: 15_000 });

        await capturePageLoad(
          page,
          testInfo,
          'Add by RSS lists the followed feed under its Podcasts chip.',
          feedLink
        );
      });

      await test.step('Add Feed and Check for Updates share the chip row when it fits, stack above it when it does not, and choosing Oldest updates the Sort chip', async () => {
        const actions = page.locator('#mainOuterWrapper').getByTestId('add-by-rss-list-actions');
        const addFeed = actions.getByRole('button', { name: 'Add Feed', exact: true });
        const checkUpdates = actions.getByRole('button', {
          name: 'Check for Updates',
          exact: true,
        });
        await expect(addFeed).toBeVisible();
        await expect(checkUpdates).toBeVisible();

        const header = page.locator('header');
        await expect(header.getByRole('button', { name: 'Add Feed', exact: true })).toHaveCount(0);
        await expect(
          header.getByRole('button', { name: 'Check for Updates', exact: true })
        ).toHaveCount(0);

        const chips = page.getByTestId('media-list-chips');
        await page.setViewportSize({ width: 1600, height: 900 });
        const wideActionsBox = await actions.boundingBox();
        const wideChipsBox = await chips.boundingBox();
        const wideAddFeedBox = await addFeed.boundingBox();
        const wideCheckUpdatesBox = await checkUpdates.boundingBox();
        expect(wideActionsBox, 'actions row is in the layout').not.toBeNull();
        expect(wideChipsBox, 'chip row is in the layout').not.toBeNull();
        expect(wideAddFeedBox, 'Add Feed is in the layout').not.toBeNull();
        expect(wideCheckUpdatesBox, 'Check for Updates is in the layout').not.toBeNull();
        if (
          wideActionsBox !== null &&
          wideChipsBox !== null &&
          wideAddFeedBox !== null &&
          wideCheckUpdatesBox !== null
        ) {
          expect(wideActionsBox.x).toBeGreaterThanOrEqual(wideChipsBox.x + wideChipsBox.width - 1);
          expect(wideActionsBox.y).toBeLessThan(wideChipsBox.y + wideChipsBox.height);
          expect(wideChipsBox.y).toBeLessThan(wideActionsBox.y + wideActionsBox.height);
          expect(wideAddFeedBox.x).toBeLessThan(wideCheckUpdatesBox.x);
          expect(Math.abs(wideAddFeedBox.y - wideCheckUpdatesBox.y)).toBeLessThanOrEqual(4);
          const wideChipFace = await chips
            .getByRole('button', { name: 'Podcasts', exact: true })
            .boundingBox();
          expect(wideChipFace, 'Podcasts chip is in the layout').not.toBeNull();
          if (wideChipFace !== null) {
            const addMid = wideAddFeedBox.y + wideAddFeedBox.height / 2;
            const chipMid = wideChipFace.y + wideChipFace.height / 2;
            expect(Math.abs(addMid - chipMid)).toBeLessThanOrEqual(1);
          }
        }

        await page.setViewportSize({ width: 390, height: 844 });
        const narrowActionsBox = await actions.boundingBox();
        const narrowChipsBox = await chips.boundingBox();
        const narrowAddFeedBox = await addFeed.boundingBox();
        const narrowCheckUpdatesBox = await checkUpdates.boundingBox();
        expect(narrowActionsBox, 'actions row is in the layout').not.toBeNull();
        expect(narrowChipsBox, 'chip row is in the layout').not.toBeNull();
        expect(narrowAddFeedBox, 'Add Feed is in the layout').not.toBeNull();
        expect(narrowCheckUpdatesBox, 'Check for Updates is in the layout').not.toBeNull();
        if (
          narrowActionsBox !== null &&
          narrowChipsBox !== null &&
          narrowAddFeedBox !== null &&
          narrowCheckUpdatesBox !== null
        ) {
          expect(narrowActionsBox.y + narrowActionsBox.height).toBeLessThanOrEqual(
            narrowChipsBox.y
          );
          expect(Math.abs(narrowActionsBox.x - narrowChipsBox.x)).toBeLessThanOrEqual(4);
          expect(narrowAddFeedBox.x).toBeLessThan(narrowCheckUpdatesBox.x);
          expect(Math.abs(narrowAddFeedBox.y - narrowCheckUpdatesBox.y)).toBeLessThanOrEqual(4);
        }

        await page.setViewportSize({ width: 1280, height: 720 });

        const trailing = page.getByTestId('media-list-chips-trailing');
        const sortButton = trailing.getByRole('button', { name: 'Sort: Recent', exact: true });
        const layoutButton = trailing.getByRole('button', {
          name: 'Change Layout View',
          exact: true,
        });
        await expect(sortButton).toBeVisible();
        await expect(layoutButton).toBeVisible();
        const sortBox = await sortButton.boundingBox();
        const layoutBox = await layoutButton.boundingBox();
        expect(sortBox, 'Sort chip is in the layout').not.toBeNull();
        expect(layoutBox, 'layout gear is in the layout').not.toBeNull();
        if (sortBox !== null && layoutBox !== null) {
          expect(sortBox.x).toBeLessThan(layoutBox.x);
        }

        await expect(page.getByRole('button', { name: 'Recent', exact: true })).toHaveCount(0);

        await sortButton.click();
        // The open menu is portaled on document.body, outside the trailing slot.
        await page.getByRole('menuitemradio', { name: 'Oldest', exact: true }).click();
        await expect(
          trailing.getByRole('button', { name: 'Sort: Oldest', exact: true })
        ).toBeVisible();

        await capturePageLoad(page, testInfo, 'The Sort chip shows Oldest.', actions);
      });

      await test.step('Add Feed opens the add-feed page', async () => {
        const addFeed = page.getByRole('button', { name: 'Add Feed', exact: true });
        await addFeed.click();
        await expectAppPath(page, '/add-by-rss/add');
        const feedUrlField = page.getByLabel('RSS Feed URL');
        await expect(feedUrlField).toBeVisible();

        await capturePageLoad(
          page,
          testInfo,
          'Add Feed opens the page where a feed URL is entered.',
          feedUrlField
        );
      });
    });

    test('When an Add by RSS feed has a live item, that livestream is listed and the feed stays on Podcasts', async ({
      page,
    }, testInfo) => {
      await test.step('Add by RSS Livestreams is pressed and lists the parsed live item', async () => {
        await page.goto('/add-by-rss?tab=livestreams');
        await expectAppPath(page, '/add-by-rss?tab=livestreams');
        await expectPressedChip(page, 'Livestreams');

        const liveLink = page
          .locator('a[href*="/add-by-rss/podcast/livestream/"]')
          .filter({ hasText: E2E_CHIPS_ADD_BY_RSS_LIVESTREAM_TITLE });
        // The stubbed parse lands before the livestream row.
        await expect(liveLink).toBeVisible({ timeout: 15_000 });
        const liveRow = page.getByTestId('add-by-rss-livestream-row').filter({
          hasText: E2E_CHIPS_ADD_BY_RSS_LIVESTREAM_TITLE,
        });
        await expect(liveRow.getByText('Live', { exact: true })).toBeVisible();
        const actions = page.getByTestId('add-by-rss-list-actions');
        await expect(
          actions.getByRole('button', { name: 'Check for Updates', exact: true })
        ).toBeVisible();
        await expect(actions.getByRole('button', { name: 'Add Feed', exact: true })).toBeVisible();
        const header = page.locator('header');
        await expect(
          header.getByRole('button', { name: 'Check for Updates', exact: true })
        ).toHaveCount(0);
        await expect(header.getByRole('button', { name: 'Add Feed', exact: true })).toHaveCount(0);
        await expect(page.getByTestId('media-list-chips-trailing')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Sort: Recent', exact: true })).toHaveCount(
          0
        );
        await expect(
          page.getByRole('button', { name: 'Change Layout View', exact: true })
        ).toHaveCount(0);

        await capturePageLoad(
          page,
          testInfo,
          'Add by RSS Livestreams lists the parsed live item.',
          liveLink
        );
      });

      await test.step('The feed that has a live item is still listed on the Podcasts chip', async () => {
        await chipButton(page, 'Podcasts').click();
        await expectPressedChip(page, 'Podcasts');
        await expectAppPath(page, '/add-by-rss');
        const feedLink = page
          .locator('a[href*="/add-by-rss/podcast/"]:not([href*="/livestream/"])')
          .filter({ hasText: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_TITLE });
        await expect(feedLink).toBeVisible();

        await capturePageLoad(
          page,
          testInfo,
          'The feed that has a live item is still listed on the Podcasts chip.',
          feedLink
        );
      });

      await test.step('Subscribed Livestreams lists that Add by RSS livestream beside the followed live stream', async () => {
        await page.goto('/?tab=livestreams');
        await expectAppPath(page, '/?tab=livestreams');
        await expectPressedChip(page, 'Livestreams');
        const addByRssLink = page
          .locator('a[href*="/add-by-rss/podcast/livestream/"]')
          .filter({ hasText: E2E_CHIPS_ADD_BY_RSS_LIVESTREAM_TITLE });
        await expect(addByRssLink).toBeVisible();
        await expect(liveItemRow(page, E2E_LIVESTREAM_ITEM_TITLE)).toBeVisible();

        await capturePageLoad(
          page,
          testInfo,
          'Subscribed Livestreams lists the Add by RSS livestream beside the followed live stream.',
          addByRssLink
        );
      });
    });

    test('When an Add by RSS podcast page lists livestreams, live comes first, then scheduled, then one that ended within the day, and Oldest leaves that order in place', async ({
      page,
    }, testInfo) => {
      await test.step('Opening Add by RSS Livestreams waits until the parsed live item is listed', async () => {
        await page.goto('/add-by-rss?tab=livestreams');
        await expectAppPath(page, '/add-by-rss?tab=livestreams');

        const liveLink = page
          .locator('a[href*="/add-by-rss/podcast/livestream/"]')
          .filter({ hasText: E2E_CHIPS_ADD_BY_RSS_LIVESTREAM_TITLE });
        // The stubbed parse lands before the livestream row.
        await expect(liveLink).toBeVisible({ timeout: 15_000 });

        await capturePageLoad(
          page,
          testInfo,
          'Add by RSS Livestreams has finished parsing the followed feed.',
          liveLink
        );
      });

      await test.step('Opening the followed feed from the Podcasts chip loads its podcast page', async () => {
        await chipButton(page, 'Podcasts').click();
        const feedLink = page
          .locator('a[href*="/add-by-rss/podcast/"]:not([href*="/livestream/"])')
          .filter({ hasText: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_TITLE });
        await expect(feedLink).toBeVisible();
        await feedLink.click();
        await expect(page).toHaveURL((url) => /^\/add-by-rss\/podcast\/[^/]+$/.test(url.pathname));
        const feedHeading = page.getByRole('heading', {
          name: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_TITLE,
          level: 1,
        });
        await expect(feedHeading).toBeVisible();

        await capturePageLoad(
          page,
          testInfo,
          'The followed Add by RSS feed opens on its podcast page.',
          feedHeading
        );
      });

      await test.step('The podcast page lists the live item, then the scheduled item, then the item that ended within the day, and each status sits on the date line to the left of the date', async () => {
        const liveRow = addByRssLivestreamRow(page, E2E_CHIPS_ADD_BY_RSS_LIVESTREAM_TITLE);
        const scheduledRow = addByRssLivestreamRow(page, E2E_CHIPS_ADD_BY_RSS_SCHEDULED_TITLE);
        const endedRecentRow = addByRssLivestreamRow(page, E2E_CHIPS_ADD_BY_RSS_ENDED_RECENT_TITLE);

        await expect(page.getByTestId('add-by-rss-livestream-row')).toHaveCount(3);
        await expect(liveRow).toBeVisible();
        await expect(liveRow.getByText('Live', { exact: true })).toBeVisible();
        await expect(scheduledRow).toBeVisible();
        await expect(scheduledRow.getByText('Scheduled', { exact: true })).toBeVisible();
        await expect(endedRecentRow).toBeVisible();
        await expect(endedRecentRow.getByText('Ended', { exact: true })).toBeVisible();
        await expectStatusLeftOfDate(liveRow, 'Live');
        await expectStatusLeftOfDate(scheduledRow, 'Scheduled');
        await expectStatusLeftOfDate(endedRecentRow, 'Ended');

        const liveTop = await rowTop(liveRow);
        const scheduledTop = await rowTop(scheduledRow);
        const endedRecentTop = await rowTop(endedRecentRow);
        expect(liveTop).toBeLessThan(scheduledTop);
        expect(scheduledTop).toBeLessThan(endedRecentTop);

        await capturePageLoad(
          page,
          testInfo,
          'The podcast page lists live, then scheduled, then the recent ended livestream.',
          liveRow
        );
      });

      await test.step('An ended livestream older than a day is not listed', async () => {
        const endedRecentRow = addByRssLivestreamRow(page, E2E_CHIPS_ADD_BY_RSS_ENDED_RECENT_TITLE);
        await expect(page.getByText(E2E_CHIPS_ADD_BY_RSS_ENDED_OLD_TITLE)).toHaveCount(0);

        await capturePageLoad(
          page,
          testInfo,
          'The livestream that ended more than a day ago is absent.',
          endedRecentRow
        );
      });

      await test.step('Choosing Oldest leaves the livestream rows in the same vertical order', async () => {
        const liveRow = addByRssLivestreamRow(page, E2E_CHIPS_ADD_BY_RSS_LIVESTREAM_TITLE);
        const scheduledRow = addByRssLivestreamRow(page, E2E_CHIPS_ADD_BY_RSS_SCHEDULED_TITLE);
        const endedRecentRow = addByRssLivestreamRow(page, E2E_CHIPS_ADD_BY_RSS_ENDED_RECENT_TITLE);

        await page.getByRole('button', { name: 'Sort: Recent', exact: true }).click();
        await page.getByRole('menuitemradio', { name: 'Oldest', exact: true }).click();

        const liveTop = await rowTop(liveRow);
        const scheduledTop = await rowTop(scheduledRow);
        const endedRecentTop = await rowTop(endedRecentRow);
        expect(liveTop).toBeLessThan(scheduledTop);
        expect(scheduledTop).toBeLessThan(endedRecentTop);

        await capturePageLoad(
          page,
          testInfo,
          'Oldest reorders episodes and leaves the livestream rows in channel order.',
          liveRow
        );
      });
    });
  });

  test('Old list URLs are gone, and a podcast detail URL still loads', async ({ request }) => {
    await test.step('The removed list paths each answer 404', async () => {
      for (const path of REMOVED_LIST_PATHS) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(404);
      }
    });

    await test.step('A podcast detail URL still answers 200', async () => {
      const response = await request.get(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
      expect(response.status()).toBe(200);
    });
  });
});
