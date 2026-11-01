import { expect, test } from '@playwright/test';

import { E2E_PODCAST_CHANNEL_ID_TEXT } from './helpers/seedConstants';
import { captureVerifiedElement } from './helpers/stepScreenshots';

const PODCAST_URL = `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`;

test.describe('Podcast detail section chips', () => {
  test('When a podcast page opens, Episodes is pressed, About sits between Episodes and Clips, and Sort reads Recent', async ({
    page,
  }, testInfo) => {
    await page.goto(PODCAST_URL);
    await expect(page).toHaveURL(PODCAST_URL);

    const episodesChip = page.getByTestId('podcast-detail-chips-episodes');
    const aboutChip = page.getByRole('button', { name: 'About', exact: true });
    const clipsChip = page.getByRole('button', { name: 'Clips', exact: true });

    await expect(episodesChip).toBeVisible();
    await expect(episodesChip).toHaveAttribute('aria-pressed', 'true');
    await expect(aboutChip).toBeVisible();
    await expect(aboutChip).toHaveAttribute('aria-pressed', 'false');
    await expect(clipsChip).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sort: Recent', exact: true })).toBeVisible();

    const episodesBox = await episodesChip.boundingBox();
    const aboutBox = await aboutChip.boundingBox();
    const clipsBox = await clipsChip.boundingBox();
    if (episodesBox === null || aboutBox === null || clipsBox === null) {
      throw new Error('Episodes, About, and Clips must all be visible.');
    }
    expect(episodesBox.x).toBeLessThan(aboutBox.x);
    expect(aboutBox.x).toBeLessThan(clipsBox.x);

    await captureVerifiedElement(
      page,
      testInfo,
      aboutChip,
      'About is a section chip between Episodes and Clips, and it is not pressed.'
    );
  });
});
