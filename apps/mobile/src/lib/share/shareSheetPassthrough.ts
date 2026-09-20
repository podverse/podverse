/**
 * A system share sheet lives in another window. The tap that dismisses it is also delivered to
 * the app underneath (artwork, transport, chips). The session is active only while that sheet
 * is up; the swallow layer hides as soon as it eats that tap or the sheet settles.
 */

/** Wait for the triggering Pressable to finish before the OS sheet presents. */
export const SHARE_PRESENT_DELAY_MS = 50;

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

/** The dismiss tap has been swallowed — drop the session so the next press reaches the app. */
export const consumeShareSheetPassthroughTap = (): void => {
  setSessionActive(false);
};

/**
 * Present a system share sheet after the current press ends. The passthrough session stays
 * active until the sheet settles or the swallow layer eats the dismiss tap.
 */
export const presentShareSheet = (share: () => Promise<unknown>): Promise<void> => {
  setSessionActive(true);
  return new Promise((resolve) => {
    setTimeout(() => {
      void Promise.resolve()
        .then(() => share())
        .catch(() => undefined)
        .finally(() => {
          setSessionActive(false);
          resolve();
        });
    }, SHARE_PRESENT_DELAY_MS);
  });
};
