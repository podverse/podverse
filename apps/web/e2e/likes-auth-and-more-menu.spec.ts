import { expect, test } from '@playwright/test';

import { expectLikeAffordanceVisibleWhenLoggedOut } from './helpers/mediaPlayerAssertions';
import { createRequestCounter } from './helpers/networkGuards';
import {
  clickVtsLike,
  openMediaPlayerHarness,
  setLoggedInState,
} from './helpers/mediaPlayerHarness';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Likes auth and like affordance', () => {
  test('logged-out users see like affordance and login gate without likes API calls', async ({
    page,
  }, testInfo) => {
    const likesApiCounter = createRequestCounter(
      page,
      /\/playlist\/private\/likes\/(membership|toggle)/i
    );

    await test.step('Open harness in logged-out state', async () => {
      await openMediaPlayerHarness(page);
      await setLoggedInState(page, false);
      await expectLikeAffordanceVisibleWhenLoggedOut(page);

      await capturePageLoad(
        page,
        testInfo,
        'The media player harness shows the like affordance while logged out.'
      );
    });

    await test.step('Click like while logged-out triggers login modal and no likes API call', async () => {
      await clickVtsLike(page);
      await expect(page.getByTestId('login-required-modal')).toBeVisible();
      await expect(likesApiCounter.getCount()).toBe(0);

      await capturePageLoad(
        page,
        testInfo,
        'Clicking like while logged out opens the login-required modal.',
        page.getByTestId('login-required-modal')
      );
    });

    await test.step('After login, like toggle updates state', async () => {
      await setLoggedInState(page, true);
      await clickVtsLike(page);
      await expect(page.getByTestId('vts-like-heart')).toHaveText('liked');

      await capturePageLoad(
        page,
        testInfo,
        'After login, the like toggle shows the liked state.',
        page.getByTestId('vts-like-heart')
      );
    });

    likesApiCounter.dispose();
  });
});
