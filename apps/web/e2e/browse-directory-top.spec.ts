import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_DIRECTORY_ARTIST_TITLE,
  E2E_HLS_CHANNEL_TITLE,
  E2E_PODCAST_CHANNEL_TITLE,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const EPISODE_TITLE = 'E2E Podcast With Chapters';
const TRACK_TITLE = 'E2E Music Track One';

const chipRow = (page: Page) => page.getByTestId('media-list-chips-items');

const chipButton = (page: Page, name: string) =>
  chipRow(page).getByRole('button', { name, exact: true });

const chipTrailing = (page: Page) => page.getByTestId('media-list-chips-trailing');

const sortChip = (page: Page) => chipTrailing(page).getByRole('button', { name: /^Sort: / });

const expectAppPath = async (page: Page, path: string): Promise<void> => {
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === path);
};

const expectPressedChip = async (page: Page, name: string): Promise<void> => {
  await expect(chipButton(page, name)).toHaveAttribute('aria-pressed', 'true');
};

const visibleTitle = (page: Page, title: string) => page.getByText(title, { exact: true }).first();

const emptyMessage = (page: Page, message: string) => page.getByText(message, { exact: true });

const expectNoNextPage = async (page: Page): Promise<void> => {
  await expect(page.getByRole('button', { name: 'Next Page', exact: true })).toHaveCount(0);
};

const chooseTopThenDay = async (page: Page): Promise<void> => {
  await sortChip(page).click();
  const sortMenu = page.getByRole('menu', { name: 'Sort' });
  await expect(sortMenu).toBeVisible();
  await sortMenu.getByRole('menuitemradio', { name: 'Top', exact: true }).click();
  const rangeMenu = page.getByRole('menu', { name: 'Range' });
  await expect(rangeMenu).toBeVisible();
  await rangeMenu.getByRole('menuitemradio', { name: 'Day', exact: true }).click();
  await expect(sortChip(page)).toHaveAccessibleName('Sort: Day');
};

