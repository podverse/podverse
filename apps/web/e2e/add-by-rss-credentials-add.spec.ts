import type { Request } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  buildE2eProtectedFeedUrl,
  E2E_BASIC_AUTH_PASSWORD,
  E2E_BASIC_AUTH_USERNAME,
  loginSeedUser,
  stubAddByRSSParse,
  unfollowFeedOnServer,
} from './helpers/addByRSSCredentials';
import { capturePageLoad } from './helpers/stepScreenshots';

const FEED_URL = buildE2eProtectedFeedUrl('credentials-add');

/**
 * Adding a password-protected feed keeps the username and password on this browser. The follow
 * request only flags the feed; the credentials travel in the parse request body alone.
 */
test.describe('Add by RSS with a username and password', () => {
  test.afterEach(async ({ page }) => {
    await unfollowFeedOnServer(page, FEED_URL);
  });

  test('the feed is added, parsed with the device credentials, and listed as ready', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);
    await loginSeedUser(page);
    const parse = await stubAddByRSSParse(page, [{ status: 'parsed', credentialsState: 'sent' }]);
    const followBodies: unknown[] = [];
    page.on('request', (request: Request) => {
      if (
        request.method() === 'POST' &&
        request.url().endsWith('/account/follow/add-by-rss-channel')
      ) {
        followBodies.push(request.postDataJSON());
      }
    });

    await page.goto('/add-by-rss/add');

    await test.step('The add form accepts a feed URL with a username and password', async () => {
      await page.getByRole('textbox', { name: 'RSS feed URL' }).fill(FEED_URL);
      await page.getByLabel('This feed requires username and password').check();
      await page
        .getByRole('textbox', { name: 'Username', exact: true })
        .fill(E2E_BASIC_AUTH_USERNAME);
      await page.getByLabel('Password', { exact: true }).fill(E2E_BASIC_AUTH_PASSWORD);

      await capturePageLoad(
        page,
        testInfo,
        'The add form has the feed URL, username, and password filled in.',
        page.getByRole('textbox', { name: 'RSS feed URL' })
      );
    });

    let idText = '';
    await test.step('Adding the feed opens its detail page after the parse succeeds', async () => {
      await page.getByRole('button', { name: 'Add feed' }).click();
      await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/]+$/, { timeout: 20_000 });
      idText = new URL(page.url()).pathname.split('/').pop() ?? '';
      expect(idText).not.toBe('');

      await capturePageLoad(
        page,
        testInfo,
        'After a successful parse the feed detail page opens.',
        page.locator('body')
      );
    });

    await test.step('Credentials go in the parse request only, never the follow request', async () => {
      expect(followBodies).toHaveLength(1);
      expect(followBodies[0]).toMatchObject({ requires_credentials: true });
      expect(JSON.stringify(followBodies[0])).not.toContain(E2E_BASIC_AUTH_PASSWORD);

      expect(parse.enqueueBodies[0]).toMatchObject({
        basic_auth_username: E2E_BASIC_AUTH_USERNAME,
        basic_auth_password: E2E_BASIC_AUTH_PASSWORD,
      });
      expect(String(parse.enqueueBodies[0]?.['feed_url'])).not.toContain('@');
    });

    await test.step('The podcasts list shows the feed as ready, not as needing credentials', async () => {
      await page.goto('/add-by-rss/podcasts');
      const feedLink = page.locator(`a[href$="/add-by-rss/podcast/${idText}"]`).first();
      await expect(feedLink).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('add-by-rss-needs-credentials-section')).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'The protected feed is listed with the other podcasts.',
        feedLink
      );
    });
  });
});
