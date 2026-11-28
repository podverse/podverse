import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { loginSessionsUser } from './helpers/accountSessions';
import { capturePageLoad } from './helpers/stepScreenshots';

async function openAccountSettings(page: Page): Promise<void> {
  await loginSessionsUser(page.request);
  await page.goto('/settings?tab=account');
  await expect(page).toHaveURL(/\/settings\?tab=account/);
}

test.describe('Authenticator Settings', () => {
  test('shows the authenticator setup control on the account settings page', async ({
    page,
  }, testInfo) => {
    await openAccountSettings(page);
    const setup = page.getByRole('button', { name: 'Set Up Authenticator' });
    await expect(setup).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'Account settings shows the authenticator setup control',
      setup
    );
  });
});
