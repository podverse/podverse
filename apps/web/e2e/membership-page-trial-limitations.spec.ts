import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * Membership page shows a Free vs Premium feature table. A dagger on the Free check means that
 * tier is the mobile app; Premium includes the website. Trial caps stay in the accordion.
 */
test.describe('Web membership page trial limitations and renew route', () => {
  test('When a visitor opens Membership, they see the Free versus Premium table and can expand Trial limitations.', async ({
    page,
  }, testInfo) => {
    await page.goto('/membership');
    await expect(page).toHaveURL(/\/membership\/?$/);

    await expect(page.getByTestId('membership-contact')).toContainText(
      'To get a membership, please contact us at'
    );
    const content = page.getByTestId('membership-content');
    const centered = await content.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const main = element.closest('main');
      if (main === null) {
        return false;
      }
      const mainBox = main.getBoundingClientRect();
      const contentMid = box.left + box.width / 2;
      const mainMid = mainBox.left + mainBox.width / 2;
      return Math.abs(contentMid - mainMid) < 4 && box.width < mainBox.width - 32;
    });
    expect(centered).toBe(true);
    await expect(page.getByRole('link', { name: 'contact-e2e@example.com' })).toBeVisible();
    await expect(page.getByText('If you have questions, please contact us at')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Extend Membership' })).toHaveCount(0);

    await expect(page.getByRole('columnheader', { name: 'Free' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Premium' })).toBeVisible();

    const videoPlayback = page.getByText('Video Playback', { exact: true });
    await expect(videoPlayback).toBeVisible();
    await expect(page.getByText('Subscribe to Podcasts *', { exact: true })).toBeVisible();
    await expect(page.getByText('Download Episodes', { exact: true })).toBeVisible();
    await expect(page.getByText('CarPlay', { exact: true })).toBeVisible();
    await expect(page.getByText('Android Auto', { exact: true })).toBeVisible();
    await expect(page.getByText('Streaming (Value for Value)', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Sleep Timer', { exact: true })).toBeVisible();
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
    await expect(page.getByText('Playback Handoff', { exact: true })).toBeVisible();
    await expect(page.getByText('Queue and History', { exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Recommendations', exact: true })).toBeVisible();
    await expect(page.getByText('Developer API Keys', { exact: true })).toBeVisible();
    await expect(page.getByText('Coming Soon')).toHaveCount(0);
    await expect(
      page.getByText(
        '* Free tier is available on the mobile app only. Premium includes the website.',
        { exact: true }
      )
    ).toBeVisible();
    await expect(page.getByText('* Feature is only available in the mobile app')).toHaveCount(0);

    const trialLimitations = page.getByText('Trial Limitations', { exact: true });
    await expect(trialLimitations).toBeVisible();

    const trialSummary = page.getByText(
      'Some features are unavailable during Trial to help reduce spam and abuse.',
      { exact: true }
    );
    const directoryBullet = page.getByText(
      'Adding feeds to the public directory from search is blocked for Trial status.',
      { exact: true }
    );
    const feedLimitBullet = page.getByText(
      'Add by RSS holds up to 10 feeds on Trial and 100 on Premium.',
      { exact: true }
    );
    const refreshBullet = page.getByText(
      'Manual refresh is limited to 5 times an hour on Trial and 20 on Premium.',
      { exact: true }
    );
    const statsBullet = page.getByText(
      'Listens during Trial are saved for Recommendations. They do not count toward trending. Profile and playlist opens count toward trending on Premium.',
      { exact: true }
    );
    await expect(trialSummary).not.toBeVisible();
    await expect(directoryBullet).not.toBeVisible();
    await expect(feedLimitBullet).not.toBeVisible();
    await expect(refreshBullet).not.toBeVisible();
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
    await expect(feedLimitBullet).toBeVisible();
    await expect(refreshBullet).toBeVisible();
    await expect(statsBullet).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Trial limitations expands the trial limitations list on the membership page.',
      directoryBullet
    );
  });

  test('the renew page shows Buy Membership and a link to the membership page', async ({
    page,
  }, testInfo) => {
    await page.goto('/membership/renew');
    await expect(page).toHaveURL(/\/membership\/renew\/?$/);

    const chrome = page.locator('[data-appearance="web"]');
    const renewHeading = chrome.getByRole('heading', { name: 'Buy Membership', level: 1 });
    await expect(renewHeading).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Membership Page' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The membership renew page shows Buy Membership and a link back to membership.',
      renewHeading
    );
  });
});
