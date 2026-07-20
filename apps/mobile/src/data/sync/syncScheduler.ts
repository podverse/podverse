/**
 * Generic read-through / write-behind primitives for repositories. Domain repositories compose
 * these so every domain shares the same offline-first semantics (see
 * DOCS-MOBILE-DATA-LAYER-OFFLINE.md §4).
 */

export type ReadThroughOptions<T> = {
  /** Read the current value from the local DB (must be fast; instant UI). */
  readLocal: () => Promise<T>;
  /** True when the local value is missing/expired and a background fetch should run. */
  isStale: () => Promise<boolean>;
  /** Fetch from the API and upsert into the local DB. Runs in the background. */
  fetchRemote: () => Promise<void>;
  /** Optional soft-failure handler; sync errors must not break the local read. */
  onError?: (error: unknown) => void;
};

/**
 * Return the local value immediately; if stale, kick off a background fetch that upserts the DB.
 * The returned promise never waits on the network — callers re-read (or observe) the DB after
 * `fetchRemote` completes.
 */
export const readThrough = async <T>(options: ReadThroughOptions<T>): Promise<T> => {
  const local = await options.readLocal();

  if (await options.isStale()) {
    void options.fetchRemote().catch((error) => {
      options.onError?.(error);
      if (__DEV__ && options.onError === undefined) {
        console.warn('[sync] background fetch failed', error);
      }
    });
  }

  return local;
};

export type ReadThroughOrFetchOptions<T> = {
  /** Read the current value from the local DB; `null` means cache miss. */
  readLocal: () => Promise<T | null>;
  /** True when a present local value is expired and should refresh in the background. */
  isStale: () => Promise<boolean>;
  /** Fetch from the API, upsert into the local DB, and return the fresh value. */
  fetchRemote: () => Promise<T>;
  /** Soft-failure handler; a background refresh error must not break the local read. */
  onError?: (error: unknown) => void;
};

/**
 * Offline-first read used by repositories that must return data on first load:
 * - cache miss → `await fetchRemote()` (so the initial screen render gets data; returns `null` if
 *   the fetch fails, e.g. offline with no cache yet)
 * - cache hit → return the local value immediately; if stale, refresh in the background
 */
export const readThroughOrFetch = async <T>(
  options: ReadThroughOrFetchOptions<T>
): Promise<T | null> => {
  const local = await options.readLocal();

  if (local === null) {
    try {
      return await options.fetchRemote();
    } catch (error) {
      options.onError?.(error);
      if (__DEV__ && options.onError === undefined) {
        console.warn('[sync] initial fetch failed with empty cache', error);
      }
      return null;
    }
  }

  if (await options.isStale()) {
    void options.fetchRemote().catch((error) => {
      options.onError?.(error);
      if (__DEV__ && options.onError === undefined) {
        console.warn('[sync] background refresh failed', error);
      }
    });
  }

  return local;
};

export type WriteBehindOptions<T> = {
  /** Optimistic local write; return value is passed to `pushRemote` / `reconcile`. */
  writeLocal: () => Promise<T>;
  /** Push the mutation to the API. */
  pushRemote: (local: T) => Promise<void>;
  /** Reconcile local state after a successful push (e.g. replace optimistic ids). */
  reconcile?: (local: T) => Promise<void>;
  /** Roll back / mark conflict when the push fails. */
  rollback?: (local: T, error: unknown) => Promise<void>;
};

/**
 * Optimistic local write, then push to the API. On failure, `rollback` runs and the error is
 * rethrown so callers can surface it. Callers should project to the native cache after this
 * resolves for car/watch domains.
 */
export const writeBehind = async <T>(options: WriteBehindOptions<T>): Promise<T> => {
  const local = await options.writeLocal();

  try {
    await options.pushRemote(local);
    await options.reconcile?.(local);
    return local;
  } catch (error) {
    await options.rollback?.(local, error);
    throw error;
  }
};
