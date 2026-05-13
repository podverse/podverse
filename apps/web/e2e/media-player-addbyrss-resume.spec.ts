import { expect, test } from '@playwright/test';

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 1 "Initial load" — add-by-RSS seeks to `addByRSSSeekToTime` when
 *     `>= 0`; otherwise 0.
 *   - § 3 "Queue load" — add-by-RSS queue resource passes
 *     `playback_position` to `playAddByRSS`.
 *   - § 6 "time-update side effects" — `onAddByRSSPositionSave` fires on
 *     play, pause, and every 15 seconds of accumulated playback.
 *
 * Phase 1 keeps this spec fixme-gated because the deterministic E2E seed
 * does not currently include add-by-RSS feed/list context plus persisted
 * `playback_position` rows. See `MEDIA-PLAYER-DECISION-MATRIX.md` §
 * "Non-livestream E2E placeholders".
 *
 * Missing seed requirement: add a deterministic add-by-RSS feed/list entry
 * available to the test API with one resource that has a saved
 * `playback_position` and one without prior playback. Server-side
 * `playback_position` persistence depends on add-by-RSS encryption keys
 * configured via `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` (already set in
 * `playwright.e2e-server-env.ts`).
 */
test.describe('Media player add-by-RSS resume', () => {
  test('Loading an add-by-RSS episode with a saved playback_position seeks to that position on loadedmetadata', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: add-by-RSS resource with saved playback_position — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });

  test('Loading an add-by-RSS episode without a saved playback_position starts at 0', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: add-by-RSS resource without prior playback — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });
});
