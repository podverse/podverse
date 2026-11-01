import { expect, test } from '@playwright/test';

import {
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_CHANNEL_TITLE,
  E2E_PODCAST_ITEM_LONG_NOTES_ID_TEXT,
  E2E_PODCAST_ITEM_LONG_NOTES_LINK_URL,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const LONG_NOTES_SUMMARY_URL = `/episode/${E2E_PODCAST_ITEM_LONG_NOTES_ID_TEXT}?type=summary`;
const SHORT_NOTES_SUMMARY_URL = `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}?type=summary`;
const PODCAST_URL = `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`;

// The row snippet is the stored plain-text preview, which begins with the heading's text.
const LONG_NOTES_PREVIEW_START = 'About This Episode This deterministic E2E episode carries';

test.describe('Episode show notes', () => {
  test('shortened show notes keep their markup and link to the full notes', async ({
    page,
  }, testInfo) => {
    await page.goto(LONG_NOTES_SUMMARY_URL);
    await expect(page).toHaveURL(
      new RegExp(`/episode/${E2E_PODCAST_ITEM_LONG_NOTES_ID_TEXT}.*type=summary`)
    );

    const main = page.getByRole('main');
    const heading = main.getByRole('heading', { name: 'About This Episode' });
    await expect(heading).toBeVisible();
    await captureVerifiedElement(page, testInfo, heading, 'Summary shows the seeded heading');

    const publishTime = main.getByText(/\d{1,2}:\d{2}\s*[AP]M/).first();
    await expect(publishTime).toBeVisible();
    await captureVerifiedElement(
      page,
      testInfo,
      publishTime,
      'Episode header includes the publish time'
    );

    const linkListItem = main.getByRole('listitem').filter({ hasText: 'Episode Transcript' });
    await expect(linkListItem).toBeVisible();
    await captureVerifiedElement(page, testInfo, linkListItem, 'Summary shows the seeded list');

    const fullNotesLink = main.getByRole('link', { name: 'Read Full Show Notes' });
    await expect(fullNotesLink).toBeVisible();
    await expect(fullNotesLink).toHaveAttribute('href', E2E_PODCAST_ITEM_LONG_NOTES_LINK_URL);
    await expect(fullNotesLink).toHaveAttribute('target', '_blank');
    await captureVerifiedElement(
      page,
      testInfo,
      fullNotesLink,
      'Read Full Show Notes links to the episode website'
    );
    await capturePageLoad(page, testInfo, 'Episode Summary with shortened show notes');
  });

  test('the podcast episode row shows the stored preview', async ({ page }, testInfo) => {
    await page.goto(PODCAST_URL);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`));

    const rowPreview = page.getByRole('main').getByText(LONG_NOTES_PREVIEW_START).first();
    await expect(rowPreview).toBeVisible();
    const episodeLink = page
      .getByRole('main')
      .locator(`a[href*="/episode/${E2E_PODCAST_ITEM_LONG_NOTES_ID_TEXT}"]`)
      .first();
    const episodeHeading = episodeLink.getByRole('heading').first();
    await expect(episodeHeading).toBeVisible();
    await expect(
      episodeHeading
        .locator('xpath=preceding-sibling::*')
        .filter({ hasText: E2E_PODCAST_CHANNEL_TITLE })
    ).toHaveCount(0);
    await captureVerifiedElement(
      page,
      testInfo,
      rowPreview,
      'Episode row shows the opening words of the preview'
    );
    await capturePageLoad(page, testInfo, 'Podcast episodes with a long-notes row');
  });

  test('show notes that were not shortened show no notice', async ({ page }, testInfo) => {
    await page.goto(SHORT_NOTES_SUMMARY_URL);
    await expect(page).toHaveURL(
      new RegExp(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}.*type=summary`)
    );

    const main = page.getByRole('main');
    const summaryText = main.getByText('deterministic E2E media-player fixture.');
    await expect(summaryText).toBeVisible();
    await expect(main.getByRole('link', { name: 'Read Full Show Notes' })).toHaveCount(0);
    await expect(main.getByText('These show notes were shortened.')).toHaveCount(0);
    await captureVerifiedElement(
      page,
      testInfo,
      summaryText,
      'Summary shows full notes with no shortened notice'
    );
    await capturePageLoad(page, testInfo, 'Episode Summary with full show notes');
  });
});
