import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_LIVESTREAM_CHANNEL_ID_TEXT,
  E2E_PODCAST_CHANNEL_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const SUBSCRIBED_PODCASTS_URL = '/podcasts?type=subscribed&sort=a_z';
const GLOBAL_PODCASTS_URL = '/podcasts?type=global&sort=recent';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

const filterInput = (page: Page) => page.getByLabel('Filter', { exact: true });

// Unseen badges are also announced as status regions, so the count is addressed directly rather
// than by role.
const resultsCount = (page: Page) => page.getByTestId('podcasts-filter-results-count');

const channelRow = (page: Page, idText: string) => page.locator(`a[href*="${idText}"]`);

/** Distinctive enough to tell the "nothing followed yet" state apart from "nothing matched". */
const NO_SUBSCRIPTIONS_TEXT = 'Your subscriptions will appear here.';

test.describe('Subscribed podcasts filter', () => {
  test('narrows the whole subscribed list by title and keeps the term in the URL', async ({
    page,
  }, testInfo) => {
    await loginSeedUser(page);

    const searchRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.includes('/search/')) {
        searchRequests.push(request.url());
      }
    });

    await test.step('The subscribed list arrives unfiltered', async () => {
      await page.goto(SUBSCRIBED_PODCASTS_URL);
      await expect(channelRow(page, E2E_PODCAST_CHANNEL_ID_TEXT).first()).toBeVisible();
      await expect(channelRow(page, E2E_LIVESTREAM_CHANNEL_ID_TEXT).first()).toBeVisible();
      await expect(filterInput(page)).toBeVisible();
    });

    await test.step('Typing a title narrows the list and reports how much is left', async () => {
      await filterInput(page).fill('livestream');

      await expect(channelRow(page, E2E_LIVESTREAM_CHANNEL_ID_TEXT).first()).toBeVisible();
      await expect(channelRow(page, E2E_PODCAST_CHANNEL_ID_TEXT)).toHaveCount(0);
      await expect(resultsCount(page)).toHaveText('Showing 1');

      await captureVerifiedElement(
        page,
        testInfo,
        channelRow(page, E2E_LIVESTREAM_CHANNEL_ID_TEXT).first(),
        'Filtering by title leaves only the matching subscription.'
      );
    });

    await test.step('The term reaches the URL and survives a reload', async () => {
      await expect(page).toHaveURL(/filter=livestream/);

      await page.reload();
      await expect(filterInput(page)).toHaveValue('livestream');
      await expect(channelRow(page, E2E_LIVESTREAM_CHANNEL_ID_TEXT).first()).toBeVisible();
      await expect(channelRow(page, E2E_PODCAST_CHANNEL_ID_TEXT)).toHaveCount(0);

      await capturePageLoad(page, testInfo, 'A filtered list reloads still filtered.');
    });

    await test.step('A term matching nothing reads as no matches, not as no subscriptions', async () => {
      await filterInput(page).fill('nothing matches this');

      await expect(page.getByText('No subscriptions match your filter.')).toBeVisible();
      await expect(page.getByText(NO_SUBSCRIPTIONS_TEXT)).toHaveCount(0);
      await expect(resultsCount(page)).toHaveText('Showing 0');

      await capturePageLoad(page, testInfo, 'An unmatched filter says so in its own words.');
    });

    await test.step('Clearing the term restores the list and the plain URL', async () => {
      await page.getByRole('button', { name: 'Clear' }).click();

      await expect(channelRow(page, E2E_PODCAST_CHANNEL_ID_TEXT).first()).toBeVisible();
      await expect(channelRow(page, E2E_LIVESTREAM_CHANNEL_ID_TEXT).first()).toBeVisible();
      await expect(page).not.toHaveURL(/filter=/);
    });

    await test.step('Nothing typed into the filter reached the search API', async () => {
      expect(searchRequests).toEqual([]);
    });

    await test.step('The filter belongs to the subscribed list alone', async () => {
      await page.goto(GLOBAL_PODCASTS_URL);
      await expect(filterInput(page)).toHaveCount(0);

      await capturePageLoad(page, testInfo, 'The global list carries no filter input.');
    });
  });

  test('finds a match that sits past the first page of subscriptions', async ({
    page,
  }, testInfo) => {
    await loginSeedUser(page);

    // Two short pages rather than one long one: the point under test is that filtering reads the
    // whole subscribed list, and a seeded account small enough to fit on a single page could not
    // tell a working filter apart from one that only ever narrowed what was already on screen.
    const firstPage = [
      { id: 901, id_text: 'e2eFilterPg1a', title: 'First Page Alpha' },
      { id: 902, id_text: 'e2eFilterPg1b', title: 'First Page Beta' },
    ];
    const secondPage = [{ id: 903, id_text: 'e2eFilterPg2a', title: 'Second Page Only Show' }];

    await page.route(
      (url) => url.pathname.endsWith('/channel/subscribed/az'),
      async (route, request) => {
        const requestedPage = new URL(request.url()).searchParams.get('page');
        const data = requestedPage === '2' ? secondPage : firstPage;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: data.map((channel) => ({
              ...channel,
              channel_images: [],
              channel_about: { last_pub_date: null },
            })),
            meta: { page: Number(requestedPage ?? 1), count: 3, limit: 2 },
          }),
        });
      }
    );

    await page.goto(SUBSCRIBED_PODCASTS_URL);
    await expect(filterInput(page)).toBeVisible();

    await filterInput(page).fill('second page');

    await expect(page.getByText('Second Page Only Show')).toBeVisible();
    await expect(resultsCount(page)).toHaveText('Showing 1');

    await captureVerifiedElement(
      page,
      testInfo,
      page.getByText('Second Page Only Show'),
      'A subscription on the second page is still found by the filter.'
    );
  });
});
