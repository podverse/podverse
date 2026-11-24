import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  loginSeedUser,
  stubAddByRSSParse,
  stubAddByRSSParseAll,
  unfollowFeedOnServer,
} from './helpers/addByRSSCredentials';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const FEED_URL = 'https://e2e-seed-boostagram.example/podcast.xml';
const FEED_TITLE = 'E2E Boostagram Feed';
const EPISODE_TITLE = 'E2E Boostagram Episode';
const NODE_ADDRESS = '02000000000000000000000000000000000000000000000000000000000000ab';

const lightningValue = () => ({
  type: 'lightning',
  method: 'keysend',
  suggested: null,
  recipients: [
    {
      type: 'node',
      address: NODE_ADDRESS,
      split: 100,
      fee: false,
    },
  ],
});

const PARSED_FEED = {
  title: FEED_TITLE,
  guid: '6f1e2d3c-4b5a-4968-8a7b-6c5d4e3f2a10',
  link: 'https://e2e-seed-boostagram.example/',
  explicit: false,
  values: [lightningValue()],
  items: [
    {
      title: EPISODE_TITLE,
      guid: '7a1e2d3c-4b5a-4968-8a7b-6c5d4e3f2a11',
      duration: 60,
      explicit: false,
      enclosure: {
        url: 'http://localhost:2111/audio/audio-001.mp3',
        type: 'audio/mpeg',
        length: 0,
      },
      values: [lightningValue()],
    },
  ],
};

// The section chip uses the same name. The header control carries it as aria-label.
const headerBoostButton = (page: Page): Locator =>
  page
    .getByRole('button', { name: 'Boost', exact: true })
    .and(page.locator('[aria-label="Boost"]'));

test.describe('Add by RSS episode boost', () => {
  test.afterEach(async ({ page }) => {
    await unfollowFeedOnServer(page, FEED_URL);
  });

  test('When a member adds a feed that has channel and episode value rows, Boost on the podcast page names the feed and Boost on the episode page names the episode.', async ({
    page,
  }, testInfo) => {
    // Login plus the stubbed parse outlast the default budget.
    test.setTimeout(60_000);
    await stubAddByRSSParse(page, {
      feedUrl: FEED_URL,
      outcomes: [{ status: 'parsed', payload: PARSED_FEED }],
    });
    await stubAddByRSSParseAll(page);
    await loginSeedUser(page);

    await test.step('Adding the feed opens its podcast page with a Boost button.', async () => {
      await page.goto('/add-by-rss/add');
      await expect(page).toHaveURL(/\/add-by-rss\/add$/);
      await page.getByRole('textbox', { name: 'RSS Feed URL' }).fill(FEED_URL);
      await page.getByRole('button', { name: 'Add Feed', exact: true }).click();
      // The fixture parse finishes after Add Feed; the default assertion budget is too short.
      await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/]+$/, { timeout: 20_000 });
      const heading = page.getByRole('heading', { name: FEED_TITLE, level: 1 });
      await expect(heading).toBeVisible();
      const boostButton = headerBoostButton(page);
      await expect(boostButton).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Add by RSS podcast page shows a Boost button.',
        boostButton
      );
    });

    await test.step('Boost on the podcast page names the feed and not the episode.', async () => {
      const dialog = page.getByRole('dialog', { name: 'Boost' });
      await actionAndCapture(
        page,
        testInfo,
        'The boost dialog names the feed.',
        async () => {
          await headerBoostButton(page).click();
          await expect(dialog).toBeVisible();
          await expect(dialog).toContainText(FEED_TITLE);
          await expect(dialog).not.toContainText(EPISODE_TITLE);
        },
        dialog
      );
      await page.getByRole('button', { name: 'Close Modal', exact: true }).click();
      await expect(dialog).toBeHidden();
    });

    await test.step('Boost on the episode page names the episode.', async () => {
      const episodeLink = page.getByRole('link', { name: EPISODE_TITLE }).filter({
        has: page.getByRole('heading', { level: 3, name: EPISODE_TITLE }),
      });
      await expect(episodeLink).toBeVisible();
      await episodeLink.click();
      await expect(page).toHaveURL(/\/add-by-rss\/episode\//);
      const heading = page.getByRole('heading', { name: EPISODE_TITLE, level: 2 });
      await expect(heading).toBeVisible();

      const dialog = page.getByRole('dialog', { name: 'Boost' });
      await actionAndCapture(
        page,
        testInfo,
        'The boost dialog names the episode.',
        async () => {
          await headerBoostButton(page).click();
          await expect(dialog).toBeVisible();
          await expect(dialog).toContainText(EPISODE_TITLE);
        },
        dialog
      );
    });
  });
});