test.describe('Browse directory Top', () => {
  test('Each Browse list opens on Top for the past week, lists only rows counted that week, and keeps a sort the listener picks for that list', async ({
    page,
  }, testInfo) => {
    await test.step('Browse opens on Podcasts with Top for the past week, lists the seeded podcast, and omits the HLS channel', async () => {
      await page.goto('/browse');
      await expectAppPath(page, '/browse');
      await expectPressedChip(page, 'Podcasts');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      const podcastTitle = visibleTitle(page, E2E_PODCAST_CHANNEL_TITLE);
      await expect(podcastTitle).toBeVisible();
      await expect(page.getByText(E2E_HLS_CHANNEL_TITLE, { exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Browse Podcasts opens on Top for the week and lists the seeded podcast.',
        podcastTitle
      );
    });

    await test.step('Choosing Recent lists the seeded podcast and the HLS channel, and the URL stays on Browse', async () => {
      await sortChip(page).click();
      const sortMenu = page.getByRole('menu', { name: 'Sort' });
      await expect(sortMenu).toBeVisible();
      await sortMenu.getByRole('menuitemradio', { name: 'Recent', exact: true }).click();

      await expectAppPath(page, '/browse');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Recent');
      await expect(visibleTitle(page, E2E_PODCAST_CHANNEL_TITLE)).toBeVisible();
      const hlsTitle = visibleTitle(page, E2E_HLS_CHANNEL_TITLE);
      await expect(hlsTitle).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Recent on Browse Podcasts lists the seeded podcast and the HLS channel.',
        hlsTitle
      );
    });

    await test.step('Browse Episodes keeps its own sort and opens on Top for the past week with the chaptered episode listed', async () => {
      await page.goto('/browse?tab=episodes');
      await expectAppPath(page, '/browse?tab=episodes');
      await expectPressedChip(page, 'Episodes');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      const episodeTitle = visibleTitle(page, EPISODE_TITLE);
      await expect(episodeTitle).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Browse Episodes opens on Top for the week and lists the chaptered episode.',
        episodeTitle
      );
    });

    await test.step('Browse Artists opens on Top for the past week and lists the directory artist', async () => {
      await page.goto('/browse?tab=artists');
      await expectAppPath(page, '/browse?tab=artists');
      await expectPressedChip(page, 'Artists');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      const artistTitle = visibleTitle(page, E2E_DIRECTORY_ARTIST_TITLE);
      await expect(artistTitle).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Browse Artists opens on Top for the week and lists the directory artist.',
        artistTitle
      );
    });

    await test.step('Browse Tracks opens on Top for the past week and lists the seeded track', async () => {
      await page.goto('/browse?tab=tracks');
      await expectAppPath(page, '/browse?tab=tracks');
      await expectPressedChip(page, 'Tracks');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      const trackTitle = visibleTitle(page, TRACK_TITLE);
      await expect(trackTitle).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Browse Tracks opens on Top for the week and lists the seeded track.',
        trackTitle
      );
    });

    await test.step('Clicking Podcasts returns to Browse on Recent and shows the HLS channel', async () => {
      await chipButton(page, 'Podcasts').click();
      await expectAppPath(page, '/browse');
      await expectPressedChip(page, 'Podcasts');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Recent');
      await expect(visibleTitle(page, E2E_HLS_CHANNEL_TITLE)).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Podcasts keeps Recent after the other Browse lists opened on Week.',
        sortChip(page)
      );
    });
  });

  test("An empty Browse page shows that media type's empty message", async ({ page }, testInfo) => {
    await test.step('A signed-out listener chooses Top, then Day, on Browse Podcasts and sees no podcasts', async () => {
      await page.goto('/browse');
      await expectAppPath(page, '/browse');
      await expectPressedChip(page, 'Podcasts');
      await chooseTopThenDay(page);
      await expectNoNextPage(page);
      const message = emptyMessage(page, 'No Podcasts Found');
      await expect(message).toBeVisible();
      await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE, { exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Browse Podcasts on Top for the day says no podcasts were found.',
        message
      );
    });

    await test.step('Choosing Recent on Browse Podcasts lists the seeded podcast and hides the empty message', async () => {
      await sortChip(page).click();
      const sortMenu = page.getByRole('menu', { name: 'Sort' });
      await expect(sortMenu).toBeVisible();
      await sortMenu.getByRole('menuitemradio', { name: 'Recent', exact: true }).click();

      await expectAppPath(page, '/browse');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Recent');
      await expectNoNextPage(page);
      await expect(emptyMessage(page, 'No Podcasts Found')).toHaveCount(0);
      const podcastTitle = visibleTitle(page, E2E_PODCAST_CHANNEL_TITLE);
      await expect(podcastTitle).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Recent on Browse Podcasts lists the seeded podcast.',
        podcastTitle
      );
    });

    await test.step('Choosing Top, then Day, on Browse Episodes says no episodes were found', async () => {
      await page.goto('/browse?tab=episodes');
      await expectAppPath(page, '/browse?tab=episodes');
      await expectPressedChip(page, 'Episodes');
      await chooseTopThenDay(page);
      await expectNoNextPage(page);
      const message = emptyMessage(page, 'No Episodes Found');
      await expect(message).toBeVisible();
      await expect(page.getByText(EPISODE_TITLE, { exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Browse Episodes on Top for the day says no episodes were found.',
        message
      );
    });

    await test.step('Browse Clips opens on Top for the week and says no clips were found', async () => {
      await page.goto('/browse?tab=clips');
      await expectAppPath(page, '/browse?tab=clips');
      await expectPressedChip(page, 'Clips');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      await expectNoNextPage(page);
      const message = emptyMessage(page, 'No Clips Found');
      await expect(message).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Browse Clips on Top for the week says no clips were found.',
        message
      );
    });

    await test.step('Choosing Top, then Day, on Browse Artists says no artists were found', async () => {
      await page.goto('/browse?tab=artists');
      await expectAppPath(page, '/browse?tab=artists');
      await expectPressedChip(page, 'Artists');
      await chooseTopThenDay(page);
      await expectNoNextPage(page);
      const message = emptyMessage(page, 'No Artists Found');
      await expect(message).toBeVisible();
      await expect(page.getByText(E2E_DIRECTORY_ARTIST_TITLE, { exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Browse Artists on Top for the day says no artists were found.',
        message
      );
    });

    await test.step('Browse Albums opens on Top for the week and says no albums were found', async () => {
      await page.goto('/browse?tab=albums');
      await expectAppPath(page, '/browse?tab=albums');
      await expectPressedChip(page, 'Albums');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      await expectNoNextPage(page);
      const message = emptyMessage(page, 'No Albums Found');
      await expect(message).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Browse Albums on Top for the week says no albums were found.',
        message
      );
    });

    await test.step('Choosing Top, then Day, on Browse Tracks says no tracks were found', async () => {
      await page.goto('/browse?tab=tracks');
      await expectAppPath(page, '/browse?tab=tracks');
      await expectPressedChip(page, 'Tracks');
      await chooseTopThenDay(page);
      await expectNoNextPage(page);
      const message = emptyMessage(page, 'No Tracks Found');
      await expect(message).toBeVisible();
      await expect(page.getByText(TRACK_TITLE, { exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Browse Tracks on Top for the day says no tracks were found.',
        message
      );
    });

    await test.step('Browse Playlists opens on Top for the week and says no playlists were found', async () => {
      await page.goto('/browse?tab=playlists');
      await expectAppPath(page, '/browse?tab=playlists');
      await expectPressedChip(page, 'Playlists');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      await expectNoNextPage(page);
      const message = emptyMessage(page, 'No Playlists Found');
      await expect(message).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Browse Playlists on Top for the week says no playlists were found.',
        message
      );
    });

    await test.step('Browse Users opens on Top for the week and says no users were found', async () => {
      await page.goto('/browse?tab=users');
      await expectAppPath(page, '/browse?tab=users');
      await expectPressedChip(page, 'Users');
      await expect(sortChip(page)).toHaveAccessibleName('Sort: Week');
      await expectNoNextPage(page);
      const message = emptyMessage(page, 'No Users Found');
      await expect(message).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Browse Users on Top for the week says no users were found.',
        message
      );
    });
  });
});
