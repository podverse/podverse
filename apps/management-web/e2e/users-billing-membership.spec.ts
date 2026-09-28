import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * App user e2e-billing-member@example.com (Trial, 3 days) from tools/management-web/seed-e2e.mjs
 */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const EXPIRY_MOVE_TOLERANCE_MS = 10_000;

test.beforeEach(() => {
  // Sign-in, the users-list search debounce, and a membership write.
  test.setTimeout(45_000);
});

async function signIn(page: Page) {
  await page.goto(ROUTES.HOME);
  await page.locator('#email').fill('e2e-superadmin@example.com');
  await page.locator('#password').fill('Test!1Aa');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

async function openBillingMemberPage(page: Page) {
  await signIn(page);
  await page.goto(ROUTES.USERS);
  await expect(page.getByPlaceholder('Search')).toBeVisible();
  await page.getByPlaceholder('Search').fill('e2e-billing-member@example.com');
  const row = page.getByRole('row').filter({ hasText: 'e2e-billing-member@example.com' });
  await expect(row).toBeVisible();
  await row.getByRole('link', { name: 'View' }).click();
  await page.locator('a[href^="/users/"][href$="/billing"]').click();
  await expect(page.getByRole('heading', { name: 'Account Billing', level: 1 })).toBeVisible();
  await expect(page.locator('#account-billing-extend-mode')).toBeVisible();
  await expect(page.locator('#membership-expires-at')).toBeVisible();
}

async function extendByThirtyDays(page: Page) {
  const beforeIso = await page.locator('#membership-expires-at').getAttribute('datetime');
  await page.locator('#account-billing-extend-mode').click();
  await page.getByRole('menuitem', { name: 'Number of Days' }).click();
  await page.locator('#account-billing-extend-days').fill('30');
  await page.locator('#account-billing-extend-note').fill('E2E extend by days');
  const submittedAtMs = Date.now();
  await page.getByRole('button', { name: 'Extend Membership' }).click();
  await expect(page.getByText(/Membership extended to/)).toBeVisible();
  return { beforeIso, submittedAtMs };
}

function expectMovedOutByThirtyDays(
  beforeIso: string | null,
  afterIso: string | null,
  submittedAtMs: number
) {
  expect(beforeIso).toEqual(expect.any(String));
  expect(afterIso).toEqual(expect.any(String));
  if (typeof beforeIso !== 'string' || typeof afterIso !== 'string') {
    return;
  }
  const baseMs = Math.max(Date.parse(beforeIso), submittedAtMs);
  const delta = Date.parse(afterIso) - baseMs;
  expect(delta).toBeGreaterThanOrEqual(THIRTY_DAYS_MS - EXPIRY_MOVE_TOLERANCE_MS);
  expect(delta).toBeLessThanOrEqual(THIRTY_DAYS_MS + EXPIRY_MOVE_TOLERANCE_MS);
}

test.describe('User billing page manual membership', () => {
  test('a superuser extends a trial member by 30 days and the expiration moves out by 30 days', async ({
    page,
  }, testInfo) => {
    await openBillingMemberPage(page);
    const adminCells = page.getByRole('cell', { name: 'admin', exact: true });
    const adminCountBefore = await adminCells.count();
    const { beforeIso, submittedAtMs } = await extendByThirtyDays(page);
    const afterIso = await page.locator('#membership-expires-at').getAttribute('datetime');
    expectMovedOutByThirtyDays(beforeIso, afterIso, submittedAtMs);
    await expect(adminCells).toHaveCount(adminCountBefore + 1);

    await capturePageLoad(
      page,
      testInfo,
      'The success alert shows the membership extended by 30 days.',
      page.getByText(/Membership extended to/)
    );
  });

  test('a superuser ends access now and the member reads as expired', async ({ page }, testInfo) => {
    await openBillingMemberPage(page);
    await page.getByRole('button', { name: 'End Access Now' }).click();
    const dialog = page.getByRole('dialog', { name: 'End Membership Access' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(/Membership access now ends on/)).toBeVisible();
    const iso = await page.locator('#membership-expires-at').getAttribute('datetime');
    expect(iso).toEqual(expect.any(String));
    if (typeof iso === 'string') {
      expect(Date.parse(iso)).toBeLessThanOrEqual(Date.now());
    }

    await capturePageLoad(
      page,
      testInfo,
      'Membership expiration is no longer in the future after End Access Now.',
      page.locator('#membership-expires-at')
    );
  });

  test('a superuser revokes the admin grant and the expiration is recalculated', async ({
    page,
  }, testInfo) => {
    await openBillingMemberPage(page);
    const { beforeIso, submittedAtMs } = await extendByThirtyDays(page);
    const extendedIso = await page.locator('#membership-expires-at').getAttribute('datetime');
    expectMovedOutByThirtyDays(beforeIso, extendedIso, submittedAtMs);

    await page
      .getByRole('button', { name: /^Revoke admin Ending/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Revoke Grant' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Grant revoked.')).toBeVisible();
    const afterIso = await page.locator('#membership-expires-at').getAttribute('datetime');
    expect(afterIso).toEqual(expect.any(String));
    expect(extendedIso).toEqual(expect.any(String));
    if (typeof afterIso === 'string' && typeof extendedIso === 'string') {
      expect(Date.parse(afterIso)).toBeLessThan(Date.parse(extendedIso));
    }

    await capturePageLoad(
      page,
      testInfo,
      'Revoking the admin grant shows the recalculated expiration.',
      page.locator('#membership-expires-at')
    );
  });
});
