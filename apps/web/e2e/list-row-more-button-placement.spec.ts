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
      const playCandidate = actions.previousElementSibling;
      const timeSection = actions.nextElementSibling;
      if (playCandidate === null || timeSection === null) {
        return null;
      }
      const play =
        playCandidate instanceof HTMLButtonElement
          ? playCandidate
          : playCandidate.querySelector('button[aria-label="Play"], button[aria-label="Pause"]');
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

  test('When an episode row is playing, the date stays to the left of the progress bar.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`));

    const moreButton = page.getByRole('button', { name: 'More Options' }).first();
    await expect(moreButton).toBeVisible();
    await moreButton.evaluate((moreEl) => {
      const actions = moreEl.parentElement?.parentElement ?? null;
      const play = actions?.previousElementSibling;
      if (play instanceof HTMLButtonElement) {
        play.click();
      }
    });

    const progress = page.getByTestId('play-button-row-progress').first();
    await expect(progress).toBeVisible();

    const order = await progress.evaluate((bar) => {
      const meta = bar.previousElementSibling;
      if (meta === null || meta.getAttribute('data-testid') !== 'play-button-row-meta') {
        return null;
      }
      const metaBox = meta.getBoundingClientRect();
      const barBox = bar.getBoundingClientRect();
      return {
        metaRight: metaBox.right,
        barLeft: barBox.left,
      };
    });

    expect(order, 'the progress bar follows the date on the playing row').not.toBeNull();
    if (order === null) {
      return;
    }

    expect(order.barLeft).toBeGreaterThanOrEqual(order.metaRight - 1);

    await capturePageLoad(
      page,
      testInfo,
      'The date stays to the left of the progress bar on a playing episode row.',
      progress
    );
  });
});
