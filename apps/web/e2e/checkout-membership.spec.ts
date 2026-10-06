import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';

function processedAndEntitled(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  if (!('outcome' in body) || !('status' in body)) {
    return false;
  }
  const outcome = body.outcome;
  const status = body.status;
  if (
    typeof outcome !== 'object' ||
    outcome === null ||
    typeof status !== 'object' ||
    status === null
  ) {
    return false;
  }
  return (
    'status' in outcome &&
    outcome.status === 'processed' &&
    'is_entitled' in status &&
    status.is_entitled === true
  );
}

test.describe('Checkout membership', () => {
  test('When the test processor is offered, completing the auto-renew test purchase confirms membership.', async ({
    page,
  }, testInfo) => {
    const loginResponse = await page.request.post(API_LOGIN_URL, {
      data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    await page.goto('/checkout');
    const autoRenew = page.getByRole('checkbox', { name: 'Auto-Renew' });
    await expect(autoRenew).toBeChecked();
    await expect(
      page.getByText(
        'Membership renews until you cancel it. You can manage it in Settings. PayPal charges each renewal.'
      )
    ).toBeVisible();

    const simulateResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/billing/test/simulate') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Complete Test Purchase' }).click();
    const response = await simulateResponse;
    expect(response.ok(), await response.text()).toBeTruthy();
    const body: unknown = await response.json();
    expect(processedAndEntitled(body)).toBe(true);

    await expect(page).toHaveURL(/\/checkout\/success/);
    await expect(page.getByText('Your membership is active.')).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The success page confirms membership after the test purchase.',
      page.getByText('Your membership is active.')
    );
  });
});
