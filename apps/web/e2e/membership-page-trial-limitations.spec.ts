import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * Membership page shows a Free vs Premium feature table (short rows, mobile-only * on labels)
 * and a Trial limitations accordion. Renew page is linked when membership expires.
 */
test.describe('Web membership page trial limitations and renew route', () => {
  test('When a visitor opens Membership, they see the Free versus Premium table and can expand Trial limitations.', async ({
    page,
  }, testInfo) => {
    await page.goto('/membership');
    await expect(page).toHaveURL(/\/membership\/?$/);

    await expect(page.getByRole('columnheader', { name: 'Free' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Premium' })).toBeVisible();

    const videoPlayback = page.getByText('Video playback', { exact: true });
    await expect(videoPlayback).toBeVisible();
    await expect(page.getByText('CarPlay*', { exact: true })).toBeVisible();
    await expect(page.getByText('Android Auto*', { exact: true })).toBeVisible();
    await expect(page.getByText('Streaming (Value for Value)', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Sleep timer*', { exact: true })).toBeVisible();
    await expect(page.getByText('Coming soon')).toHaveCount(0);
    await expect(
      page.getByText('* Feature is only available in the mobile app', { exact: true })
    ).toBeVisible();

    const trialLimitations = page.getByText('Trial limitations', { exact: true });
    await expect(trialLimitations).toBeVisible();

    const trialSummary = page.getByText(
      'Some features are unavailable during Trial to help reduce spam and abuse.',
      { exact: true }
    );
    const directoryBullet = page.getByText(
      'Adding feeds to the public directory from search is blocked for Trial status.',
      { exact: true }
    );
    const statsBullet = page.getByText(
      'Listen stats are not available on Trial. Contributing to trending requires Premium.',
      { exact: true }
    );
    await expect(trialSummary).not.toBeVisible();
    await expect(directoryBullet).not.toBeVisible();
    await expect(statsBullet).not.toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The membership page shows the Free versus Premium feature table before expanding Trial limitations.',
      videoPlayback
    );

    await trialLimitations.click();

    await expect(trialSummary).toBeVisible();
    await expect(directoryBullet).toBeVisible();
    await expect(statsBullet).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Trial limitations expands the trial limitations list on the membership page.',
      directoryBullet
    );
  });

  test('the membership renew page shows renew copy and a link to the main membership page', async ({
    page,
  }, testInfo) => {
    await page.goto('/membership/renew');
    await expect(page).toHaveURL(/\/membership\/renew\/?$/);

    await expect(page.getByRole('heading', { name: 'Renew membership', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to membership page' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The membership renew page shows renew copy and a link back to membership.',
      page.getByRole('heading', { name: 'Renew membership', level: 1 })
    );
  });
});
