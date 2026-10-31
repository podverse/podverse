import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SortChipRange } from './SortChip';
import { SortChip } from './SortChip';

type Sort = 'recent' | 'top' | 'a_z';
type Range = 'day' | 'week' | 'month';

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'top', label: 'Top' },
  { value: 'a_z', label: 'A-Z' },
];

const RANGE_OPTIONS: { value: Range; label: string; shortLabel?: string }[] = [
  { value: 'day', label: 'Past Day', shortLabel: 'Day' },
  { value: 'week', label: 'Past Week', shortLabel: 'Week' },
  { value: 'month', label: 'Past Month', shortLabel: 'Month' },
];

function rangeFor(value: Range | null): SortChipRange<Sort, Range> {
  return { sort: 'top', heading: 'Range', options: RANGE_OPTIONS, value };
}

afterEach(() => {
  cleanup();
});

describe('SortChip', () => {
  it('shows the current sort on the face and in the accessible name', () => {
    render(
      <SortChip
        heading="Sort"
        options={SORT_OPTIONS}
        value="recent"
        onChange={() => {}}
        range={rangeFor(null)}
        testId="sort"
      />
    );

    const button = screen.getByRole('button', { name: 'Sort: Recent' });
    expect(button.textContent).toBe('Recent');
    expect(button.getAttribute('data-testid')).toBe('sort-button');
  });

  it('calls onChange with a null range for a non-range sort', () => {
    const onChange = vi.fn();
    render(
      <SortChip
        heading="Sort"
        options={SORT_OPTIONS}
        value="recent"
        onChange={onChange}
        range={rangeFor(null)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sort: Recent' }));
    expect(screen.getByRole('menu', { name: 'Sort' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'A-Z' }));

    expect(onChange).toHaveBeenCalledWith('a_z', null);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('swaps to the range list when Top is chosen and reports the range', () => {
    const onChange = vi.fn();
    render(
      <SortChip
        heading="Sort"
        options={SORT_OPTIONS}
        value="recent"
        onChange={onChange}
        range={rangeFor(null)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sort: Recent' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Top' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('menu', { name: 'Range' })).toBeTruthy();

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Past Month' }));

    expect(onChange).toHaveBeenCalledWith('top', 'month');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows the sort label when the range sort has no range', () => {
    render(
      <SortChip
        heading="Sort"
        options={SORT_OPTIONS}
        value="top"
        onChange={() => {}}
        range={rangeFor(null)}
      />
    );

    const button = screen.getByRole('button', { name: 'Sort: Top' });
    expect(button.textContent).toBe('Top');
  });

  it('shows the range on the face and checks it while Top is selected', () => {
    render(
      <SortChip
        heading="Sort"
        options={SORT_OPTIONS}
        value="top"
        onChange={() => {}}
        range={rangeFor('week')}
      />
    );

    const button = screen.getByRole('button', { name: 'Sort: Week' });
    expect(button.textContent).toBe('Week');

    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Top' }));

    expect(
      screen.getByRole('menuitemradio', { name: 'Past Week' }).getAttribute('aria-checked')
    ).toBe('true');
    expect(
      screen.getByRole('menuitemradio', { name: 'Past Day' }).getAttribute('aria-checked')
    ).toBe('false');
  });

  it('closes on Escape from the sort chip after a click', () => {
    render(
      <SortChip
        heading="Sort"
        options={SORT_OPTIONS}
        value="recent"
        onChange={() => {}}
        range={rangeFor(null)}
      />
    );

    const button = screen.getByRole('button', { name: 'Sort: Recent' });
    fireEvent.click(button);
    expect(screen.getByRole('menu', { name: 'Sort' })).toBeTruthy();

    fireEvent.keyDown(button, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('closes on Escape at the range step and starts the next open at the sort list', () => {
    const onChange = vi.fn();
    render(
      <SortChip
        heading="Sort"
        options={SORT_OPTIONS}
        value="recent"
        onChange={onChange}
        range={rangeFor(null)}
      />
    );

    const button = screen.getByRole('button', { name: 'Sort: Recent' });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Top' }));
    fireEvent.keyDown(screen.getByRole('menu', { name: 'Range' }), { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(button);

    expect(screen.getByRole('menu', { name: 'Sort' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Recent' })).toBeTruthy();
  });

  it('opens straight to the range list when the only option is the range sort', () => {
    render(
      <SortChip
        heading="Sort"
        options={[{ value: 'top', label: 'Top' }]}
        value="top"
        onChange={() => {}}
        range={rangeFor('day')}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sort: Day' }));

    expect(screen.getByRole('menu', { name: 'Range' })).toBeTruthy();
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(RANGE_OPTIONS.length);
  });

  it('reaches the range list from the keyboard', () => {
    render(
      <SortChip
        heading="Sort"
        options={SORT_OPTIONS}
        value="recent"
        onChange={() => {}}
        range={rangeFor(null)}
      />
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Sort: Recent' }), { key: 'Enter' });
    const sortMenu = screen.getByRole('menu', { name: 'Sort' });
    fireEvent.keyDown(sortMenu, { key: 'ArrowDown' });
    fireEvent.keyDown(sortMenu, { key: 'Enter' });

    expect(screen.getByRole('menu', { name: 'Range' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Past Day' })).toBeTruthy();
  });
});
