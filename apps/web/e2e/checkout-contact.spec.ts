import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';

test.describe('Checkout page when no processor is offered', () => {
  test('When checkout options list no processors, a signed-in member sees the contact state and no purchase controls.', async ({
    page,
  }, testInfo) => {
    const loginResponse = await page.request.post(API_LOGIN_URL, {
      data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    await page.route('**/billing/checkout-options**', async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          platform: 'web',
          processors: [],
          storefront: null,
        }),
        contentType: 'application/json',
        status: 200,
      });
    });

    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/checkout\/?$/);

    const contact = page.getByTestId('checkout-contact');
    await expect(contact).toBeVisible();
    await expect(page.getByTestId('checkout-paypal')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Complete Test Purchase' })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Checkout shows how to contact the team when no processor is offered.',
      contact
    );
  });
});
