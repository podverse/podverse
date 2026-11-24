import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_BOOST_EPISODE_CHANNEL_ID_TEXT,
  E2E_BOOST_EPISODE_CHANNEL_TITLE,
  E2E_BOOST_EPISODE_ITEM_ID_TEXT,
  E2E_BOOST_EPISODE_ITEM_TITLE,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_CHANNEL_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

// The section chip uses the same name. The header control carries it as aria-label.
const headerBoostButton = (page: Page): Locator =>
  page
    .getByRole('button', { name: 'Boost', exact: true })
    .and(page.locator('[aria-label="Boost"]'));

test.describe('Boost on channel and episode pages', () => {
  test('When a visitor opens the seeded podcast that has episode value rows and no channel value rows, the page has no Boost button.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`));
    const heading = page.getByRole('heading', { name: E2E_PODCAST_CHANNEL_TITLE, level: 1 });
    await expect(heading).toBeVisible();
    await expect(page.getByRole('button', { name: 'Boost', exact: true })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The seeded podcast page has a heading and no Boost button.',
      heading
    );
  });

  test('When a visitor opens the seeded boost podcast, Boost opens a dialog for that podcast.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/podcast/${E2E_BOOST_EPISODE_CHANNEL_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_BOOST_EPISODE_CHANNEL_ID_TEXT}`));
    const heading = page.getByRole('heading', {
      name: E2E_BOOST_EPISODE_CHANNEL_TITLE,
      level: 1,
    });
    await expect(heading).toBeVisible();
    const boostButton = headerBoostButton(page);
    await expect(boostButton).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The seeded boost podcast page shows a Boost button.',
      boostButton
    );

    const dialog = page.getByRole('dialog', { name: 'Boost' });
    await actionAndCapture(
      page,
      testInfo,
      'The boost dialog names the podcast.',
      async () => {
        await boostButton.click();
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(E2E_BOOST_EPISODE_CHANNEL_TITLE);
      },
      dialog
    );
  });

  test('When a visitor opens the seeded boost episode, Boost opens a dialog for that episode.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/episode/${E2E_BOOST_EPISODE_ITEM_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/episode/${E2E_BOOST_EPISODE_ITEM_ID_TEXT}`));
    const heading = page.getByRole('heading', { name: E2E_BOOST_EPISODE_ITEM_TITLE, level: 2 });
    await expect(heading).toBeVisible();
    const boostButton = headerBoostButton(page);
    await expect(boostButton).toBeVisible();

    const dialog = page.getByRole('dialog', { name: 'Boost' });
    await actionAndCapture(
      page,
      testInfo,
      'The boost dialog names the episode.',
      async () => {
        await boostButton.click();
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(E2E_BOOST_EPISODE_ITEM_TITLE);
      },
      dialog
    );
  });
});
