import { expect, test } from '@playwright/test';

/**
 * These cases cover transitions between live playback and regular podcast playback. The local
 * fixture set does not provide a regular podcast item with an enclosure for the transition target,
 * so the cases remain marked as fixme. Keep the cases here so the fixture and media lifecycle can be
 * verified together when that target is available.
 */
test.describe('Media player live-stream to podcast transition', () => {
  test('Transitioning from a live audio stream to a regular podcast item leaves a single clean audio element and no stuck UI', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Deferred to Phase 4 HLS migration plan-set — see MEDIA-PLAYER-DECISION-MATRIX.md § 6c "Deferred to Phase 4".'
    );
    expect(page).toBeTruthy();
  });

  test('Re-playing a live audio stream after a podcast item recreates the video.js DOM element without errors', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Deferred to Phase 4 HLS migration plan-set — see MEDIA-PLAYER-DECISION-MATRIX.md § 6c "Deferred to Phase 4".'
    );
    expect(page).toBeTruthy();
  });
});
