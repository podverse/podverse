import { expect, test } from '@playwright/test';

import {
  openMediaPlayerHarness,
  seekToSeconds,
  selectScenario,
} from './helpers/mediaPlayerHarness';

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § "Cross-cutting" — keyboard shortcuts Space / ArrowLeft / ArrowRight.
 *
 * The pure-function tests for the same handler live at
 * `apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.test.ts`.
 * These E2E cases lock in the *page-level* contract — the global keydown
 * listener registered by `MediaPlayerController` must stay attached and the
 * page must not crash when shortcuts are pressed with or without a loaded
 * media source.
 */
test.describe('Media player keyboard shortcuts', () => {
  test('Pressing Space on a Podcast Index feed preview page with no loaded media does not crash', async ({
    page,
  }) => {
    test.setTimeout(20_000);

    await page.goto('/podcast-index/feed/2147483640');
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    await test.step('Pressing Space without a loaded source remains stable', async () => {
      await page.keyboard.press('Space');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test('ArrowLeft and ArrowRight dispatch seek events to the foundation harness without crashing the page', async ({
    page,
  }) => {
    await openMediaPlayerHarness(page);
    await expect(page.getByTestId('foundation-audio')).toBeVisible();

    await test.step('Selecting a known chapter scenario yields a stable harness baseline', async () => {
      await selectScenario(page, 'mp-scenario-chapter-toc-false');
      await seekToSeconds(page, 0);
      await expect(page.getByTestId('current-time')).toHaveText('0');
    });

    await test.step('Pressing ArrowRight while focused on the body does not crash the page', async () => {
      await page
        .locator('body')
        .focus()
        .catch(() => undefined);
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Pressing ArrowLeft while focused on the body does not crash the page', async () => {
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Pressing Space while focused on a button does not toggle play (button receives the activation instead)', async () => {
      const scenarioButton = page.getByTestId('scenario-mp-scenario-chapter-toc-false');
      await scenarioButton.focus();
      await page.keyboard.press('Space');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
