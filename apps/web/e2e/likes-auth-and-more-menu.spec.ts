import { expect, test } from '@playwright/test';

import { expectLikeAffordanceVisibleWhenLoggedOut } from './helpers/mediaPlayerAssertions';
import { createRequestCounter } from './helpers/networkGuards';
import {
  clickVtsLike,
  openMediaPlayerHarness,
  setLoggedInState,
} from './helpers/mediaPlayerHarness';

test.describe('Likes auth and like affordance', () => {
  test('logged-out users see like affordance and login gate without likes API calls', async ({
    page,
  }) => {
    const likesApiCounter = createRequestCounter(
      page,
      /\/playlist\/private\/likes\/(membership|toggle)/i
    );

    await test.step('Open harness in logged-out state', async () => {
      await openMediaPlayerHarness(page);
      await setLoggedInState(page, false);
      await expectLikeAffordanceVisibleWhenLoggedOut(page);
    });

    await test.step('Click like while logged-out triggers login modal and no likes API call', async () => {
      await clickVtsLike(page);
      await expect(page.getByTestId('login-required-modal')).toBeVisible();
      await expect(likesApiCounter.getCount()).toBe(0);
    });

    await test.step('After login, like toggle updates state', async () => {
      await setLoggedInState(page, true);
      await clickVtsLike(page);
      await expect(page.getByTestId('vts-like-heart')).toHaveText('liked');
    });

    likesApiCounter.dispose();
  });
});
