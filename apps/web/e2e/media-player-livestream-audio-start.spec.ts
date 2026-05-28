import { expect, test } from '@playwright/test';

/**
 * Matrix cell (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`
 * § 6a "Live-stream / video.js baseline" and § 6c "Test feed selection"):
 *   - Loading the seeded internal live-audio item must not crash the
 *     page and must not produce a stray non-live `<audio>` element with
 *     a `src` attribute (which would indicate the wrong controller
 *     mounted).
 *
 * Phase 1 scope (documented in matrix § 6c) is **controller-plumbing
 * assertions only** — the seeded `live_item` has no enclosure URL, so
 * neither video.js nor the non-live AV controller actually starts a
 * stream. The spec deliberately does not press play, does not seek, and
 * does not assert `mpIsPlaying`. Phase 4's HLS migration plan-set is
 * responsible for upgrading this spec (seed extension, mocked HLS, or
 * real test stream) once the live-stream code path is being modified.
 *
 * This is intentionally a thin regression oracle: it guards the
 * navigation + controller-tree-mount surface that does not change
 * between Phase 1 and Phase 4 but absolutely will change inside Phase 4
 * (when video.js is replaced by the unified `<MediaElement>`).
 */
test.describe('Media player live-stream audio start (controller plumbing)', () => {
  test('Navigating into the seeded livestream item renders the media player tree without crashing', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await test.step('Open the seeded livestream channel page', async () => {
      await page.goto('/podcast/v5fCrIj9Io');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Navigate to the seeded livestream detail page', async () => {
      const livestreamLink = page.locator('a[href*="/podcast/livestream/"]').first();
      await expect(livestreamLink).toBeVisible({ timeout: 15_000 });
      await livestreamLink.click();
      await expect(page).toHaveURL(/\/podcast\/livestream\//);
    });

    await test.step('The media player aside is attached to the DOM (controller tree mounted; Phase 1 does not press play, so visibility is not asserted — see matrix § 6c)', async () => {
      await expect(page.locator('aside#media-player')).toBeAttached();
    });

    await test.step('No non-live `<audio>` element has a real `src` set (controller selection has not fallen back to the non-live AV controller)', async () => {
      const audioWithSrc = page.locator('audio[src]');
      await expect(audioWithSrc).toHaveCount(0);
    });
  });
});
