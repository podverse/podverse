import type { Page } from '@playwright/test';

/**
 * Anonymous playback snapshot helper for Playwright specs.
 *
 * Mirrors the production writer/reader in
 * `apps/web/src/utils/anonymousPlaybackStorage.ts` so logged-out E2E specs
 * can prime `localStorage` before navigation, then assert that
 * `AnonymousPlaybackRestoreController`
 * (`apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx`)
 * either replays the snapshot or clears it after login.
 *
 * The localStorage key matches `LOCAL_STORAGE.ANONYMOUS_LAST_PLAYBACK_KEY`
 * in `apps/web/src/constants/localStorage.ts`. The snapshot version and
 * field names match `AnonymousPlaybackSnapshotV1` in
 * `anonymousPlaybackStorage.ts`. If the production shape changes, update
 * this helper in lockstep.
 *
 * Note: the production `AnonymousPlaybackKind` union is
 * `'item' | 'clip' | 'item_soundbite'`. Music tracks use `'item'`; the
 * music-specific seek-to-zero behavior is applied at runtime via the
 * channel's `medium_id`, not via a separate snapshot kind.
 */

export const ANONYMOUS_PLAYBACK_SNAPSHOT_LOCAL_STORAGE_KEY = 'pv_web_anonymous_last_playback';

export const ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION = 1 as const;

export type AnonymousSnapshotKind = 'item' | 'clip' | 'item_soundbite';

export type AnonymousSnapshotPayload = {
  v: typeof ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION;
  kind: AnonymousSnapshotKind;
  id_text: string;
  playback_position_seconds: number;
  media_file_duration_seconds?: number;
  updated_at: string;
};

export type WriteAnonymousSnapshotArgs = {
  kind: AnonymousSnapshotKind;
  itemIdText: string;
  playbackPositionSeconds: number;
  mediaFileDurationSeconds?: number;
  updatedAtIso?: string;
};

function buildSnapshotPayload(args: WriteAnonymousSnapshotArgs): AnonymousSnapshotPayload {
  const snapshot: AnonymousSnapshotPayload = {
    v: ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION,
    kind: args.kind,
    id_text: args.itemIdText,
    playback_position_seconds: args.playbackPositionSeconds,
    updated_at: args.updatedAtIso ?? new Date().toISOString(),
  };
  if (args.mediaFileDurationSeconds !== undefined) {
    snapshot.media_file_duration_seconds = args.mediaFileDurationSeconds;
  }
  return snapshot;
}

/**
 * Register an init script on `page` that writes the snapshot to
 * `localStorage` before any document scripts run on every navigation.
 * The snapshot is serialized to JSON in Node and passed as a string so
 * the browser-side callback does no work beyond a `setItem` call.
 */
export async function writeAnonymousSnapshotBeforeNavigation(
  page: Page,
  args: WriteAnonymousSnapshotArgs
): Promise<void> {
  const serialized = JSON.stringify(buildSnapshotPayload(args));
  await page.addInitScript(
    ({ storageKey, payload }) => {
      window.localStorage.setItem(storageKey, payload);
    },
    {
      storageKey: ANONYMOUS_PLAYBACK_SNAPSHOT_LOCAL_STORAGE_KEY,
      payload: serialized,
    }
  );
}

/**
 * Register an init script on `page` that removes the snapshot key
 * before any document scripts run. Useful when a test needs to prove
 * that `clearAnonymousPlaybackSnapshot()` ran (e.g. on login) by
 * starting from a known-empty state, or to reset state between
 * navigations within a single test.
 */
export async function clearAnonymousSnapshotBeforeNavigation(page: Page): Promise<void> {
  await page.addInitScript((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, ANONYMOUS_PLAYBACK_SNAPSHOT_LOCAL_STORAGE_KEY);
}

/**
 * Read the current snapshot string directly from the page's
 * `localStorage`. Returns `null` if the key is unset. The string is
 * intentionally not parsed so callers can assert exact JSON shape if
 * needed.
 */
export async function readAnonymousSnapshotFromPage(page: Page): Promise<string | null> {
  return page.evaluate((storageKey) => {
    return window.localStorage.getItem(storageKey);
  }, ANONYMOUS_PLAYBACK_SNAPSHOT_LOCAL_STORAGE_KEY);
}
