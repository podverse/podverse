import { expect, test } from '@playwright/test';

import {
  openMediaPlayerHarness,
  seekToSeconds,
  selectScenario,
} from './helpers/mediaPlayerHarness';
import { expectOverlayState } from './helpers/mediaPlayerAssertions';

test.describe('Media player foundation harness', () => {
  test('can open harness, seek deterministically, and assert overlay', async ({ page }) => {
    await test.step('Open deterministic harness page', async () => {
      await openMediaPlayerHarness(page);
      await expect(page.getByTestId('foundation-audio')).toBeVisible();
    });

    await test.step('Select chapter toc:false scenario and seek', async () => {
      await selectScenario(page, 'mp-scenario-chapter-toc-false');
      await seekToSeconds(page, 10);
      await expect(page.getByTestId('current-time')).toHaveText('10');
      await expectOverlayState(page, 'tocFalse', 'Inner toc:false chapter');
    });
  });
});
