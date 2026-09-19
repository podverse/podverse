/**
 * A system share sheet lives in another window. The tap that dismisses it is also delivered to
 * the app underneath (artwork, transport, chips) on both iOS and Android. This session stays
 * active for the whole sheet plus a short beat after dismiss so that tap can be swallowed.
 */

/** Wait for the triggering Pressable to finish before the OS sheet presents. */
export const SHARE_PRESENT_DELAY_MS = 50;

/** Backdrop-dismiss taps arrive in the same turn the sheet promise settles — keep eating them. */
export const SHARE_DISMISS_TAP_GUARD_MS = 500;

type Listener = () => void;

const listeners = new Set<Listener>();
let sessionActive = false;

const setSessionActive = (next: boolean): void => {
  if (sessionActive === next) {
    return;
  }
  sessionActive = next;
  for (const listener of listeners) {
    listener();
  }
};

export const isShareSheetPassthroughWindow = (): boolean => {
  return sessionActive;
};

export const subscribeShareSheetPassthrough = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Present a system share sheet after the current press ends. The passthrough session stays
 * active until shortly after the sheet settles so a dismiss tap does not reach app chrome.
 */
export const presentShareSheet = (share: () => Promise<unknown>): Promise<void> => {
  setSessionActive(true);
  return new Promise((resolve) => {
    setTimeout(() => {
      void Promise.resolve()
        .then(() => share())
        .catch(() => undefined)
        .finally(() => {
          setTimeout(() => {
            setSessionActive(false);
            resolve();
          }, SHARE_DISMISS_TAP_GUARD_MS);
        });
    }, SHARE_PRESENT_DELAY_MS);
  });
};
