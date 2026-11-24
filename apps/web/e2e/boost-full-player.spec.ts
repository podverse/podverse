import { expect, test } from '@playwright/test';

import {
  E2E_BOOST_EPISODE_ITEM_ID_TEXT,
  E2E_BOOST_EPISODE_ITEM_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Boost on the full player', () => {
  test('When a signed-out visitor plays the seeded boost episode, Boost is in the full player and absent from the bar.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/episode/${E2E_BOOST_EPISODE_ITEM_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/episode/${E2E_BOOST_EPISODE_ITEM_ID_TEXT}`));
    const heading = page.getByRole('heading', { name: E2E_BOOST_EPISODE_ITEM_TITLE, level: 2 });
    await expect(heading).toBeVisible();

    const episodeHeader = page.locator('header').filter({ has: heading });
    await episodeHeader.getByRole('button', { name: 'Play', exact: true }).click();

    const barTitle = page.getByTestId('media-player-bar-title-desktop');
    await expect(barTitle).toBeVisible();
    await expect(barTitle).toContainText(E2E_BOOST_EPISODE_ITEM_TITLE);
    await expect(
      page.locator('#media-player').getByTestId('media-player-boost-button')
    ).toHaveCount(0);

    await barTitle.locator('xpath=ancestor::button[1]').click();

    const playerDialog = page.getByRole('dialog', { name: 'Fullscreen Media Player' });
    await expect(playerDialog).toBeVisible();
    const boostButton = playerDialog
      .getByTestId('media-player-boost-button')
      .and(playerDialog.getByRole('button', { name: 'Boost', exact: true }));
    await expect(boostButton).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The full player shows Boost for the episode that is playing.',
      boostButton
    );

    const boostDialog = page.getByRole('dialog', { name: 'Boost' });
    await actionAndCapture(
      page,
      testInfo,
      'The boost dialog names the episode that is playing.',
      async () => {
        await boostButton.click();
        await expect(boostDialog).toBeVisible();
        await expect(boostDialog).toContainText(E2E_BOOST_EPISODE_ITEM_TITLE);
      },
      boostDialog
    );
  });
});
