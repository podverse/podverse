import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * Membership page shows a subtle trial summary with Show more; details expand on demand.
 * Renew page is linked from routing when membership expires; smoke-check route and link back to membership.
 */
test.describe('Web membership page trial limitations and renew route', () => {
  test('the membership page shows trial summary and expands limitations on Show more', async ({
    page,
  }, testInfo) => {
    await page.goto('/membership');

    await expect(
      page.getByText('Some features are unavailable during Trial to help reduce spam and abuse.', {
        exact: true,
      })
    ).toBeVisible();

    const showMore = page.getByRole('button', { name: 'Show more' });
    await expect(showMore).toBeVisible();

    const directoryBullet = page.getByText(
      'Adding feeds to the public directory from search is blocked for Trial status.',
      { exact: true }
    );
    await expect(directoryBullet).not.toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The membership page shows the trial summary before expanding details.',
      showMore
    );

    await showMore.click();

    await expect(directoryBullet).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Show more expands the trial limitations list on the membership page.',
      directoryBullet
    );
  });

  test('the membership renew page shows renew copy and a link to the main membership page', async ({
    page,
  }, testInfo) => {
    await page.goto('/membership/renew');

    await expect(page.getByRole('heading', { name: 'Renew Membership', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Membership Page' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The membership renew page shows renew copy and a link back to membership.',
      page.getByRole('heading', { name: 'Renew Membership', level: 1 })
    );
  });
});
