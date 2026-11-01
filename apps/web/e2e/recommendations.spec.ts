import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { E2E_TASTE_PROFILE_EMAIL, E2E_TASTE_PROFILE_PASSWORD } from './helpers/legalConsent';
import { E2E_HLS_CHANNEL_ID_TEXT, E2E_HLS_CHANNEL_TITLE } from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const API_BASE = 'http://localhost:4030/api/v2';
const CHECK_BACK_TEXT =
  'Recommendations update as you subscribe to content and as you listen. A show other people have not listened to yet can stay empty until the nightly update.';

async function loginViaApi(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: E2E_TASTE_PROFILE_EMAIL, password: E2E_TASTE_PROFILE_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

test.describe('Recommendations page', () => {
  test('The sidebar lists Recommendations after Browse, and a signed-out visit asks for login.', async ({
    page,
  }, testInfo) => {
    await page.goto('/browse');
    const nav = page.getByRole('navigation');
    const links = nav.getByRole('link');
    const names = await links.allInnerTexts();
    const browseIndex = names.findIndex((name) => name.trim() === 'Browse');
    const recommendationsIndex = names.findIndex((name) => name.trim() === 'Recommendations');
    expect(browseIndex).toBeGreaterThanOrEqual(0);
    expect(recommendationsIndex).toBe(browseIndex + 1);

    await page.goto('/recommendations');
    const chrome = page.locator('[data-appearance="web"]');
    await expect(chrome.getByRole('heading', { level: 1, name: 'Recommendations' })).toBeVisible();
    const layoutButton = page.getByTestId('view-selector-button');
    await expect(layoutButton).toBeVisible();
    await expect(page.getByTestId('media-list-sort-button')).toHaveCount(0);
    await layoutButton.click();
    await expect(page.getByRole('menuitemradio', { name: 'List View' })).toBeVisible();
    await expect(page.getByRole('menuitemradio', { name: 'Grid View' })).toBeVisible();
    await page.keyboard.press('Escape');
    const loginPrompt = page.getByText('Log in to use this feature.');
    await expect(loginPrompt).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'A signed-out Recommendations visit asks the listener to log in.',
      loginPrompt
    );
  });

  test('Edit opens Settings, Hide removes a mocked suggestion, and Unhide clears Hidden Channels.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page);
    await page.goto('/recommendations');

    const editButton = page.getByRole('button', { name: 'Edit', exact: true });
    await expect(editButton).toBeVisible();
    const actions = page.getByTestId('recommendations-list-actions');
    const chips = page.getByTestId('media-list-chips');

    await page.setViewportSize({ width: 1600, height: 900 });
    const wideActionsBox = await actions.boundingBox();
    const wideChipsBox = await chips.boundingBox();
    const wideEditBox = await editButton.boundingBox();
    expect(wideActionsBox, 'actions row is in the layout').not.toBeNull();
    expect(wideChipsBox, 'chip row is in the layout').not.toBeNull();
    expect(wideEditBox, 'Edit is in the layout').not.toBeNull();
    if (wideActionsBox !== null && wideChipsBox !== null && wideEditBox !== null) {
      expect(wideActionsBox.x).toBeGreaterThanOrEqual(wideChipsBox.x + wideChipsBox.width - 1);
      expect(wideActionsBox.y).toBeLessThan(wideChipsBox.y + wideChipsBox.height);
      expect(wideChipsBox.y).toBeLessThan(wideActionsBox.y + wideActionsBox.height);
      const wideChipFace = await chips
        .getByRole('button', { name: 'Podcasts', exact: true })
        .boundingBox();
      expect(wideChipFace, 'Podcasts chip is in the layout').not.toBeNull();
      if (wideChipFace !== null) {
        const editMid = wideEditBox.y + wideEditBox.height / 2;
        const chipMid = wideChipFace.y + wideChipFace.height / 2;
        expect(Math.abs(editMid - chipMid)).toBeLessThanOrEqual(1);
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const narrowActionsBox = await actions.boundingBox();
    const narrowChipsBox = await chips.boundingBox();
    expect(narrowActionsBox, 'actions row is in the layout').not.toBeNull();
    expect(narrowChipsBox, 'chip row is in the layout').not.toBeNull();
    if (narrowActionsBox !== null && narrowChipsBox !== null) {
      expect(narrowActionsBox.y + narrowActionsBox.height).toBeLessThanOrEqual(narrowChipsBox.y);
      expect(Math.abs(narrowActionsBox.x - narrowChipsBox.x)).toBeLessThanOrEqual(4);
    }

    await page.setViewportSize({ width: 1280, height: 720 });

    await actionAndCapture(page, testInfo, 'Edit opens Taste Profile settings.', async () => {
      await editButton.click();
      await expect(page).toHaveURL(/\/settings\?tab=recommendations/);
    });

    await page.route(
      (url) =>
        url.pathname.endsWith('/account/recommendations') &&
        !url.pathname.includes('/hidden') &&
        !url.pathname.includes('/hide') &&
        !url.pathname.includes('/unhide'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                items: [
                  {
                    strength: 5,
                    channel: {
                      id_text: E2E_HLS_CHANNEL_ID_TEXT,
                      title: E2E_HLS_CHANNEL_TITLE,
                      medium_id: 1,
                      channel_images: [],
                    },
                  },
                ],
              },
            }),
          });
          return;
        }
        await route.continue();
      }
    );

    await page.goto('/recommendations');
    const suggested = page.getByRole('heading', { name: E2E_HLS_CHANNEL_TITLE });
    await expect(suggested).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'Recommendations lists a suggestion the listener can hide.',
      suggested
    );

    await actionAndCapture(
      page,
      testInfo,
      'Hide removes the suggestion from For You.',
      async () => {
        await page.getByRole('button', { name: 'More Options' }).first().click();
        await page.getByRole('menuitem', { name: 'Hide' }).click();
        await expect(page.getByRole('heading', { name: E2E_HLS_CHANNEL_TITLE })).toHaveCount(0);
      }
    );

    const hideResponse = await page.request.post(`${API_BASE}/account/channel-hidden/hide`, {
      data: { channel_id_text: E2E_HLS_CHANNEL_ID_TEXT },
    });
    expect(hideResponse.ok(), await hideResponse.text()).toBeTruthy();

    await page.goto('/settings?tab=recommendations');
    await page.locator('summary').filter({ hasText: 'Hidden Channels' }).click();
    const hiddenRegion = page.getByRole('region', { name: 'Hidden Channels', exact: true });
    await expect(hiddenRegion.getByText(E2E_HLS_CHANNEL_TITLE)).toBeVisible();

    await actionAndCapture(
      page,
      testInfo,
      'Unhide clears the show from Hidden Channels.',
      async () => {
        await hiddenRegion.getByRole('button', { name: `Unhide ${E2E_HLS_CHANNEL_TITLE}` }).click();
        await expect(hiddenRegion.getByText(E2E_HLS_CHANNEL_TITLE)).toHaveCount(0);
      },
      hiddenRegion
    );
  });

  test('A signed-in listener with Taste Profile on and no remaining rows sees the live-update empty copy.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page);
    await page.route(
      (url) =>
        url.pathname.endsWith('/account/recommendations') &&
        !url.pathname.includes('/hidden') &&
        !url.pathname.includes('/hide') &&
        !url.pathname.includes('/unhide'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { items: [] } }),
          });
          return;
        }
        await route.continue();
      }
    );
    await page.goto('/recommendations');
    const checkBack = page.getByText(CHECK_BACK_TEXT);
    await expect(checkBack).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'Recommendations with nothing computed yet explains live updates.',
      checkBack
    );
  });
});
