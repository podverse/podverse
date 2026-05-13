import { expect, test } from '@playwright/test';

/**
 * Matrix cell (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 1 "Initial load" — chapter seek → `start_time` on `loadedmetadata`
 *     when `mpItemChapter` is set with `mpItemChapterShouldSeek = true`.
 *   - § 6 "time-update" — `mpItemChapter` updates as `currentTime` walks
 *     into the next chapter (handled separately in
 *     `MediaPlayerControllerAV.timeUpdate.test.tsx`).
 *
 * Phase 1 keeps this spec fixme-gated because the deterministic E2E seed
 * does not currently include a real episode page with short, deterministic
 * chapters. See `MEDIA-PLAYER-DECISION-MATRIX.md` §
 * "Non-livestream E2E placeholders".
 *
 * Missing seed requirement: add a known podcast item with at least two
 * chapters whose `start_time` / `end_time` values fall inside the first
 * ~30 seconds of playback. The spec should then click a real chapter row
 * and verify both `loadedmetadata` seek and time-update chapter switching.
 *
 * The pure-function coverage for the selection helper lives at
 * `selectItemChapterForTime.test.ts`; the existing foundation harness
 * covers overlay resolution, but not the real episode-page chapter click.
 */
test.describe('Media player chapter seek', () => {
  test('Clicking a chapter row on an episode page seeks the player to chapter.start_time on next loadedmetadata', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: podcast item with at least two short chapters — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });

  test('Playing past a chapter end_time updates mpItemChapter to the next overlapping chapter', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: podcast item with chapter boundaries observable within the test budget — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });
});
