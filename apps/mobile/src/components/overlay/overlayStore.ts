import type { ReactNode } from 'react';

export type OverlayEntry = {
  closing: boolean;
  id: string;
  node: ReactNode;
};

/**
 * Registry behind `OverlayHostProvider`. Entries stay in the order they were opened, so an overlay
 * raised from another overlay stacks above it. An entry marked `closing` keeps that index until it
 * is removed, so a reopen of the same id does not jump the stack.
 *
 * Deliberately not React state: the provider sits above the whole app, and putting the open set in
 * its state would re-render every screen each time a dialog opens. Subscribers (the outlet and the
 * accessibility shield) are the only components that need to react.
 */
export type OverlayStore = {
  beginClose: (id: string) => void;
  getEntries: () => readonly OverlayEntry[];
  removeEntry: (id: string) => void;
  setEntry: (id: string, node: ReactNode) => void;
  subscribe: (listener: () => void) => () => void;
};

export const createOverlayStore = (): OverlayStore => {
  let entries: readonly OverlayEntry[] = [];
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  return {
    beginClose: (id) => {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index === -1) {
        return;
      }
      const current = entries[index];
      if (current === undefined || current.closing) {
        return;
      }
      const updated = [...entries];
      updated[index] = { ...current, closing: true };
      entries = updated;
      emit();
    },
    getEntries: () => entries,
    removeEntry: (id) => {
      const remaining = entries.filter((entry) => entry.id !== id);
      if (remaining.length === entries.length) {
        return;
      }
      entries = remaining;
      emit();
    },
    setEntry: (id, node) => {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index === -1) {
        entries = [...entries, { closing: false, id, node }];
      } else {
        const updated = [...entries];
        updated[index] = { closing: false, id, node };
        entries = updated;
      }
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
