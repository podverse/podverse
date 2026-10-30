import { expect, test } from '@playwright/test';

import {
  E2E_PODROLL_STUB_ITEM_TITLE,
  E2E_PODROLL_STUB_PODCAST_INDEX_ID,
  E2E_PODROLL_STUB_TITLE,
  E2E_PODROLL_UNKNOWN_TITLE,
  E2E_REMOTE_ITEM_CHANNEL_ID_TEXT,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Podroll stub rows', () => {
  // The sidebar podroll is the desktop layout. The Podroll chip is hidden at 1200px and up.
  test.use({ viewport: { width: 1280, height: 720 } });

  test('When a visitor opens the seeded podcast, the podroll lists the stubbed show above its episode, omits the unknown show, and the episode opens the show page on Podcast Index.', async ({
    page,
  }, testInfo) => {
    const response = await page.goto(`/podcast/${E2E_REMOTE_ITEM_CHANNEL_ID_TEXT}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_REMOTE_ITEM_CHANNEL_ID_TEXT}$`));

    const podroll = page.getByTestId('channel-podroll');
    // The episode link's text includes the show title, so the show link is the one without it.
    const showLink = podroll
      .getByRole('link', { name: E2E_PODROLL_STUB_TITLE })
      .filter({ hasNotText: E2E_PODROLL_STUB_ITEM_TITLE });
    const episodeLink = podroll.getByRole('link', { name: E2E_PODROLL_STUB_ITEM_TITLE });
    const stubFeedHref = new RegExp(`/podcast-index/feed/${E2E_PODROLL_STUB_PODCAST_INDEX_ID}$`);

    await expect(showLink).toBeVisible();
    await expect(showLink).toHaveAttribute('href', stubFeedHref);
    await expect(episodeLink).toBeVisible();
    await expect(episodeLink).toHaveAttribute('href', stubFeedHref);
    await expect(episodeLink).toContainText(E2E_PODROLL_STUB_TITLE);
    await expect(episodeLink).toContainText('1:02:03');

    const showBox = await showLink.boundingBox();
    const episodeBox = await episodeLink.boundingBox();
    if (showBox === null || episodeBox === null) {
      throw new Error('The podroll stub show and episode links must both be visible.');
    }
    expect(showBox.y).toBeLessThan(episodeBox.y);

    await expect(page.getByText(E2E_PODROLL_UNKNOWN_TITLE)).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The podcast podroll lists the stubbed show above its episode.',
      episodeLink
    );

    const previewHeading = page.getByRole('heading', {
      name: E2E_PODROLL_STUB_TITLE,
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
});
