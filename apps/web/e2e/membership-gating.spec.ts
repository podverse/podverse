import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

// A logged-in but EXPIRED member attempting a member-only action (here: creating a playlist) must
// see the shared membership modal (Cancel + auth-based Renew) instead of a generic error. The 403 is
// mocked with the real membership-expired payload (i18nKey + renewPath) that
// `parseMembershipGateError` interprets, so no expired seed is needed.
test.describe('Membership gate on member-only actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/playlist', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Your membership has expired. Renew to use this feature.',
          code: 'membership_expired',
          i18nKey: 'membership.membership_expired',
          renewPath: '/membership/renew',
        }),
      });
    });
  });

  test('a logged-in expired member creating a playlist sees the membership modal, and Renew navigates to the renew page', async ({
    page,
  }, testInfo) => {
    const loginResponse = await page.request.post('http://localhost:4030/api/v2/auth/login', {
      data: { email: 'e2e-user@example.com', password: 'Test!1Aa' },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    await page.goto('/playlist/create');
    await expect(page.locator('input[name="title"]')).toBeVisible();

    await test.step('Filling the title enables the primary submit action', async () => {
      await page.locator('input[name="title"]').fill('Expired member playlist');
      const submit = page.getByRole('button', { name: /^submit$/i });
      await expect(submit).toBeEnabled();

      await capturePageLoad(page, testInfo, 'The playlist create form is ready to submit.', submit);
    });

    await test.step('Submitting with an expired membership opens the membership modal (not a generic error)', async () => {
      await page.getByRole('button', { name: /^submit$/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      // The membership modal is distinguished from the plain login modal by its Renew action.
      const renewButton = dialog.getByRole('button', { name: 'Renew Membership' });
      await expect(renewButton).toBeVisible();
      await expect(dialog.getByText(/membership has expired/i)).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The membership modal explains the expired membership with a Renew action.',
        dialog
      );
    });

    await test.step('Renew Membership navigates to the membership renew page', async () => {
      await page.getByRole('dialog').getByRole('button', { name: 'Renew Membership' }).click();
      await expect(page).toHaveURL(/\/membership\/renew/);

      await capturePageLoad(
        page,
        testInfo,
        'Renew Membership navigates to the membership renew page.',
        page.getByRole('heading', { level: 1 })
      );
    });
  });

  test('a logged-in expired member adding an episode to the queue sees the membership modal, and Renew navigates to the renew page', async ({
    page,
  }, testInfo) => {
    // "Add to Queue Next" is member-gated (POST /queue/:q/item/:i/next, skipMembershipStatus: false).
    // The shared `useQueueAddWithGate` must turn the membership-expired 403 into the same modal the
    // playlist path shows — not the generic `queue.add_error` toast.
    await page.route('**/queue/*/item/*/next', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Your membership has expired. Renew to use this feature.',
          code: 'membership_expired',
          i18nKey: 'membership.membership_expired',
          renewPath: '/membership/renew',
        }),
      });
    });

    const loginResponse = await page.request.post('http://localhost:4030/api/v2/auth/login', {
      data: { email: 'e2e-user@example.com', password: 'Test!1Aa' },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    // The seeded e2e-user has an active podcast queue (e2ePodQueue01), so Queue: Next resolves a queue
    // and actually fires the member-only request.
    await page.goto('/episode/e2ePodResume03');
    await expect(
      page.getByRole('heading', { name: 'E2E Podcast No Stored Position' })
    ).toBeVisible();

    await test.step('Opening the More menu and choosing Queue: Next attempts a member-only action', async () => {
      await page.getByRole('button', { name: 'More options' }).first().click();
      const queueNext = page.getByRole('menuitem', { name: 'Queue: Next' });
      await expect(queueNext).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The episode More menu exposes the member-only Queue: Next action.',
        queueNext
      );

      await queueNext.click();
    });

    await test.step('The queue-add 403 opens the membership modal (not the generic add-error toast)', async () => {
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const renewButton = dialog.getByRole('button', { name: 'Renew Membership' });
      await expect(renewButton).toBeVisible();
      await expect(dialog.getByText(/membership has expired/i)).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Adding to the queue while expired shows the membership modal with a Renew action.',
        dialog
      );
    });

    await test.step('Renew Membership navigates to the membership renew page', async () => {
      await page.getByRole('dialog').getByRole('button', { name: 'Renew Membership' }).click();
      await expect(page).toHaveURL(/\/membership\/renew/);

      await capturePageLoad(
        page,
        testInfo,
        'Renew Membership navigates to the membership renew page.',
        page.getByRole('heading', { level: 1 })
      );
    });
  });
});
