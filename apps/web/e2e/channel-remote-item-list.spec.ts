import { expect, test } from '@playwright/test';

import {
  E2E_CHANNEL_REMOTE_STUB_AUTHOR,
  E2E_CHANNEL_REMOTE_STUB_ITEM_TITLE,
  E2E_CHANNEL_REMOTE_STUB_PODCAST_INDEX_ID,
  E2E_CHANNEL_REMOTE_STUB_TITLE,
  E2E_CHANNEL_REMOTE_UNKNOWN_TITLE,
  E2E_REMOTE_ITEM_ALBUM_ID_TEXT,
  E2E_REMOTE_ITEM_CHANNEL_ID_TEXT,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Channel remote item list', () => {
  // The sidebar section is the desktop layout. The Remote Items chip is hidden at 1200px and up.
  test.use({ viewport: { width: 1280, height: 720 } });

  const stubFeedHref = new RegExp(
    `/podcast-index/feed/${E2E_CHANNEL_REMOTE_STUB_PODCAST_INDEX_ID}$`
  );

  test("When a visitor opens the remote-item seed podcast, the Remote Items section lists the stubbed show and the stubbed episode, hides the unknown reference, and the episode opens the show's Podcast Index page.", async ({
    page,
  }, testInfo) => {
    const response = await page.goto(`/podcast/${E2E_REMOTE_ITEM_CHANNEL_ID_TEXT}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_REMOTE_ITEM_CHANNEL_ID_TEXT}$`));

    const remoteItems = page.getByTestId('channel-remote-items');
    // The episode link's text includes the show title, so the show link is the one without it.
    const showLink = remoteItems
      .getByRole('link', { name: E2E_CHANNEL_REMOTE_STUB_TITLE })
      .filter({ hasNotText: E2E_CHANNEL_REMOTE_STUB_ITEM_TITLE });
    const episodeLink = remoteItems.getByRole('link', { name: E2E_CHANNEL_REMOTE_STUB_ITEM_TITLE });

    await expect(showLink).toBeVisible();
    await expect(showLink).toHaveAttribute('href', stubFeedHref);
    await expect(episodeLink).toBeVisible();
    await expect(episodeLink).toHaveAttribute('href', stubFeedHref);
    await expect(episodeLink).toContainText(E2E_CHANNEL_REMOTE_STUB_TITLE);
    await expect(episodeLink).toContainText('1:02:03');

    const showBox = await showLink.boundingBox();
    const episodeBox = await episodeLink.boundingBox();
    if (showBox === null || episodeBox === null) {
      throw new Error('The remote item stub show and episode links must both be visible.');
    }
    expect(showBox.y).toBeLessThan(episodeBox.y);

    await expect(page.getByText(E2E_CHANNEL_REMOTE_UNKNOWN_TITLE)).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The podcast Remote Items section lists the stubbed show above its episode.',
      episodeLink
    );

    const previewHeading = page.getByRole('heading', {
      name: E2E_CHANNEL_REMOTE_STUB_TITLE,
      exact: true,
    });
    await actionAndCapture(
      page,
      testInfo,
      'The stubbed episode opens the Podcast Index page for its show.',
      async () => {
        await episodeLink.click();
        await expect(page).toHaveURL(stubFeedHref);
        await expect(previewHeading).toBeVisible();
      },
      previewHeading
    );
  });

  test('When a visitor opens the remote-item seed album, the Remote Items section lists that show and its author, and does not list the episode.', async ({
    page,
  }, testInfo) => {
    const response = await page.goto(`/album/${E2E_REMOTE_ITEM_ALBUM_ID_TEXT}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/album/${E2E_REMOTE_ITEM_ALBUM_ID_TEXT}$`));

    const remoteItems = page.getByTestId('channel-remote-items');
    const showLink = remoteItems.getByRole('link', { name: E2E_CHANNEL_REMOTE_STUB_TITLE });

    await expect(showLink).toHaveCount(1);
    await expect(showLink).toBeVisible();
    await expect(showLink).toHaveAttribute('href', stubFeedHref);
    await expect(remoteItems.getByText(E2E_CHANNEL_REMOTE_STUB_AUTHOR)).toBeVisible();
    await expect(remoteItems.getByText(E2E_CHANNEL_REMOTE_STUB_ITEM_TITLE)).toHaveCount(0);
    await expect(remoteItems.getByText(E2E_CHANNEL_REMOTE_UNKNOWN_TITLE)).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The album Remote Items section lists the stubbed show and its author.',
      showLink
    );
  });
});
