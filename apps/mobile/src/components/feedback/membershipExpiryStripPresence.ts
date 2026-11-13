import { useSyncExternalStore } from 'react';

/**
 * Whether the membership expiry strip is on screen.
 *
 * The strip hydrates an AsyncStorage dismissal before it paints, so the tab scaffold reads this
 * store for the overlap margin rather than deriving height from membership state alone. A dismissed
 * or still-loading strip must not reserve space.
 */

type Listener = () => void;

let membershipExpiryStripVisible = false;
const listeners = new Set<Listener>();

const emit = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const getMembershipExpiryStripVisible = (): boolean => membershipExpiryStripVisible;

export const subscribeMembershipExpiryStrip = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setMembershipExpiryStripVisible = (visible: boolean): void => {
  if (visible === membershipExpiryStripVisible) {
    return;
  }
  membershipExpiryStripVisible = visible;
  emit();
};

export function useMembershipExpiryStripVisible(): boolean {
  return useSyncExternalStore(
    subscribeMembershipExpiryStrip,
    getMembershipExpiryStripVisible,
    getMembershipExpiryStripVisible
  );
}
