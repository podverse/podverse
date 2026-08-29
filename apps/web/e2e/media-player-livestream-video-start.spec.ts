import { expect, test } from '@playwright/test';

/**
 * Initial play of a live video stream must use the same source-selection flow as audio and mount
 * the floating video wrapper. The local fixture set does not provide a video `live_item`, so this
 * case remains marked as fixme until a playable video fixture is available.
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
