import { expect, test } from '@playwright/test';

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 2 "Anonymous restore" — first page load while logged out reads the
 *     `localStorage` snapshot via `AnonymousPlaybackRestoreController` and
 *     resumes via `mediaPlayerResourceUpdate({ mpCurrentTime, mpDuration })`.
 *   - § 2 — on login, snapshot is cleared and restore is skipped on next
 *     page load.
 *
 * Phase 1 keeps this spec fixme-gated because the deterministic E2E seed
 * does not currently include stable podcast/music snapshot targets with
 * known identifiers for `page.addInitScript` localStorage writes. See
 * `MEDIA-PLAYER-DECISION-MATRIX.md` § "Non-livestream E2E placeholders".
 *
 * Missing seed requirement: add known podcast and music items whose ids and
 * id_text values are stable enough to write an anonymous playback snapshot
 * before first page load, plus login wiring to prove snapshot clearing after
 * authentication.
 *
 * Pure-helper coverage for the snapshot read/write/clear contract lives at
 * `apps/web/src/utils/anonymousPlaybackStorage.test.ts`.
 */
test.describe('Media player anonymous playback restore', () => {
  test('First page load while logged out resumes the saved item at the stored position', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: stable podcast snapshot target for page.addInitScript localStorage write — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });

  test('First page load while logged out for a music snapshot starts the track at 0 (music forces 0 on every load)', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: stable music snapshot target — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });

  test('Logging in clears the anonymous snapshot so subsequent reloads do not auto-restore', async ({
    page,
  }) => {
    test.fixme(
      true,
      'Missing deterministic E2E seed: snapshot fixture plus login/clear flow target — see MEDIA-PLAYER-DECISION-MATRIX.md "Non-livestream E2E placeholders".'
    );
    expect(page).toBeTruthy();
  });
});
