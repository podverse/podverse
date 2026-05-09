import { expect, test } from '@playwright/test';

const SUPERUSER_EMAIL = 'e2e-superadmin@example.com';
const NO_EXTENSIONS_ADMIN_EMAIL = 'e2e-nobucket@example.com';
const PASSWORD = 'Test!1Aa';
const TEST_TOKEN = '00000000000000000000000000000000';

async function signIn(page: Parameters<typeof test>[0]['page'], email: string): Promise<void> {
  await page.goto('/');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard');
}

async function setExtensionEnabled(
  page: Parameters<typeof test>[0]['page'],
  enabled: boolean
): Promise<void> {
  await page.goto('/extensions/cloudflare-web-analytics');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Cloudflare Web Analytics' })
  ).toBeVisible();

  await page.getByRole('textbox').first().fill(TEST_TOKEN);

  const enabledSwitch = page.getByRole('switch').first();
  const isChecked = (await enabledSwitch.getAttribute('aria-checked')) === 'true';
  if (isChecked !== enabled) {
    await enabledSwitch.click();
  }

  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Extension settings saved.')).toBeVisible();
  await page.waitForURL('**/extensions');
}

test.describe('Management-web extensions list and edit', () => {
  test('superuser can enable then disable cloudflare extension from list/detail flow', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await signIn(page, SUPERUSER_EMAIL);

    await page.goto('/extensions');
    await expect(page).toHaveURL(/\/extensions$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Extensions' })).toBeVisible();

    const cloudflareRow = page.getByRole('row', { name: /Cloudflare Web Analytics/i });
    await expect(cloudflareRow).toBeVisible();
    await expect(cloudflareRow.getByText('Disabled')).toBeVisible();

    await setExtensionEnabled(page, true);
    await expect(cloudflareRow.getByText('Enabled')).toBeVisible();

    await setExtensionEnabled(page, false);
    await expect(cloudflareRow.getByText('Disabled')).toBeVisible();
  });

  test('admin without extensions permissions does not get extensions nav and is redirected', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await signIn(page, NO_EXTENSIONS_ADMIN_EMAIL);

    await expect(page.getByRole('link', { name: 'Extensions' })).toHaveCount(0);

    await page.goto('/extensions');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
