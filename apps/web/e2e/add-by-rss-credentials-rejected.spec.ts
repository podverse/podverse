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

const FEED_URL = buildE2eProtectedFeedUrl('credentials-rejected');
const WRONG_PASSWORD = 'not-the-password';
const REJECTED_MESSAGE = 'The feed rejected this username and password. Check them and try again.';

/**
 * A rejected username or password keeps the follow and sends the user to the credentials page.
 * The list keeps the feed in its needs-credentials section until a check succeeds.
 */
test.describe('Add by RSS with a rejected password', () => {
  test.afterEach(async ({ page }) => {
    await unfollowFeedOnServer(page, FEED_URL);
  });

  test('a rejected password leads to the credentials page, and the right one recovers the feed', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await loginSeedUser(page);
    const parse = await stubAddByRSSParse(page, [
      {
        status: 'failed',
        failureReason: 'credentials_rejected',
        credentialsState: 'sent',
        httpStatus: 401,
        authChallenge: 'basic',
      },
      { status: 'parsed', credentialsState: 'sent' },
    ]);

    await page.goto('/add-by-rss/add');

    await test.step('Adding the feed with a wrong password opens the credentials page', async () => {
      await page.getByRole('textbox', { name: 'RSS feed URL' }).fill(FEED_URL);
      await page.getByLabel('This feed requires username and password').check();
      await page
        .getByRole('textbox', { name: 'Username', exact: true })
        .fill(E2E_BASIC_AUTH_USERNAME);
      await page.getByLabel('Password', { exact: true }).fill(WRONG_PASSWORD);
      await page.getByRole('button', { name: 'Add feed' }).click();

      await expect(page).toHaveURL(/\/add-by-rss\/credentials\/[^/]+$/, { timeout: 20_000 });
      const rejectedAlert = page.getByRole('alert').filter({ hasText: REJECTED_MESSAGE });
      await expect(rejectedAlert).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Username', exact: true })).toHaveValue(
        E2E_BASIC_AUTH_USERNAME
      );

      await capturePageLoad(
        page,
        testInfo,
        'The credentials page explains that the feed rejected the password.',
        rejectedAlert
      );
    });

    const credentialsUrl = page.url();

    await test.step('The podcasts list shows the feed as rejected in the needs-credentials section', async () => {
      await page.goto('/add-by-rss/podcasts');
      const section = page.getByTestId('add-by-rss-needs-credentials-section');
      await expect(section).toBeVisible({ timeout: 15_000 });
      await expect(section.getByText('Username or password was rejected')).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The rejected feed is listed under Needs username and password.',
        section
      );
    });

    await test.step('Saving the right password from the credentials page parses the feed', async () => {
      await page.getByTestId('add-by-rss-needs-credentials-section').getByRole('link').click();
      await expect(page).toHaveURL(credentialsUrl);
      await page.getByLabel('Password', { exact: true }).fill(E2E_BASIC_AUTH_PASSWORD);
      await page.getByRole('button', { name: 'Save and check' }).click();

      await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/]+$/, { timeout: 20_000 });
      expect(parse.enqueueBodies[1]).toMatchObject({
        basic_auth_username: E2E_BASIC_AUTH_USERNAME,
        basic_auth_password: E2E_BASIC_AUTH_PASSWORD,
      });

      await capturePageLoad(
        page,
        testInfo,
        'After the right password the feed detail page opens.',
        page.locator('body')
      );
    });
  });
});
