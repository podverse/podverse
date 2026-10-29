import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HorizontalDragScroller } from './HorizontalDragScroller';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function trackScrollLeft(element: HTMLElement) {
  let value = 0;
  Object.defineProperty(element, 'scrollLeft', {
    configurable: true,
    get: () => value,
    set: (next: number) => {
      value = next;
    },
  });
  return {
    read: () => value,
  };
}

function setOverflow(element: HTMLElement, overflows: boolean) {
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    value: overflows ? 400 : 100,
  });
}

function pointer(
  phase: 'pointerDown' | 'pointerMove' | 'pointerUp',
  target: Element,
  clientX: number,
  pointerType: 'mouse' | 'touch'
) {
  fireEvent[phase](target, {
    button: 0,
    buttons: phase === 'pointerUp' ? 0 : 1,
    clientX,
    isPrimary: true,
    pointerId: 1,
    pointerType,
  });
}

function renderRow() {
  const onClick = vi.fn();
  render(
    <HorizontalDragScroller>
      <button type="button" onClick={onClick}>
        General
      </button>
    </HorizontalDragScroller>
  );
  const button = screen.getByRole('button', { name: 'General' });
  const scroller = button.parentElement;
  expect(scroller).not.toBeNull();
  if (scroller === null) {
    throw new Error('scroller missing');
  }
  return { button, onClick, scroller };
}

describe('HorizontalDragScroller', () => {
  it('scrolls on a mouse drag and does not activate the control under the pointer', () => {
    const { button, onClick, scroller } = renderRow();
    setOverflow(scroller, true);
    const scrollLeft = trackScrollLeft(scroller);

    pointer('pointerDown', button, 80, 'mouse');
    pointer('pointerMove', button, 20, 'mouse');
    pointer('pointerUp', button, 20, 'mouse');
    fireEvent.click(button);

    expect(scrollLeft.read()).toBe(60);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps a short mouse movement as a click', () => {
    const { button, onClick, scroller } = renderRow();
    setOverflow(scroller, true);
    const scrollLeft = trackScrollLeft(scroller);

    pointer('pointerDown', button, 80, 'mouse');
    pointer('pointerMove', button, 82, 'mouse');
    pointer('pointerUp', button, 82, 'mouse');
    fireEvent.click(button);

    expect(scrollLeft.read()).toBe(0);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not drag when the row fits', () => {
    const { button, onClick, scroller } = renderRow();
    setOverflow(scroller, false);
    const scrollLeft = trackScrollLeft(scroller);

    pointer('pointerDown', button, 80, 'mouse');
    pointer('pointerMove', button, 20, 'mouse');
    pointer('pointerUp', button, 20, 'mouse');
    fireEvent.click(button);

    expect(scrollLeft.read()).toBe(0);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('leaves touch scrolling to the browser and still activates on tap', () => {
    const { button, onClick, scroller } = renderRow();
    setOverflow(scroller, true);
    const scrollLeft = trackScrollLeft(scroller);

    pointer('pointerDown', button, 80, 'touch');
    pointer('pointerMove', button, 20, 'touch');
    pointer('pointerUp', button, 20, 'touch');
    fireEvent.click(button);

    expect(scrollLeft.read()).toBe(0);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
