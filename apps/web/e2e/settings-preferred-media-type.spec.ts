import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const SELECTOR_ID = 'settings_preferred_media_type_selector';

function trigger(page: Page) {
  return page.locator(`#${SELECTOR_ID}`);
}

function menu(page: Page) {
  return page.locator(`#${SELECTOR_ID} + ul[role="menu"]`);
}

async function selectByLabel(page: Page, label: string): Promise<void> {
  await trigger(page).click();
  await expect(menu(page)).toBeVisible();
  await menu(page).getByRole('menuitem', { name: label, exact: true }).click();
  await expect(menu(page)).toHaveCount(0);
}

async function readPreferredMediaTypeCookie(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  const localSettings = cookies.find((cookie) => cookie.name === 'local-settings');
  if (!localSettings) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(localSettings.value)) as { pmt?: string };
    return parsed.pmt;
  } catch {
    return undefined;
  }
}

test.describe('Settings: preferred media type', () => {
  test('Anonymous user can change the preferred media type and the choice persists in the local-settings cookie.', async ({
    page,
  }, testInfo) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    const selector = trigger(page);
    await expect(selector).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The General settings tab shows the Preferred media type selector.',
      selector
    );

    await actionAndCapture(
      page,
      testInfo,
      'After selecting Audio, the local-settings cookie stores the audio preference.',
      async () => {
        await selectByLabel(page, 'Audio');
        await expect.poll(() => readPreferredMediaTypeCookie(page)).toBe('audio');
      },
      selector
    );

    await actionAndCapture(
      page,
      testInfo,
      'After selecting Video, the local-settings cookie stores the video preference.',
      async () => {
        await selectByLabel(page, 'Video');
        await expect.poll(() => readPreferredMediaTypeCookie(page)).toBe('video');
      },
      selector
    );
  });
});
