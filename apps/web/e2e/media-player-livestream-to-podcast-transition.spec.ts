import { expect, test } from '@playwright/test';

/**
 * Matrix cell (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`
 * § 6a "Live-stream / video.js baseline" — "Live → non-live transition"):
 *   - Triggering an explicit play of a regular podcast item while live is
 *     playing must dispose the video.js player, clear the container DOM,
 *     and let the non-live `NonLiveMediaOrchestrator` mount cleanly.
 *
 * Verbatim regression note from
 * `MediaPlayerControllerLiveStreamAV.tsx` bottom-of-file:
 * "Special disposed logic was added to avoid problems with this scenario:
 *  step 1: load a livestream using video js
 *  step 2: a new non-livestream loads with a different controller, and
 *          video js instance disposes
 *  step 3: a new livestream using video js needs to load
 *  the problem is that since the video js instance was disposed, the DOM
 *  no longer has the element needed".
 *
 * **Deferred to Phase 4 HLS migration plan-set.** The current internal
 * seed has no regular (non-live) podcast item with an enclosure for the
 * transition target, and the dispose/recreate dance is only meaningful
 * when actual video.js + non-live media elements both initialize. Phase
 * 4 will choose between extending the seed, adding `page.route` mocks,
 * or using a public test stream. The regression oracle this spec
 * represents must be in place before the Phase 4 plan-set touches
 * `MediaPlayerControllerLiveStreamAV` — see matrix § 6c.
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
