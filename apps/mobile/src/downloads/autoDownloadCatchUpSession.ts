/**
 * One catch-up per time the app comes to the foreground. Channel sync that is still queued for
 * that open defers evaluate so the newest episodes can be compared across podcasts first.
 * Later refreshes in the same visit enqueue new episodes without the cap.
 */

let needsCatchUp = false;
let syncStartedSinceRequest = false;

/** Call when the app starts or returns to the foreground, before that visit's sync is queued. */
export const requestAutoDownloadCatchUp = (): void => {
  needsCatchUp = true;
  syncStartedSinceRequest = false;
};

/** The sync queue has begun the visit's work, so an idle transition is the end of that work. */
export const noteAutoDownloadSyncRunning = (): void => {
  if (needsCatchUp) {
    syncStartedSinceRequest = true;
  }
};

/**
 * This visit queued no sync (or the queue is already idle). The catch-up can run without waiting
 * for a drain that will not happen.
 */
export const markAutoDownloadCatchUpReady = (): void => {
  if (needsCatchUp) {
    syncStartedSinceRequest = true;
  }
};

/**
 * True when a catch-up was requested and the queue has since run (or was marked ready) and is idle.
 * Does not consume the request.
 */
export const isAutoDownloadCatchUpReady = (isIdle: boolean): boolean => {
  return isIdle && needsCatchUp && syncStartedSinceRequest;
};

/**
 * True once, when the queue has drained after a requested catch-up. Channel jobs use
 * {@link shouldDeferAutoDownloadEvaluateToCatchUp} until this returns true.
 */
export const takeAutoDownloadCatchUpIfReady = (isIdle: boolean): boolean => {
  if (!isIdle || !needsCatchUp || !syncStartedSinceRequest) {
    return false;
  }
  needsCatchUp = false;
  syncStartedSinceRequest = false;
  return true;
};

/** Per-channel evaluate waits while this visit's catch-up has not run yet. */
export const shouldDeferAutoDownloadEvaluateToCatchUp = (): boolean => {
  return needsCatchUp;
};
