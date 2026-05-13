import { expect, test } from '@playwright/test';

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 1 "Initial load" — item-music always seeks to 0 regardless of
 *     abridged `p`.
 *   - § 5 "Track-ended" — non add-by-RSS, queue has next →
 *     `setMPShouldPlay(true)` and the next track loads.
 *   - § 4 "AutoQueue transition" — auto-queue does **not** silently resume
 *     the previous track's saved position when transitioning between music
 *     tracks (the "music forces 0" rule applies on every load).
 *
 * Phase 1 keeps this spec fixme-gated because the deterministic E2E seed
 * does not currently include music album/track fixtures plus queue and
 * stored-position state. See `MEDIA-PLAYER-DECISION-MATRIX.md` §
 * "Non-livestream E2E placeholders".
 *
 * Missing seed requirement: add a music album with at least two known tracks,
 * stored abridged `p > 0` for one track, and deterministic queue/auto-queue
 * setup so the spec can prove that music always starts at 0 on explicit
 * play, track-ended, and auto-queue transitions.
 *
 * Pure-function and orchestration coverage exists in
 * `Controller/__tests__/MediaPlayerControllerAV.seekPolicy.test.tsx`.
 */
test.describe('Media player music playback', () => {
  test('Explicitly playing a music track seeks the player to 0 even when a stored position exists', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: music track with stored abridged p > 0 — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });

  test('A music track that ends loads the next queued music track at currentTime 0', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: queue with at least two music tracks — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });

  test("AutoQueue transition between music tracks always starts the next track from 0 and never silently resumes the previous track's saved position", async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: auto-queue scenario for music tracks — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });
});
