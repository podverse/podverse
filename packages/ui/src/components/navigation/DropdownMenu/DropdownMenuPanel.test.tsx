import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { DropdownMenuPanel } from './DropdownMenuPanel';

afterEach(() => {
  cleanup();
});

describe('DropdownMenuPanel', () => {
  it('renders menu items when open', () => {
    const menuRef = createRef<HTMLUListElement>();
    render(
      <DropdownMenuPanel
        focusedIndex={0}
        handleMenuKeyDown={() => {}}
        menuItems={[{ label: 'One', onClick: () => {} }]}
        menuRef={menuRef}
        open
        setFocusedIndex={() => {}}
        setOpen={() => {}}
      />
    );

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByText('One')).toBeTruthy();
  });
});
