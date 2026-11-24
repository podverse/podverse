import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { E2E_BOOST_CHANNEL_ID_TEXT } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
/** Sync with tools/web/seed-e2e.mjs `E2E_BOOST_SENDER_GUID`. */
const E2E_BOOST_SENDER_GUID = '11111111-1111-4111-8111-111111111111';

const METABOOST_CAPABILITY_BODY = {
  schema: 'mbrss-v1',
  message_char_limit: 500,
  terms_of_service_url: 'https://metaboost.example/terms',
};

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

async function routeMetaboost(page: Page): Promise<string[]> {
  const urls: string[] = [];
  await page.route(/^https:\/\/metaboost\.example\//, async (route) => {
    urls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(METABOOST_CAPABILITY_BODY),
    });
  });
  return urls;
}

test.describe('Boost form without sign-in', () => {
  test('When a signed-out visitor opens a channel boost, the amount and Submit stay available and the name and message stay locked.', async ({
    page,
  }, testInfo) => {
    const metaboostUrls = await routeMetaboost(page);

    await test.step('Open the seeded boost channel.', async () => {
      await page.goto(`/podcast/${E2E_BOOST_CHANNEL_ID_TEXT}`);
      await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_BOOST_CHANNEL_ID_TEXT}`));
      await expect(page.getByRole('button', { name: 'Boost' })).toHaveCount(1);
    });

    await test.step('Open the boost dialog and verify a signed-out visitor can pay without a name or message.', async () => {
      await page.getByRole('button', { name: 'Boost' }).click();
      const dialog = page.getByRole('dialog', { name: 'Boost' });
      await expect(dialog).toBeVisible();

      const amount = dialog.getByRole('spinbutton', { name: 'Send to Creator' });
      const name = dialog.getByRole('textbox', { name: 'Your Name' });
      const message = dialog.getByRole('textbox', { name: 'Message' });
      const submit = dialog.getByRole('button', { name: 'Submit' });

      await expect(amount).toBeEnabled();
      await expect(name).toBeDisabled();
      await expect(name).toHaveValue('');
      await expect(message).toBeDisabled();
      await expect(submit).toBeEnabled();
      await expect(page.getByText('Log in to use this feature.', { exact: true })).toHaveCount(0);
      expect(metaboostUrls).toEqual([]);

      await capturePageLoad(
        page,
        testInfo,
        'The signed-out boost form keeps Submit available and locks the name and message.',
        submit
      );
    });
  });

  test('When a signed-in listener opens a channel boost, the name starts empty, the capability request carries the sender id, and a typed name is remembered.', async ({
    page,
  }, testInfo) => {
    const metaboostUrls = await routeMetaboost(page);

    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    await test.step('Open the seeded boost channel.', async () => {
      await page.goto(`/podcast/${E2E_BOOST_CHANNEL_ID_TEXT}`);
      await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_BOOST_CHANNEL_ID_TEXT}`));
      await expect(page.getByRole('button', { name: 'Boost' })).toBeVisible();
    });

    await test.step('Open the boost dialog and remember a typed name.', async () => {
      await page.getByRole('button', { name: 'Boost' }).click();
      const dialog = page.getByRole('dialog', { name: 'Boost' });
      const name = dialog.getByRole('textbox', { name: 'Your Name' });
      const message = dialog.getByRole('textbox', { name: 'Message' });

      await expect(name).toBeEnabled();
      await expect(name).toHaveValue('');
      await expect(name).toHaveAttribute('placeholder', 'Anonymous');
      await expect(message).toBeEnabled();
      expect(metaboostUrls.length).toBeGreaterThan(0);
      for (const url of metaboostUrls) {
        expect(url).toContain(`sender_guid=${E2E_BOOST_SENDER_GUID}`);
      }

      await name.fill('Ada');
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog', { name: 'Boost' })).toHaveCount(0);

      await page.getByRole('button', { name: 'Boost' }).click();
      const reopened = page.getByRole('dialog', { name: 'Boost' });
      const rememberedName = reopened.getByRole('textbox', { name: 'Your Name' });
      await expect(rememberedName).toBeEnabled();
      await expect(rememberedName).toHaveValue('Ada');

      await capturePageLoad(
        page,
        testInfo,
        'The reopened boost form shows the remembered name Ada.',
        rememberedName
      );
    });
  });
});
