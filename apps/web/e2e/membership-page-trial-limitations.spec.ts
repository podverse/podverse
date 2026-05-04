import { expect, test } from '@playwright/test';

/**
 * Membership page always renders the trial limitations section (copy from i18n originals en-US).
 * Renew page is linked from routing when membership expires; smoke-check route and link back to membership.
 */
test.describe('Web membership page trial limitations and renew route', () => {
  test('the membership page shows the trial limitations heading and list for an unauthenticated visitor', async ({
    page,
  }) => {
    await page.goto('/membership');

    await expect(page.getByRole('heading', { name: 'Trial limitations', level: 2 })).toBeVisible();
    await expect(
      page.getByText(
        'Adding feeds to the public directory from search is blocked for Trial status.',
        {
          exact: true,
        }
      )
    ).toBeVisible();
  });

  test('the membership renew page shows renew copy and a link to the main membership page', async ({
    page,
  }) => {
    await page.goto('/membership/renew');

    await expect(page.getByRole('heading', { name: 'Renew Membership', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Membership Page' })).toBeVisible();
  });
});
