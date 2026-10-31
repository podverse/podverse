import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { E2E_TASTE_PROFILE_EMAIL, E2E_TASTE_PROFILE_PASSWORD } from './helpers/legalConsent';
import {
  E2E_DIRECTORY_ARTIST_TITLE,
  E2E_PODCAST_CHANNEL_TITLE,
  E2E_VIDEO_CHANNEL_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const SETTINGS_RECOMMENDATIONS_URL = '/settings?tab=recommendations';
const SETTINGS_RECOMMENDATIONS_URL_PATTERN = /\/settings\?tab=recommendations/;
const PROFILE_EMPTY_TEXT =
  'No shows yet. Shows appear here after you listen with Taste Profile on.';
const HIDDEN_EMPTY_TEXT = 'No hidden shows.';

async function loginViaApi(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: E2E_TASTE_PROFILE_EMAIL, password: E2E_TASTE_PROFILE_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function disclosureSummary(page: Page, name: string) {
  return page.locator('summary').filter({ hasText: name });
}

async function expectDisclosureCollapsed(page: Page, name: string): Promise<void> {
  const control = disclosureSummary(page, name);
  await expect(control).toBeVisible();
  await expect(control.locator('xpath=..')).toHaveJSProperty('open', false);
}

async function openRecommendationsSettings(page: Page, openSections = true): Promise<void> {
  await page.goto(SETTINGS_RECOMMENDATIONS_URL);
  await expect(page).toHaveURL(SETTINGS_RECOMMENDATIONS_URL_PATTERN);
  await expect(page.getByRole('button', { name: 'Recommendations', exact: true })).toBeVisible();
  if (openSections) {
    await disclosureSummary(page, 'Shows That Affect Recommendations').click();
    await disclosureSummary(page, 'Hidden From Taste Profile').click();
  }
}

function profileRegion(page: Page) {
  return page.getByRole('region', { name: 'Taste Profile', exact: true });
}

function hiddenRegion(page: Page) {
  return page.getByRole('region', { name: 'Hidden From Taste Profile', exact: true });
}

test.describe('Settings Taste Profile sections', () => {
  test.describe.configure({ mode: 'serial' });

  test('The Taste Profile lists start collapsed.', async ({ page }) => {
    await loginViaApi(page);
    await openRecommendationsSettings(page, false);

    await expectDisclosureCollapsed(page, 'Shows That Affect Recommendations');
    await expectDisclosureCollapsed(page, 'Hidden From Taste Profile');
  });

  test('When the Taste Profile request fails, the section shows an error and Try Again reloads it.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page);
    await page.route(
      (url) => url.pathname.endsWith('/account/taste-profile'),
      (route) => route.abort(),
      { times: 1 }
    );
    await openRecommendationsSettings(page);

    const profile = profileRegion(page);
    const loadError = profile.getByRole('alert');
    await expect(loadError).toHaveText('Could not load your Taste Profile. Please try again.');

    await capturePageLoad(
      page,
      testInfo,
      'A failed Taste Profile request shows an error with a Try Again button.',
      loadError
    );

    await actionAndCapture(
      page,
      testInfo,
      'Try Again reloads the Taste Profile and lists its shows.',
      async () => {
        await profile.getByRole('button', { name: 'Try Again' }).click();
        await expect(profile.getByText(E2E_PODCAST_CHANNEL_TITLE)).toBeVisible();
        await expect(profile.getByRole('alert')).toHaveCount(0);
      },
      profile
    );
  });

  test('When an account has a Taste Profile, Settings lists its shows newest first and its hidden shows.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page);
    await openRecommendationsSettings(page);

    const profile = profileRegion(page);
    const hidden = hiddenRegion(page);
    const profileRows = profile.getByRole('listitem');

    await expect(profileRows.nth(0)).toContainText(E2E_PODCAST_CHANNEL_TITLE);
    await expect(profileRows.nth(0)).toContainText('Last Listened:');
    await expect(profileRows.nth(1)).toContainText(E2E_VIDEO_CHANNEL_TITLE);
    await expect(hidden.getByRole('listitem').nth(0)).toContainText(E2E_DIRECTORY_ARTIST_TITLE);
    await expect(hidden.getByRole('listitem').nth(0)).toContainText('Hidden:');
    await expect(profile.getByRole('button', { name: 'Load More' })).toHaveCount(0);
    await expect(hidden.getByRole('button', { name: 'Load More' })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The Taste Profile lists the most recently listened show first.',
      profile
    );
    await capturePageLoad(
      page,
      testInfo,
      'Hidden From Taste Profile lists the hidden show with the date it was hidden.',
      hidden
    );
  });

  test('The Taste Profile section holds the switch and the summary under a single Taste Profile heading.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page);
    await openRecommendationsSettings(page);

    const profile = profileRegion(page);
    const tasteProfileSwitch = profile.getByRole('switch', { name: 'Taste Profile' });
    await expect(tasteProfileSwitch).toBeVisible();
    await expect(tasteProfileSwitch).toBeChecked();
    await expect(
      profile.getByText('tracks your listens to build your Taste Profile')
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Taste Profile', exact: true })).toHaveCount(1);

    await capturePageLoad(
      page,
      testInfo,
      'The Taste Profile section shows the switch and a summary of what it records.',
      tasteProfileSwitch
    );
  });

  test('Removing a show moves it to Hidden From Taste Profile.', async ({ page }, testInfo) => {
    await loginViaApi(page);
    await openRecommendationsSettings(page);

    const profile = profileRegion(page);
    const hidden = hiddenRegion(page);
    await expect(profile.getByText(E2E_PODCAST_CHANNEL_TITLE)).toBeVisible();

    await actionAndCapture(
      page,
      testInfo,
      'Remove takes the show off the Taste Profile and adds it to the hidden list.',
      async () => {
        await profile
          .getByRole('button', {
            name: `Remove ${E2E_PODCAST_CHANNEL_TITLE} From Taste Profile`,
          })
          .click();
        await expect(profile.getByText(E2E_PODCAST_CHANNEL_TITLE)).toHaveCount(0);
        await expect(hidden.getByText(E2E_PODCAST_CHANNEL_TITLE)).toBeVisible();
      },
      hidden
    );
  });

  test('Unhide asks first, and Only Remove From Hidden List takes the show off both lists.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page);
    await openRecommendationsSettings(page);

    const profile = profileRegion(page);
    const hidden = hiddenRegion(page);
    const dialog = page.getByRole('dialog', { name: 'Unhide Show' });

    await actionAndCapture(
      page,
      testInfo,
      'Unhide opens a dialog that asks whether to add the show back.',
      async () => {
        await hidden.getByRole('button', { name: `Unhide ${E2E_DIRECTORY_ARTIST_TITLE}` }).click();
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
        await expect(
          dialog.getByRole('button', { name: 'Only Remove From Hidden List', exact: true })
        ).toBeVisible();
        await expect(
          dialog.getByRole('button', { name: 'Add to Taste Profile', exact: true })
        ).toBeVisible();
      },
      dialog
    );

    await actionAndCapture(
      page,
      testInfo,
      'Only Remove From Hidden List leaves the show on neither list.',
      async () => {
        await dialog
          .getByRole('button', { name: 'Only Remove From Hidden List', exact: true })
          .click();
        await expect(dialog).toBeHidden();
        await expect(hidden.getByText(E2E_DIRECTORY_ARTIST_TITLE)).toHaveCount(0);
        await expect(profile.getByText(E2E_DIRECTORY_ARTIST_TITLE)).toHaveCount(0);
      },
      hidden
    );
  });

  test('Add to Taste Profile puts the show back at the top with no listens yet.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page);
    await openRecommendationsSettings(page);

    const profile = profileRegion(page);
    const hidden = hiddenRegion(page);
    const dialog = page.getByRole('dialog', { name: 'Unhide Show' });

    await actionAndCapture(
      page,
      testInfo,
      'Add to Taste Profile moves the show to the top of the Taste Profile.',
      async () => {
        await hidden.getByRole('button', { name: `Unhide ${E2E_PODCAST_CHANNEL_TITLE}` }).click();
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Add to Taste Profile', exact: true }).click();
        await expect(dialog).toBeHidden();
        const firstRow = profile.getByRole('listitem').nth(0);
        await expect(firstRow).toContainText(E2E_PODCAST_CHANNEL_TITLE);
        await expect(firstRow).toContainText('Added back. No listens since.');
        await expect(hidden.getByText(HIDDEN_EMPTY_TEXT)).toBeVisible();
      },
      profile
    );
  });

  test('Turning Taste Profile off asks first and then empties both lists.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page);
    await openRecommendationsSettings(page);

    const profile = profileRegion(page);
    const hidden = hiddenRegion(page);
    const tasteProfileSwitch = profile.getByRole('switch', { name: 'Taste Profile' });
    const optOutDialog = page.getByRole('dialog', { name: 'Turn Off Taste Profile?' });
    await expect(profile.getByText(E2E_PODCAST_CHANNEL_TITLE)).toBeVisible();

    await actionAndCapture(
      page,
      testInfo,
      'Turning off Taste Profile asks before deleting listening data.',
      async () => {
        await tasteProfileSwitch.click();
        await expect(optOutDialog).toBeVisible();
      },
      optOutDialog
    );

    await actionAndCapture(
      page,
      testInfo,
      'Turn Off and Delete empties the Taste Profile and the hidden list.',
      async () => {
        await optOutDialog.getByRole('button', { name: 'Turn Off and Delete' }).click();
        await expect(tasteProfileSwitch).not.toBeChecked();
        await expect(profile.getByText(PROFILE_EMPTY_TEXT)).toBeVisible();
        await expect(hidden.getByText(HIDDEN_EMPTY_TEXT)).toBeVisible();
      },
      profile
    );
  });
});
