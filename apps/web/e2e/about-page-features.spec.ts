import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Web about page membership features', () => {
  test('When a visitor opens About, they see the Free versus Premium feature comparison.', async ({
    page,
  }, testInfo) => {
    await page.goto('/about');
    await expect(page).toHaveURL(/\/about\/?$/);

    await expect(page.getByRole('columnheader', { name: 'Free' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Premium' })).toBeVisible();

    const videoPlayback = page.getByText('Video playback', { exact: true });
    await expect(videoPlayback).toBeVisible();
    await expect(page.getByText('CarPlay*', { exact: true })).toBeVisible();
    await expect(page.getByText('Android Auto*', { exact: true })).toBeVisible();
    await expect(page.getByText('Streaming (Value for Value)', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Coming soon')).toHaveCount(0);

    const trialLimitations = page.getByText('Trial Limitations', { exact: true });
    await expect(trialLimitations).toBeVisible();

    const trialSummary = page.getByText(
      'Some features are unavailable during Trial to help reduce spam and abuse.',
      { exact: true }
    );
    const statsBullet = page.getByText(
      'Listen stats are not available on Trial. Contributing to trending requires Premium.',
      { exact: true }
    );
    await expect(trialSummary).not.toBeVisible();
    await expect(statsBullet).not.toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The about page shows the Free versus Premium feature comparison.',
      videoPlayback
    );

    await trialLimitations.click();
    await expect(trialSummary).toBeVisible();
    await expect(statsBullet).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Trial Limitations on About expands the same trial limitation list as Membership.',
      statsBullet
    );
  });
});
