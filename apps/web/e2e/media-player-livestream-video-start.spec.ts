import { expect, test } from '@playwright/test';

/**
 * Matrix cell (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`
 * § 6a "Live-stream / video.js baseline" and § 6c
 * "Deferred to Phase 4"):
 *   - Initial play of a live **video** stream: same source selection
 *     flow as audio plus the `MediaPlayerLivestreamVideoPortalFloating`
 *     wrapper.
 *
 * **Deferred to Phase 4 HLS migration plan-set.** The current internal
 * seed has no video `live_item`. Phase 4 will choose between (a)
 * extending the seed with a video live item + mocked HLS URL, (b)
 * adding Playwright `page.route` HLS mocks, or (c) pointing at a public
 * HLS test stream gated by `E2E_LIVE_FEEDS_OK`. The decision belongs to
 * the plan-set that actually modifies live-stream behavior, not to
 * Phase 1.
 */
test.describe('Media player live-stream video start', () => {
  test('Starting a live video stream initializes video.js and mounts the floating portal video wrapper', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Deferred to Phase 4 HLS migration plan-set — see MEDIA-PLAYER-DECISION-MATRIX.md § 6c "Deferred to Phase 4".'
    );
    expect(page).toBeTruthy();
  });
});
