/**
 * Lightweight home-feed invalidation (same idea as `downloadManager.subscribe`).
 *
 * Authenticated Home uses `type: 'subscribed'`. Follow/unfollow can happen from any stack
 * (Search podcast detail, Home detail, future surfaces). Call `notify()` after a successful
 * mutation; HomeScreen reloads when it receives the signal (tabs stay mounted).
 *
 * Prefer this over:
 * - Refetch-on-every-focus (noisy / redundant while browsing Home)
 * - React Context only for “bump” (harder to call from non-React helpers later)
 * - A general-purpose app event bus (overkill for one consumer today)
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let generation = 0;

export const homeFeedRefresh = {
  /** Monotonic counter; useful for focus-time “did something change?” checks. */
  getGeneration: (): number => generation,

  /** Broadcast that subscribed Home data may be stale. */
  notify: (): void => {
    generation += 1;
    for (const listener of listeners) {
      listener();
    }
  },

  /** Subscribe to invalidation; returns unsubscribe. */
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
