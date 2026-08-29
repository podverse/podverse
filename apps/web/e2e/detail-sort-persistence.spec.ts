import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const SEEDED_PODCAST_URL = `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`;
const OTHER_PODCAST_URL = `/podcast/${EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT}`;

/**
 * The sort control is the only button in the list header labelled with a sort name, so the label
 * doubles as the assertion: whatever it reads is the sort the page is showing.
 */
const sortButton = (page: Page) =>
  page.getByRole('main').getByRole('button', { name: /^(Recent|Oldest|Top)$/ });

const sortOption = (page: Page, label: string) =>
  page.getByRole('menuitem', { name: label, exact: true });

/**
 * The first episode row's link identifies which end of the feed is on top: the seeded channel's
 * items are one hour apart, newest first is the resume fixture and oldest first is the chaptered
 * one.
 */
const firstEpisodeLink = (page: Page) =>
  page.getByRole('main').locator('a[href^="/episode/"]').first();

async function chooseSort(page: Page, label: string): Promise<void> {
  await sortButton(page).click();
  await sortOption(page, label).click();
  await expect(sortButton(page)).toHaveText(label);
}

test.describe('Detail page sort memory', () => {
  test('remembers a sort per podcast and serves it from the server on the next visit', async ({
    browser,
    page,
  }, testInfo) => {
    await test.step('A podcast opens newest first', async () => {
      await page.goto(SEEDED_PODCAST_URL);

      await expect(sortButton(page)).toHaveText('Recent');
      await expect(firstEpisodeLink(page)).toHaveAttribute(
        'href',
        `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`
      );
    });

    await test.step('Choosing Oldest turns the list around', async () => {
      await chooseSort(page, 'Oldest');

      await expect(firstEpisodeLink(page)).toHaveAttribute(
        'href',
        `/episode/${E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT}`
      );
      await expect(page).toHaveURL(/sort=oldest/);

      await captureVerifiedElement(
        page,
        testInfo,
        sortButton(page),
        'The chosen sort is the one the list is showing.'
      );
    });

    await test.step('A different podcast keeps its own sort', async () => {
      await page.goto(OTHER_PODCAST_URL);

      await expect(sortButton(page)).toHaveText('Recent');

      await capturePageLoad(page, testInfo, 'A sort chosen on one podcast does not follow you.');
    });

    await test.step('Returning with a plain URL brings the remembered sort back', async () => {
      await page.goto(SEEDED_PODCAST_URL);

      await expect(sortButton(page)).toHaveText('Oldest');
      await expect(firstEpisodeLink(page)).toHaveAttribute(
        'href',
        `/episode/${E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT}`
      );
    });

    await test.step('The server already knows the sort before any script runs', async () => {
      // Scripting off proves the order came out of the server render rather than a second pass on
      // the client, which is the whole reason the preference lives in a cookie.
      const scriptlessContext = await browser.newContext({ javaScriptEnabled: false });
      await scriptlessContext.addCookies(await page.context().cookies());
      const scriptlessPage = await scriptlessContext.newPage();

      try {
        await scriptlessPage.goto(SEEDED_PODCAST_URL);

        await expect(sortButton(scriptlessPage)).toHaveText('Oldest');
        await expect(firstEpisodeLink(scriptlessPage)).toHaveAttribute(
          'href',
          `/episode/${E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT}`
        );

        await capturePageLoad(
          scriptlessPage,
          testInfo,
          'With scripting off, the server-rendered page is already sorted oldest first.'
        );
      } finally {
        await scriptlessContext.close();
      }
    });

    await test.step('A sort in the URL wins and becomes the new memory', async () => {
      await page.goto(`${SEEDED_PODCAST_URL}?sort=recent`);

      await expect(sortButton(page)).toHaveText('Recent');
      await expect(firstEpisodeLink(page)).toHaveAttribute(
        'href',
        `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`
      );

      await page.goto(SEEDED_PODCAST_URL);

      await expect(sortButton(page)).toHaveText('Recent');
      await expect(firstEpisodeLink(page)).toHaveAttribute(
        'href',
        `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`
      );
    });
  });
});
