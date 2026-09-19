import { describe, expect, it, vi } from 'vitest';

import { createOverlayStore } from './overlayStore';

describe('createOverlayStore', () => {
  // Open order is stack order: an overlay raised from another overlay has to render above it.
  it('keeps entries in the order they were opened and updates in place', () => {
    const store = createOverlayStore();

    store.setEntry('sheet', 'sheet-v1');
    store.setEntry('dialog', 'dialog');
    store.setEntry('sheet', 'sheet-v2');

    expect(store.getEntries()).toEqual([
      { closing: false, id: 'sheet', node: 'sheet-v2' },
      { closing: false, id: 'dialog', node: 'dialog' },
    ]);
  });

  it('notifies subscribers on open, update, and close', () => {
    const store = createOverlayStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setEntry('dialog', 'a');
    store.setEntry('dialog', 'b');
    store.removeEntry('dialog');

    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.setEntry('dialog', 'c');

    expect(listener).toHaveBeenCalledTimes(3);
  });

  // Closing twice happens whenever an unmount follows a `visible: false` render.
  it('ignores removal of an entry that is not open', () => {
    const store = createOverlayStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.removeEntry('dialog');

    expect(listener).not.toHaveBeenCalled();
    expect(store.getEntries()).toEqual([]);
  });

  it('marks only the named entry as closing', () => {
    const store = createOverlayStore();

    store.setEntry('sheet', 'sheet');
    store.setEntry('dialog', 'dialog');
    store.beginClose('sheet');

    expect(store.getEntries()).toEqual([
      { closing: true, id: 'sheet', node: 'sheet' },
      { closing: false, id: 'dialog', node: 'dialog' },
    ]);
  });

  it('clears closing when the same id is set again', () => {
    const store = createOverlayStore();

    store.setEntry('dialog', 'a');
    store.beginClose('dialog');
    store.setEntry('dialog', 'b');

    expect(store.getEntries()).toEqual([{ closing: false, id: 'dialog', node: 'b' }]);
  });

  it('does not notify when beginClose targets an unknown id', () => {
    const store = createOverlayStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.beginClose('dialog');

    expect(listener).not.toHaveBeenCalled();
    expect(store.getEntries()).toEqual([]);
  });

  it('does not notify when beginClose targets an entry that is already closing', () => {
    const store = createOverlayStore();
    store.setEntry('dialog', 'a');
    store.beginClose('dialog');

    const listener = vi.fn();
    store.subscribe(listener);
    store.beginClose('dialog');

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps stack order across close and reopen', () => {
    const store = createOverlayStore();

    store.setEntry('sheet', 'sheet');
    store.setEntry('dialog', 'dialog');
    store.beginClose('sheet');
    store.setEntry('sheet', 'sheet-again');

    expect(store.getEntries()).toEqual([
      { closing: false, id: 'sheet', node: 'sheet-again' },
      { closing: false, id: 'dialog', node: 'dialog' },
    ]);
  });
});
