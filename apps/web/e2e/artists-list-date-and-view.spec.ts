import { expect, test } from '@playwright/test';

import { formatDateAbbrev } from '@podverse/helpers';

import {
  E2E_DIRECTORY_ARTIST_LAST_PUB_DATE_ISO,
  E2E_DIRECTORY_ARTIST_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const ARTISTS_URL = '/artists';
const PODCASTS_URL = '/podcasts';
const DIRECTORY_ARTIST_DATE = formatDateAbbrev(E2E_DIRECTORY_ARTIST_LAST_PUB_DATE_ISO, 'en-US');

test.describe('Artists list date and view', () => {
  test('When a visitor opens Artists, they see the seeded last-updated date, and switching that list to rows leaves Podcasts on grid.', async ({
    page,
  }, testInfo) => {
    const artistTitle = page.getByRole('heading', {
      level: 3,
      name: E2E_DIRECTORY_ARTIST_TITLE,
    });
    const artistDate = page
      .getByTestId('artist-row-updated')
      .filter({ hasText: DIRECTORY_ARTIST_DATE });
    const layoutButton = page.getByRole('button', { name: 'Change layout view' });

    await test.step('The public Artists directory shows the seeded title and formatted date', async () => {
      await page.goto(ARTISTS_URL);
      await expect(page).toHaveURL(/\/artists\/?$/);
      await expect(page.getByRole('heading', { name: 'Artists', exact: true })).toBeVisible();
      await expect(artistTitle).toBeVisible();
      await expect(artistDate).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The directory artist row shows its last-updated date.',
        artistDate
      );
    });

    await actionAndCapture(
      page,
      testInfo,
      'Switching Artists to list view keeps the seeded date on the row.',
      async () => {
        await layoutButton.click();
        await page.getByRole('menuitem', { name: 'List view' }).click();
        await expect(artistTitle).toBeVisible();
        await expect(artistDate).toBeVisible();
        await expect(page).toHaveURL(/\/artists\/?$/);
      },
      artistDate
    );

    await actionAndCapture(
      page,
      testInfo,
      'Podcasts still opens in grid after Artists was switched to rows.',
      async () => {
        await page.goto(PODCASTS_URL);
        await expect(page).toHaveURL(/\/podcasts\/?$/);
        await expect(page.getByRole('heading', { name: 'Podcasts', exact: true })).toBeVisible();

        await layoutButton.click();
        await expect(page.getByRole('menuitem', { name: '✓ Grid view' })).toBeVisible();
      }
    );
  });
});
