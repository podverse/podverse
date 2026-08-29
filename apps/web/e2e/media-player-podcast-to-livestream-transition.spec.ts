import { expect, test } from '@playwright/test';

/**
 * Transitioning from a regular podcast item to a live stream must unmount the non-live media
 * element and mount the live-stream controller without double audio or a stuck interface. The
 * local fixture set does not provide both playable targets, so the case remains marked as fixme.
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
