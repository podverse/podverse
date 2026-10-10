import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const API_ORIGIN = 'http://localhost:4030/api/v2';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function outcomeProcessed(body: unknown): boolean {
  if (!isRecord(body) || !isRecord(body.outcome)) {
    return false;
  }
  return body.outcome.status === 'processed';
}

function testProductId(body: unknown): string | null {
  if (!isRecord(body) || !Array.isArray(body.processors)) {
    return null;
  }
  for (const processor of body.processors) {
    if (
      !isRecord(processor) ||
      processor.processor_id !== 'test' ||
      !Array.isArray(processor.products)
    ) {
      continue;
    }
    for (const product of processor.products) {
      if (
        isRecord(product) &&
        product.cadence === 'monthly' &&
        typeof product.external_product_id === 'string'
      ) {
        return product.external_product_id;
      }
    }
  }
  return null;
}

test.describe('Manage membership', () => {
  test('A member with time sees the expiry date and a link to buy more.', async ({
    page,
  }, testInfo) => {
    const loginResponse = await page.request.post(`${API_ORIGIN}/auth/login`, {
      data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    const optionsResponse = await page.request.get(
      `${API_ORIGIN}/billing/checkout-options?platform=web`
    );
    expect(optionsResponse.ok(), await optionsResponse.text()).toBeTruthy();
    const monthlyProductId = testProductId(await optionsResponse.json());
    expect(monthlyProductId).not.toBeNull();

    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime());
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
    const activateResponse = await page.request.post(`${API_ORIGIN}/billing/test/simulate`, {
      data: {
        event: {
          type: 'payment_settled',
          externalProductId: monthlyProductId,
          externalBasePlanId: null,
          externalTransactionId: `e2e-manage-${periodStart.getTime()}`,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          amount: { value: '3.00', currencyCode: 'USD' },
        },
      },
    });
    expect(activateResponse.ok(), await activateResponse.text()).toBeTruthy();
    const activated: unknown = await activateResponse.json();
    expect(outcomeProcessed(activated)).toBe(true);

    await page.goto('/settings?tab=account');
    const membership = page.getByRole('region', { name: 'Membership' });
    await expect(membership.getByText('Premium', { exact: true })).toBeVisible();
    await expect(membership.getByText('Expires On', { exact: true })).toBeVisible();
    await expect(membership.getByRole('link', { name: 'Buy More Time' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Settings shows the membership expiry and a link to buy more time.',
      membership.getByText('Expires On', { exact: true })
    );
  });
});
