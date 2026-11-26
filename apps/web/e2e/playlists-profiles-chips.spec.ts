import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const expectAppPath = async (page: Page, path: string): Promise<void> => {
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === path);
};

test.describe('Playlists and Profiles chip rows', () => {
  test('The playlists page shows type chips, then the Filter and Sort chips', async ({
    page,
  }, testInfo) => {
    await test.step('My Playlists, Subscribed, and Global are followed by Filter and Sort. Global opens on Recent, and My Playlists sorts A-Z', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/playlists');
      await expectAppPath(page, '/playlists');
      await expect(page.getByRole('heading', { name: 'Playlists', exact: true })).toBeVisible();
      const createPlaylist = page.getByRole('button', { name: 'Create Playlist', exact: true });
      await expect(createPlaylist).toBeVisible();
      await expect(
        page.locator('header').getByRole('button', { name: 'Create Playlist', exact: true })
      ).toHaveCount(0);

      const chips = page.getByTestId('playlists-type-chips');
      const typeItems = page.getByTestId('playlists-type-chips-items');
      const createBox = await createPlaylist.boundingBox();
      const chipsBox = await chips.boundingBox();
      expect(createBox, 'Create Playlist is in the layout').not.toBeNull();
      expect(chipsBox, 'chip row is in the layout').not.toBeNull();
      if (createBox !== null && chipsBox !== null) {
        expect(createBox.x).toBeGreaterThanOrEqual(chipsBox.x + chipsBox.width - 1);
        const chipFace = await typeItems.getByRole('button').first().boundingBox();
        expect(chipFace, 'a type chip is in the layout').not.toBeNull();
        if (chipFace !== null) {
          const createMid = createBox.y + createBox.height / 2;
          const chipMid = chipFace.y + chipFace.height / 2;
          expect(Math.abs(createMid - chipMid)).toBeLessThanOrEqual(1);
        }
      }

      await expect(typeItems.getByRole('button')).toHaveText([
        'My Playlists',
        'Subscribed',
        'Global',
      ]);
      await expect(typeItems.getByRole('button', { name: 'Global', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
      );

      const trailing = page.getByTestId('playlists-type-chips-trailing');
      await expect(
        trailing.getByRole('button', { name: 'Filter: All', exact: true })
      ).toBeVisible();
      const sortButton = trailing.getByRole('button', { name: /^Sort: / });
      await expect(sortButton).toHaveAccessibleName('Sort: Recent');

      await typeItems.getByRole('button', { name: 'My Playlists', exact: true }).click();
      await expect(
        typeItems.getByRole('button', { name: 'My Playlists', exact: true })
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(sortButton).toHaveAccessibleName('Sort: A-Z');

      await typeItems.getByRole('button', { name: 'Global', exact: true }).click();
      await expect(typeItems.getByRole('button', { name: 'Global', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await expect(sortButton).toHaveAccessibleName('Sort: Recent');

      await capturePageLoad(
        page,
        testInfo,
        'Global is pressed and the sort chip reads Recent.',
        typeItems
      );
    });
  });

  test('On a narrow window Create Playlist sits above the chips and aligns to their start', async ({
    page,
  }, testInfo) => {
    await test.step('Create Playlist is out of the title row and above the chips', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/playlists');
      await expectAppPath(page, '/playlists');
      const createPlaylist = page.getByRole('button', { name: 'Create Playlist', exact: true });
      const chips = page.getByTestId('playlists-type-chips');
      await expect(createPlaylist).toBeVisible();
      await expect(
        page.locator('header').getByRole('button', { name: 'Create Playlist', exact: true })
      ).toHaveCount(0);

      const createBox = await createPlaylist.boundingBox();
      const chipsBox = await chips.boundingBox();
      expect(createBox, 'Create Playlist is in the layout').not.toBeNull();
      expect(chipsBox, 'chip row is in the layout').not.toBeNull();
      if (createBox !== null && chipsBox !== null) {
        expect(createBox.y + createBox.height).toBeLessThanOrEqual(chipsBox.y);
        expect(Math.abs(createBox.x - chipsBox.x)).toBeLessThanOrEqual(4);
      }

      await capturePageLoad(
        page,
        testInfo,
        'Create Playlist sits above the chips on a narrow window.',
        createPlaylist
      );
    });
  });

  test('Choosing Music in the Filter chip keeps the type chips and names the medium', async ({
    page,
  }, testInfo) => {
    await test.step('Music stays on the Filter chip and Global stays pressed', async () => {
      await page.goto('/playlists');
      await expectAppPath(page, '/playlists');
      await expect(page.getByRole('heading', { name: 'Playlists', exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Filter: All', exact: true }).click();
      await expect(page.getByRole('menuitemradio', { name: 'All', exact: true })).toBeVisible();
      await expect(
        page.getByRole('menuitemradio', { name: 'Podcasts', exact: true })
      ).toBeVisible();
      const musicItem = page.getByRole('menuitemradio', { name: 'Music', exact: true });
      await expect(musicItem).toBeVisible();
      await expect(page.getByTestId('playlists-type-chips').getByRole('menu')).toHaveCount(0);
      await musicItem.click();

      const filterChip = page.getByRole('button', { name: 'Filter: Music', exact: true });
      await expect(filterChip).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Filter: Music', exact: true })).toBeVisible();
      await expect(
        page
          .getByTestId('playlists-type-chips-items')
          .getByRole('button', { name: 'Global', exact: true })
      ).toHaveAttribute('aria-pressed', 'true');

      await capturePageLoad(
        page,
        testInfo,
        'The Filter chip still reads Music after a reload, and Global stays pressed.',
        filterChip
      );
    });
  });

  test('The profiles page shows Global and Subscribed chips, then Sort', async ({
    page,
  }, testInfo) => {
    await test.step('Global is pressed with Sort on Recent, and choosing Top then Week names the sort chip Week', async () => {
      await page.goto('/profiles');
      await expectAppPath(page, '/profiles');
      await expect(page.getByRole('heading', { name: 'Profiles', exact: true })).toBeVisible();

      const typeItems = page.getByTestId('profiles-type-chips-items');
      await expect(typeItems.getByRole('button')).toHaveText(['Global', 'Subscribed']);
      await expect(typeItems.getByRole('button', { name: 'Global', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
      );

      const sortButton = page
        .getByTestId('profiles-type-chips-trailing')
        .getByRole('button', { name: /^Sort: / });
      await expect(sortButton).toHaveAccessibleName('Sort: Recent');

      await sortButton.click();
      await expect(page.getByRole('menu', { name: 'Sort' })).toBeVisible();
      await expect(page.getByTestId('profiles-type-chips').getByRole('menu')).toHaveCount(0);
      await page.getByRole('menuitemradio', { name: 'Top', exact: true }).click();
      await page
        .getByRole('menu', { name: 'Range' })
        .getByRole('menuitemradio', { name: 'Week', exact: true })
        .click();
      await expect(sortButton).toHaveAccessibleName('Sort: Week');

      await capturePageLoad(
        page,
        testInfo,
        'The sort chip reads Week after choosing Top and then Week.',
        sortButton
      );
    });
  });
});
