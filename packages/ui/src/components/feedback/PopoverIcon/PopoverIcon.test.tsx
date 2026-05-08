import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PopoverIcon } from './PopoverIcon';

afterEach(() => {
  cleanup();
});

describe('PopoverIcon', () => {
  it('renders trigger with aria-label', () => {
    render(<PopoverIcon ariaLabel="Help for field" body="Details here" />);

    expect(screen.getByRole('button', { name: 'Help for field' })).toBeTruthy();
  });

  it('interaction click opens panel on trigger click', async () => {
    render(<PopoverIcon interaction="click" ariaLabel="Filter" body={<span>Column picks</span>} />);

    expect(screen.queryByText('Column picks')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    await waitFor(() => {
      expect(screen.getByText('Column picks')).toBeTruthy();
    });
  });

  it('interaction click closes on mousedown outside', async () => {
    render(
      <div>
        <PopoverIcon interaction="click" ariaLabel="Filter" body={<span>Column picks</span>} />
        <button type="button">Outside</button>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    await waitFor(() => {
      expect(screen.getByText('Column picks')).toBeTruthy();
    });

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => {
      expect(screen.queryByText('Column picks')).toBeNull();
    });
  });

  it('interaction click does not open on hover', () => {
    render(<PopoverIcon interaction="click" ariaLabel="Filter" body={<span>Column picks</span>} />);

    const wrapper = screen.getByRole('button', { name: 'Filter' }).parentElement;
    if (wrapper === null) {
      throw new Error('expected wrapper');
    }
    fireEvent.mouseEnter(wrapper);
    expect(screen.queryByText('Column picks')).toBeNull();
  });
});
