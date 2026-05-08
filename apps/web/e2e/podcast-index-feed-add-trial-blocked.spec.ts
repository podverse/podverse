import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function dismissBlockingDevModal(page: Page) {
  const devDialog = page.getByRole('dialog', { name: /Local Development/i });
  if ((await devDialog.count()) > 0 && (await devDialog.first().isVisible())) {
    await page.keyboard.press('Escape');
    await devDialog
      .first()
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});

    if (await devDialog.first().isVisible()) {
      const closeButton = devDialog.first().getByRole('button').first();
      if ((await closeButton.count()) > 0) {
        await closeButton.click({ force: true });
      }
    }
  }
}

test.describe('Podcast Index add feed when directory add is blocked for Trial', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/mq/rss/add/on-demand', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Your account does not currently have access to this feature.',
          code: 'feature_not_available_for_account_type',
          i18nKey: 'membership.feature_not_available_for_account_type',
          renewPath: '/membership/renew',
        }),
      });
    });
  });

  test('the modal explains Trial directory limits, shows a mailto link, and Get Premium navigates to membership', async ({
    page,
  }) => {
    const loginResponse = await page.request.post('http://localhost:4030/api/v2/auth/login', {
      data: { email: 'e2e-user@example.com', password: 'Test!1Aa' },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    await page.goto('/podcast-index/feed/6594066');
    await dismissBlockingDevModal(page);

    await test.step('The Add Feed button is available after login', async () => {
      await expect(page.getByRole('button', { name: /add feed/i })).toBeVisible();
    });

    await test.step('Clicking Add Feed opens the Premium Required modal with descriptive copy', async () => {
      await page.getByRole('button', { name: /add feed/i }).click();
      const dialog = page.getByRole('dialog', { name: 'Premium Required' });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Login Required' })).toHaveCount(0);
      await expect(dialog.getByText(/Trial accounts.*add feeds.*public directory/i)).toBeVisible();
      const mailLink = dialog.locator('a[href^="mailto:"]');
      await expect(mailLink.first()).toBeVisible();
    });

    await test.step('Get Premium navigates to the membership page', async () => {
      await page
        .getByRole('dialog', { name: 'Premium Required' })
        .getByRole('button', { name: 'Get Premium' })
        .click();
      await expect(page).toHaveURL(/\/membership/);
    });
  });
});
