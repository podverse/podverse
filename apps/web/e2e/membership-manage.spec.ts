import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const API_ORIGIN = 'http://localhost:4030/api/v2';

function outcomeProcessed(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || !('outcome' in body)) {
    return false;
  }
  const outcome = body.outcome;
  return (
    typeof outcome === 'object' &&
    outcome !== null &&
    'status' in outcome &&
    outcome.status === 'processed'
  );
}

function cancelledActive(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || !('status' in body)) {
    return false;
  }
  const status = body.status;
  if (typeof status !== 'object' || status === null || !('active_subscription' in status)) {
    return false;
  }
  const subscription = status.active_subscription;
  if (typeof subscription !== 'object' || subscription === null || !('status' in subscription)) {
    return false;
  }
  return subscription.status === 'cancelled_active';
}

test.describe('Manage membership', () => {
  test('A premium member can turn off test auto-renew and then sees an expiration date.', async ({
    page,
  }, testInfo) => {
    const loginResponse = await page.request.post(`${API_ORIGIN}/auth/login`, {
      data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime());
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);
    const activateResponse = await page.request.post(`${API_ORIGIN}/billing/test/simulate`, {
      data: {
        event: {
          type: 'subscription_activated',
          externalProductId: 'e2e-test-monthly-renew',
          externalBasePlanId: null,
          externalSubscriptionId: 'e2e-manage-monthly',
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        },
      },
    });
    expect(activateResponse.ok(), await activateResponse.text()).toBeTruthy();
    const activated: unknown = await activateResponse.json();
    expect(outcomeProcessed(activated)).toBe(true);

    await page.goto('/settings?tab=account');
    const membership = page.getByRole('region', { name: 'Membership' });
    await expect(membership.getByText('Premium', { exact: true })).toBeVisible();
    await expect(membership.getByText('Test', { exact: true })).toBeVisible();
    await expect(membership.getByText('Renews On', { exact: true })).toBeVisible();

    const cancelResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/billing/subscriptions/') &&
        response.url().includes('/cancel') &&
        response.request().method() === 'POST'
    );
    await membership.getByRole('button', { name: 'Cancel Auto-Renew' }).click();
    const response = await cancelResponse;
    expect(response.ok(), await response.text()).toBeTruthy();
    const body: unknown = await response.json();
    expect(cancelledActive(body)).toBe(true);

    await expect(membership.getByText('Expires On', { exact: true })).toBeVisible();
    await expect(membership.getByText('Renews On', { exact: true })).toHaveCount(0);
    await expect(
      membership.getByText('Auto-renew is off. Access continues until it expires.')
    ).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Settings shows the membership expires after auto-renew is turned off.',
      membership.getByText('Expires On', { exact: true })
    );
  });
});
