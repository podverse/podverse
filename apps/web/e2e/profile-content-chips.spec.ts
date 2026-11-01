import { expect, test } from '@playwright/test';

import { E2E_SEO_PUBLIC_PROFILE_ID_TEXT } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Profile content chips', () => {
  test('A public profile shows content chips and a static sort face', async ({
    page,
  }, testInfo) => {
    await test.step('Podcasts, Albums, Playlists, and Clips are followed by Sort: A-Z with no menu', async () => {
      await page.goto(`/profile/${E2E_SEO_PUBLIC_PROFILE_ID_TEXT}`);
      await expect(page).toHaveURL(new RegExp(`/profile/${E2E_SEO_PUBLIC_PROFILE_ID_TEXT}$`));

      const typeItems = page.getByTestId('profile-content-chips-items');
      await expect(typeItems.getByRole('button')).toHaveText([
        'Podcasts',
        'Albums',
        'Playlists',
        'Clips',
      ]);
      await expect(
        typeItems.getByRole('button', { name: 'Podcasts', exact: true })
      ).toHaveAttribute('aria-pressed', 'true');

      const trailing = page.getByTestId('profile-content-chips-trailing');
      const sortFace = trailing.getByTestId('profile-content-chips-sort-button');
      await expect(sortFace).toHaveAttribute('aria-label', 'Sort: A-Z');
      await expect(sortFace).toHaveText('A-Z');
      await expect(trailing.getByRole('button', { name: /^Sort: / })).toHaveCount(0);
      await expect(page.getByTestId('profile-content-chips').getByRole('menu')).toHaveCount(0);

      await typeItems.getByRole('button', { name: 'Clips', exact: true }).click();
      await expect(typeItems.getByRole('button', { name: 'Clips', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await expect(sortFace).toHaveAttribute('aria-label', 'Sort: Recent');
      await expect(sortFace).toHaveText('Recent');
      await expect(trailing.getByRole('button', { name: /^Sort: / })).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'Clips is pressed and the sort face reads Recent with no caret.',
        typeItems
      );
    });
  });
});
