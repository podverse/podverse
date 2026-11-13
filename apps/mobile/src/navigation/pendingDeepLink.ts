/**
 * Warm deep links (push taps, banner taps, inbox taps) share one buffer. App.tsx owns the React
 * state; this module is the seam those openers call into.
 */

type PendingDeepLinkHandler = (url: string) => void;

let handler: PendingDeepLinkHandler | null = null;

export const setPendingDeepLinkHandler = (next: PendingDeepLinkHandler | null): void => {
  handler = next;
};

export const queuePendingDeepLink = (url: string): void => {
  if (handler === null) {
    return;
  }
  handler(url);
};
