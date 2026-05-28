import { expect, test } from '@playwright/test';

/**
 * Matrix cell (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`
 * § 6a "Live-stream / video.js baseline" — "Non-live → live transition"):
 *   - Transitioning from a regular podcast item to a live stream must
 *     unmount the non-live `<audio>` / `<video>` and mount the video.js
 *     controller without double-audio or stuck UI.
 *
 * **Deferred to Phase 4 HLS migration plan-set** (reverse direction of
 * the livestream-to-podcast transition). The current internal seed has
 * no regular (non-live) podcast item with an enclosure to start from
 * and no live stream that actually loads (no enclosure URL in
 * `live_item`). Same Phase 4 prerequisites apply — see matrix § 6c
 * "Deferred to Phase 4".
 */
test.describe('Media player podcast to live-stream transition', () => {
  test('Transitioning from a regular podcast item to a live audio stream pauses the non-live element and starts video.js cleanly', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Deferred to Phase 4 HLS migration plan-set — see MEDIA-PLAYER-DECISION-MATRIX.md § 6c "Deferred to Phase 4".'
    );
    expect(page).toBeTruthy();
  });
});
