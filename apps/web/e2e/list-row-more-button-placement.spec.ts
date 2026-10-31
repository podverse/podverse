import { expect, test } from '@playwright/test';

import { E2E_PODCAST_CHANNEL_ID_TEXT } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('List row more button placement', () => {
  test('On a podcast episode list, More Options sits between Play and the date with even gaps.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`));

    const moreButton = page.getByRole('button', { name: 'More Options' }).first();
    await expect(moreButton).toBeVisible();

    const layout = await moreButton.evaluate((moreEl) => {
      // MoreButton wraps the control in a dropdown div; ItemRowMoreActions wraps that in .actions.
      const dropdown = moreEl.parentElement;
      const actions = dropdown?.parentElement ?? null;
      if (actions === null) {
        return null;
      }
      const playCluster = actions.previousElementSibling;
      const timeSection = actions.nextElementSibling;
      if (playCluster === null || timeSection === null) {
        return null;
      }
      const play = playCluster.querySelector(
        'button[aria-label="Play"], button[aria-label="Pause"]'
      );
      if (play === null) {
        return null;
      }
      const playBox = play.getBoundingClientRect();
      const moreBox = moreEl.getBoundingClientRect();
      const actionsBox = actions.getBoundingClientRect();
      const timeBox = timeSection.getBoundingClientRect();
      return {
        playRight: playBox.right,
        moreLeft: moreBox.left,
        moreRight: moreBox.right,
        timeLeft: timeBox.left,
        gapPlayToActions: actionsBox.left - playBox.right,
        gapActionsToTime: timeBox.left - actionsBox.right,
      };
    });

    expect(layout, 'episode row meta line is in the layout').not.toBeNull();
    if (layout === null) {
      return;
    }

    expect(layout.moreLeft).toBeGreaterThan(layout.playRight - 1);
    expect(layout.timeLeft).toBeGreaterThan(layout.moreRight - 1);
    expect(Math.abs(layout.gapPlayToActions - layout.gapActionsToTime)).toBeLessThanOrEqual(2);

    await capturePageLoad(
      page,
      testInfo,
      'More Options sits between Play and the date on an episode list row.',
      moreButton
    );
  });
});
