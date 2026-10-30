import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';

afterEach(() => {
  cleanup();
});

const TABS = [
  { key: 'general', label: 'General', onClick: vi.fn(), zIndex: 1 },
  { key: 'account', label: 'Account', onClick: vi.fn(), zIndex: 2 },
];

function pointer(
  phase: 'pointerDown' | 'pointerMove' | 'pointerUp',
  target: Element,
  clientX: number
) {
  fireEvent[phase](target, {
    button: 0,
    buttons: phase === 'pointerUp' ? 0 : 1,
    clientX,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'mouse',
  });
}

describe('Tabs', () => {
  it('scrolls an overflowing row on drag and does not activate the tab', () => {
    const onGeneral = vi.fn();
    const onAccount = vi.fn();
    render(
      <Tabs
        selectedKey="general"
        tabData={[
          { key: 'general', label: 'General', onClick: onGeneral, zIndex: 1 },
          { key: 'account', label: 'Account', onClick: onAccount, zIndex: 2 },
        ]}
      />
    );

    const general = screen.getByRole('button', { name: 'General' });
    const scroller = general.parentElement;
    expect(scroller).not.toBeNull();
    if (scroller === null) {
      return;
    }
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 80 });
    Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 400 });
    let scrollLeft = 0;
    Object.defineProperty(scroller, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (next: number) => {
        scrollLeft = next;
      },
    });

    pointer('pointerDown', general, 90);
    pointer('pointerMove', general, 20);
    pointer('pointerUp', general, 20);
    fireEvent.click(general);

    expect(scrollLeft).toBe(70);
    expect(onGeneral).not.toHaveBeenCalled();
    expect(onAccount).not.toHaveBeenCalled();
  });

  it('still selects a tab on a short press', () => {
    const onAccount = vi.fn();
    const generalTab = TABS[0];
    const accountTab = TABS[1];
    if (generalTab === undefined || accountTab === undefined) {
      throw new Error('Tab fixtures are missing.');
    }
    render(
      <Tabs
        selectedKey="general"
        tabData={[
          { ...generalTab, onClick: vi.fn() },
          { ...accountTab, onClick: onAccount },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(onAccount).toHaveBeenCalledTimes(1);
  });
});
