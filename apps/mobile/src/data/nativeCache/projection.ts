/**
 * Native cache projection (car / watch).
 *
 * Dual-store model (see DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1): SQLite is phone-UI-only and is
 * unavailable when the JS runtime is suspended. CarPlay templates, Android Auto
 * `MediaLibraryService`, and watch complications can only read a **native cache**. Repositories
 * that own queue / downloads / library-index state MUST call the matching projection helper on
 * every successful local mutation (and after sync reconcile) so the native cache stays coherent.
 *
 * These are **stubs** until the native cache storage lands in Track 12
 * (`380-native-cache-schema`) + media-engine write hooks (step 2.35). They log in `__DEV__` and
 * no-op in production. Keeping the call sites here now means car/watch work does not have to
 * rewrite repositories later.
 *
 * Queue projection call-site audit (master step 10.22 / detail 331): every persistent server-queue
 * mutation projects exactly once per commit via `queueRepository` — add item/clip next & last,
 * move-now-playing-to-history, and the now-playing / upcoming background syncs (see
 * `projectQueueForQueue`). There is no server `update-is-active` write on mobile yet (the active
 * queue is only in-memory store state in `QueuesProvider` / `useQueueResourcesLoadActive`), and the
 * auto-queue store is in-memory/transient (no persistent commit for car/watch to read); an
 * auto-queue advance materializes a manual-queue move-to-history (which projects) plus a transient
 * now-playing that the Track 12 native-cache now-playing hook will own. Do not project from React
 * providers/screens — projection stays in the data layer.
 *
 * Downloads projection (master step 13.9 / detail 438): `downloadsRepository` rebuilds the full
 * completed-downloads set and calls `projectDownloadsIndexToNativeCache` on every mutation
 * (complete / delete / clear). That now also forwards to the media-engine `writeDownloadsIndex`
 * bridge so offline car browse (Track 12.14) reads local `file://` paths without SQLite. The engine
 * write is best-effort: a projection/bridge failure must never roll back a successful download
 * mutation. Durable native-cache storage still lands in Track 12; the bridge is a logging stub until
 * then (see podverse-media-engine README §native cache).
 */

import { nativePlaybackBridge } from '../../bridge/nativePlaybackBridge';

/** Minimal browse-shaped entry — the real (denormalized) schema is owned by Track 12. */
export type NativeCacheQueueEntry = {
  idText: string;
  title: string;
  artworkUrl: string | null;
  mediaUrl: string | null;
};

export type QueueSnapshotProjection = {
  nowPlayingIdText: string | null;
  entries: NativeCacheQueueEntry[];
};

export type NativeCacheDownloadEntry = {
  idText: string;
  title: string;
  filePath: string;
};

export type DownloadsIndexProjection = {
  entries: NativeCacheDownloadEntry[];
};

export type NativeCacheBrowseNode = {
  idText: string;
  title: string;
  kind: 'podcast' | 'playlist' | 'category';
};

export type LibraryBrowseIndexProjection = {
  nodes: NativeCacheBrowseNode[];
};

const logProjectionStub = (domain: string, payload: unknown): void => {
  if (__DEV__) {
    console.warn(
      `[native-cache] projection stub (${domain}) — Track 12 storage not wired yet`,
      payload
    );
  }
};

export const projectQueueSnapshotToNativeCache = async (
  snapshot: QueueSnapshotProjection
): Promise<void> => {
  logProjectionStub('queue', snapshot);
};

export const projectDownloadsIndexToNativeCache = async (
  index: DownloadsIndexProjection
): Promise<void> => {
  logProjectionStub('downloads', index);
  // Forward to the engine's reserved native-cache write (114 / 2.35). Best-effort: never let a
  // bridge failure (or a JS-only context where the native module is not linked) roll back the
  // successful download mutation that triggered this projection.
  try {
    await nativePlaybackBridge.writeDownloadsIndex(JSON.stringify(index));
  } catch (error) {
    if (__DEV__) {
      console.warn('[native-cache] writeDownloadsIndex bridge unavailable (soft-fail)', error);
    }
  }
};

export const projectLibraryBrowseIndexToNativeCache = async (
  index: LibraryBrowseIndexProjection
): Promise<void> => {
  logProjectionStub('library-browse', index);
};
