/**
 * Native cache projection (car / watch).
 *
 * Dual-store model (see DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1): SQLite is phone-UI-only and is
 * unavailable when the JS runtime is suspended. CarPlay templates, Android Auto
 * `MediaLibraryService`, and watch complications can only read a **native cache**. Repositories
 * that own queue / downloads / library-index state MUST call the matching projection helper on
 * every successful local mutation (and after sync reconcile) so the native cache stays coherent.
 *
 * Write path (master step 12.4): each helper stamps the versioned envelope (12.1 / `380`) and
 * forwards the JSON to the media-engine bridge (`writeQueueSnapshot` / `writeDownloadsIndex` /
 * `writeLibraryBrowseIndex`, step 2.35 / detail 114), which persists durably on device (iOS
 * `PodverseNativeCache` 12.2 / Android `PodverseNativeCache` 12.3). Bridge writes are **best-effort
 * and soft-fail**: a failure (or a JS-only context where the native module is not linked, e.g.
 * unit tests) must never roll back the SQLite mutation that triggered the projection. In `__DEV__`
 * a failure logs once.
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
 * (complete / delete / clear) so offline car browse (Track 12.14) reads local `file://` paths
 * without SQLite.
 *
 * Library-browse projection (master step 12.4): `accountRepository` projects a browse index derived
 * from the account's add-by-RSS followed channels on snapshot save/clear. Followed
 * channel/playlist entities (numeric-id-only in `DTOAccount`) need hydration before they can be
 * browse nodes — a fuller library index store is future work (Track 12.12).
 */

import { nativePlaybackBridge } from '../../bridge/nativePlaybackBridge';

/**
 * Canonical native-cache schema version (master step 12.1 / detail 380). Bump only on a
 * **breaking** payload change (removing or repurposing a required field). Native readers ignore
 * unknown keys, so additive optional fields do **not** require a bump. Track 12 durable storage
 * (12.2–12.3) and native car readers consume payloads tagged with this version.
 */
export const NATIVE_CACHE_SCHEMA_VERSION = 1 as const;

export type NativeCacheSchemaVersion = typeof NATIVE_CACHE_SCHEMA_VERSION;

/**
 * Denormalized queue entry for car/watch now-playing + skip/advance. Required fields must always be
 * present; optional fields are additive (see schema versioning above). No SQLite/Drizzle types.
 */
export type NativeCacheQueueEntry = {
  idText: string;
  title: string;
  artworkUrl: string | null;
  /** Remote enclosure or local `file://` playback URL; `null` until resolved (Track 12.15). */
  mediaUrl: string | null;
  durationMs?: number | null;
  podcastTitle?: string | null;
};

export type QueueSnapshotProjection = {
  nowPlayingIdText: string | null;
  entries: NativeCacheQueueEntry[];
};

export type NativeCacheDownloadEntry = {
  idText: string;
  title: string;
  /** Absolute sandbox path readable by the native car process (see Track 13 / detail 438). */
  filePath: string;
  artworkUrl?: string | null;
  mediaUrl?: string | null;
  bytes?: number | null;
};

export type DownloadsIndexProjection = {
  entries: NativeCacheDownloadEntry[];
};

export type NativeCacheBrowseNode = {
  idText: string;
  title: string;
  kind: 'podcast' | 'playlist' | 'category';
  artworkUrl?: string | null;
  childCount?: number | null;
};

export type LibraryBrowseIndexProjection = {
  nodes: NativeCacheBrowseNode[];
};

/** Common envelope stamped on every persisted payload so native readers can validate the shape. */
type NativeCacheEnvelope = {
  schemaVersion: NativeCacheSchemaVersion;
  /** Epoch millis when JS produced the snapshot (native staleness / ordering). */
  updatedAtMs: number;
};

export type QueueSnapshotCachePayload = NativeCacheEnvelope & QueueSnapshotProjection;
export type DownloadsIndexCachePayload = NativeCacheEnvelope & DownloadsIndexProjection;
export type LibraryBrowseIndexCachePayload = NativeCacheEnvelope & LibraryBrowseIndexProjection;

const nowMs = (updatedAtMs?: number): number =>
  updatedAtMs !== undefined ? updatedAtMs : Date.now();

/** Wrap a queue snapshot in the versioned native-cache envelope (pure). */
export const buildQueueSnapshotPayload = (
  snapshot: QueueSnapshotProjection,
  updatedAtMs?: number
): QueueSnapshotCachePayload => ({
  schemaVersion: NATIVE_CACHE_SCHEMA_VERSION,
  updatedAtMs: nowMs(updatedAtMs),
  ...snapshot,
});

/** Wrap a downloads index in the versioned native-cache envelope (pure). */
export const buildDownloadsIndexPayload = (
  index: DownloadsIndexProjection,
  updatedAtMs?: number
): DownloadsIndexCachePayload => ({
  schemaVersion: NATIVE_CACHE_SCHEMA_VERSION,
  updatedAtMs: nowMs(updatedAtMs),
  ...index,
});

/** Wrap a library browse index in the versioned native-cache envelope (pure). */
export const buildLibraryBrowseIndexPayload = (
  index: LibraryBrowseIndexProjection,
  updatedAtMs?: number
): LibraryBrowseIndexCachePayload => ({
  schemaVersion: NATIVE_CACHE_SCHEMA_VERSION,
  updatedAtMs: nowMs(updatedAtMs),
  ...index,
});

type NativeCacheWriteMethod =
  'writeQueueSnapshot' | 'writeDownloadsIndex' | 'writeLibraryBrowseIndex';

/**
 * Serialize + forward a versioned payload to the durable native-cache bridge write. Best-effort:
 * a bridge failure (or unlinked native module in a JS-only context) is swallowed after a single
 * `__DEV__` warning so the caller's SQLite mutation is never rolled back.
 */
const writeToNativeCache = async (
  method: NativeCacheWriteMethod,
  payload: unknown
): Promise<void> => {
  try {
    await nativePlaybackBridge[method](JSON.stringify(payload));
  } catch (error) {
    if (__DEV__) {
      console.warn(`[native-cache] ${method} bridge unavailable (soft-fail)`, error);
    }
  }
};

export const projectQueueSnapshotToNativeCache = async (
  snapshot: QueueSnapshotProjection
): Promise<void> => {
  await writeToNativeCache('writeQueueSnapshot', buildQueueSnapshotPayload(snapshot));
};

export const projectDownloadsIndexToNativeCache = async (
  index: DownloadsIndexProjection
): Promise<void> => {
  await writeToNativeCache('writeDownloadsIndex', buildDownloadsIndexPayload(index));
};

export const projectLibraryBrowseIndexToNativeCache = async (
  index: LibraryBrowseIndexProjection
): Promise<void> => {
  await writeToNativeCache('writeLibraryBrowseIndex', buildLibraryBrowseIndexPayload(index));
};
