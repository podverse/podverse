import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Dropdown } from './Dropdown';

const MENU_ITEMS = [
  { label: 'Recent', param: 'sort', value: 'recent' },
  { label: 'Top', param: 'sort', value: 'top' },
];

afterEach(() => {
  cleanup();
});

describe('Dropdown', () => {
  it('shows the selected option label on the trigger', () => {
    render(<Dropdown menuItems={MENU_ITEMS} value="top" onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Top' })).toBeTruthy();
  });

  it('opens the menu and calls onChange when another option is chosen', () => {
    const onChange = vi.fn();
    render(<Dropdown menuItems={MENU_ITEMS} value="recent" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Recent' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Top' }));

    expect(onChange).toHaveBeenCalledWith('top');
  });

  it('does not render a menu when there is only one option', () => {
    const single = [{ label: 'Only', param: 'x', value: 'only' }];
    render(<Dropdown menuItems={single} value="only" onChange={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Only' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
