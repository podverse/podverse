import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_BOOST_NODE_CHANNEL_ID_TEXT,
  E2E_BOOST_PAYPAL_CHANNEL_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function recordMetaboostRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (request.url().toLowerCase().includes('metaboost')) {
      urls.push(request.url());
    }
  });
  return urls;
}

test.describe('Boost action without a MetaBoost tag', () => {
  test('When a signed-out visitor opens a channel with a lightning node and no MetaBoost tag, the Boost button opens a form with a locked name and message.', async ({
    page,
  }, testInfo) => {
    const metaboostUrls = recordMetaboostRequests(page);

    await test.step('Open the seeded lightning-node channel.', async () => {
      await page.goto(`/podcast/${E2E_BOOST_NODE_CHANNEL_ID_TEXT}`);
      await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_BOOST_NODE_CHANNEL_ID_TEXT}`));
      await expect(page.getByRole('button', { name: 'Boost' })).toHaveCount(1);
      const chips = page.getByTestId('podcast-detail-chips');
      await expect(chips).toBeVisible();
      await expect(chips.getByText('Boost', { exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'The lightning-node channel shows a Boost button and no Boost chip.',
        page.getByRole('button', { name: 'Boost' })
      );
    });

    await test.step('Open the boost dialog and verify a signed-out visitor can pay without a name or message.', async () => {
      await page.getByRole('button', { name: 'Boost' }).click();
      const dialog = page.getByRole('dialog', { name: 'Boost' });
      await expect(dialog).toBeVisible();

      const amount = dialog.getByRole('spinbutton', { name: 'Send to Creator' });
      const name = dialog.getByRole('textbox', { name: 'Your Name' });
      const message = dialog.getByRole('textbox', { name: 'Message' });

      await expect(amount).toBeEnabled();
      await expect(name).toBeDisabled();
      await expect(message).toBeDisabled();
      await expect(page.getByText('Log in to use this feature.', { exact: true })).toHaveCount(0);
      expect(metaboostUrls).toEqual([]);

      await capturePageLoad(
        page,
        testInfo,
        'The signed-out node boost form locks the name and message.',
        name
      );
    });
  });

  test('When a signed-in listener opens a channel with a lightning node and no MetaBoost tag, the name and message stay editable.', async ({
    page,
  }, testInfo) => {
    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    await test.step('Open the seeded lightning-node channel.', async () => {
      await page.goto(`/podcast/${E2E_BOOST_NODE_CHANNEL_ID_TEXT}`);
      await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_BOOST_NODE_CHANNEL_ID_TEXT}`));
      await expect(page.getByRole('button', { name: 'Boost' })).toBeVisible();
    });

    await test.step('Open the boost dialog and verify the name and message are editable.', async () => {
      await page.getByRole('button', { name: 'Boost' }).click();
      const dialog = page.getByRole('dialog', { name: 'Boost' });
      await expect(dialog).toBeVisible();

      const name = dialog.getByRole('textbox', { name: 'Your Name' });
      const message = dialog.getByRole('textbox', { name: 'Message' });

      await expect(name).toBeEnabled();
      await expect(message).toBeEnabled();

      await capturePageLoad(
        page,
        testInfo,
        'The signed-in node boost form keeps the name and message editable.',
        name
      );
    });
  });

  test('When a visitor opens a PayPal-only channel with no MetaBoost tag, the page has no Boost button and no Boost chip.', async ({
    page,
  }, testInfo) => {
    await test.step('Open the seeded PayPal channel.', async () => {
      await page.goto(`/podcast/${E2E_BOOST_PAYPAL_CHANNEL_ID_TEXT}`);
      await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_BOOST_PAYPAL_CHANNEL_ID_TEXT}`));
      await expect(page.getByRole('button', { name: 'Boost' })).toHaveCount(0);
      const chips = page.getByTestId('podcast-detail-chips');
      await expect(chips).toBeVisible();
      await expect(chips.getByText('Boost', { exact: true })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'The PayPal channel has no Boost button and no Boost chip.',
        chips
      );
    });
  });
});
