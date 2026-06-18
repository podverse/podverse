import { expect, test } from '@playwright/test';

import { expectOverlayState } from './helpers/mediaPlayerAssertions';
import {
  openMediaPlayerHarness,
  seekToSeconds,
  selectScenario,
} from './helpers/mediaPlayerHarness';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Media player foundation harness', () => {
  test('can open harness, seek deterministically, and assert overlay', async ({
    page,
  }, testInfo) => {
    await test.step('Open deterministic harness page', async () => {
      await openMediaPlayerHarness(page);
      await expect(page.getByTestId('foundation-audio')).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The media player foundation harness page loads with the audio element visible.'
      );
    });

    await test.step('Select chapter toc:false scenario and seek', async () => {
      await selectScenario(page, 'mp-scenario-chapter-toc-false');
      await seekToSeconds(page, 10);
      await expect(page.getByTestId('current-time')).toHaveText('10');
      await expectOverlayState(page, 'tocFalse', 'Inner toc:false chapter');

      await capturePageLoad(
        page,
        testInfo,
        'The toc:false chapter overlay is visible after seeking to 10 seconds.'
      );
    });
  });
});
