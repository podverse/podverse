import { expect, test } from '@playwright/test';

import {
  buildE2eProtectedFeedUrl,
  followFeedOnServer,
  loginSeedUser,
  readNeedsCredentialsFeedIdText,
  unfollowFeedOnServer,
} from './helpers/addByRSSCredentials';
import { capturePageLoad } from './helpers/stepScreenshots';

const FEED_URL = buildE2eProtectedFeedUrl('credentials-partial-row');
const FEED_TITLE = 'E2E protected feed from another device';

/**
 * Credentials never leave the device they were entered on. A protected feed followed elsewhere
 * reaches this browser flagged but without credentials, so the list asks for them here.
 */
test.describe('Add by RSS protected feed followed on another device', () => {
  test.afterEach(async ({ page }) => {
    await unfollowFeedOnServer(page, FEED_URL);
  });

  test('the feed is listed under needs username and password and opens the credentials page', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);
    await loginSeedUser(page);
    await followFeedOnServer(page, {
      feedUrl: FEED_URL,
      title: FEED_TITLE,
      requiresCredentials: true,
    });

    await page.goto('/add-by-rss/podcasts');

    let idText = '';
    await test.step('The podcasts list shows the feed in the needs-credentials section', async () => {
      idText = await readNeedsCredentialsFeedIdText(page, FEED_TITLE);
      const section = page.getByTestId('add-by-rss-needs-credentials-section');
      await expect(
        section.getByRole('heading', { name: 'Needs username and password' })
      ).toBeVisible();
      await expect(section.getByText('Enter username and password')).toBeVisible();
      await expect(page.locator(`a[href$="/add-by-rss/podcast/${idText}"]`)).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'The feed followed on another device asks for its username and password.',
        section
      );
    });

    await test.step('The row opens the credentials page for that feed', async () => {
      await page
        .getByTestId('add-by-rss-needs-credentials-section')
        .getByRole('link', { name: new RegExp(FEED_TITLE) })
        .click();
      await expect(page).toHaveURL(new RegExp(`/add-by-rss/credentials/${idText}$`));
      await expect(page.getByRole('heading', { name: FEED_TITLE })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Username', exact: true })).toHaveValue('');
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(
        page.getByText('On the web, audio and video from this feed play without your username')
      ).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The credentials page asks for the username and password and explains web media limits.',
        page.getByRole('heading', { name: FEED_TITLE })
      );
    });
  });
});
