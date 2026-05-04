import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 *
 * Validates that the Create User form accepts a username-only submission
 * (no email, no password) and renders the generated invite link panel.
 */
test.describe('Management-web create user (username-only)', () => {
  test('a superuser can create a user with username only and receives an invite link', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    const sentBodies: Record<string, unknown>[] = [];

    await page.route('**/users', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      sentBodies.push(body);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'User created. Invite link generated.',
          set_password_url: 'https://example.com/set-password?token=test-token-abc',
        }),
      });
    });

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/users/new');

    await expect(page.getByRole('heading', { name: 'Create User', level: 1 })).toBeVisible();

    await page.locator('#username').fill('e2e_username_only');
    await page.getByRole('button', { name: 'Create User' }).first().click();

    const inviteLinkInput = page.locator('#invite-link');
    await expect(inviteLinkInput).toBeVisible();
    await expect(inviteLinkInput).toHaveValue(
      'https://example.com/set-password?token=test-token-abc'
    );

    expect(sentBodies[0]).toEqual({ username: 'e2e_username_only' });
  });
});
